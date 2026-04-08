import { db } from '@/lib/db'
import { emailAccounts, emails, persons } from '@/lib/db/schema'
import type { EmailAccount } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { EmailAccountService } from './email-account.service'
import type { ImapFlow, FetchMessageObject, MessageStructureObject } from 'imapflow'

interface ParsedMessage {
  messageId?: string
  uid: number
  subject?: string
  fromAddress?: string
  fromName?: string
  to: Array<{ address?: string; name?: string }>
  cc: Array<{ address?: string; name?: string }>
  date?: Date
  bodyText?: string
  bodyHtml?: string
  hasAttachments: boolean
  attachments: Array<{ filename?: string; size?: number; contentType?: string }>
}

export const EmailImapService = {
  /**
   * Sync a single email account: connect to IMAP, fetch new messages
   * since lastSyncAt, store in emails table, update lastSyncAt.
   */
  async syncAccount(accountId: string): Promise<{ synced: number; errors: number }> {
    const account = await EmailAccountService.getById(accountId)
    if (!account) {
      throw new Error(`Email account ${accountId} not found`)
    }

    if (!account.isActive || !account.syncEnabled) {
      logger.info('Skipping disabled account', { module: 'email-imap', accountId })
      return { synced: 0, errors: 0 }
    }

    let client: ImapFlow | null = null
    let synced = 0
    let errors = 0

    try {
      const imapflow = await import('imapflow')

      client = new imapflow.ImapFlow({
        host: account.imapHost,
        port: account.imapPort ?? 993,
        secure: account.imapTls ?? true,
        auth: {
          user: account.imapUser,
          pass: account.imapPassword,
        },
        logger: false,
      })

      await client.connect()

      const folder = account.syncFolder ?? 'INBOX'
      const lock = await client.getMailboxLock(folder)

      try {
        // Determine the search date: lastSyncAt or 30 days ago
        const sinceDate = account.lastSyncAt
          ? new Date(account.lastSyncAt)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        // Search for messages since the sync date
        const messageUids = await client.search({ since: sinceDate }, { uid: true })

        if (messageUids.length === 0) {
          logger.info('No new messages found', { module: 'email-imap', accountId, folder })
        } else {
          logger.info(`Found ${messageUids.length} messages to process`, {
            module: 'email-imap',
            accountId,
            folder,
          })

          for (const uid of messageUids) {
            try {
              const inserted = await this._processMessage(client, account, uid, folder)
              if (inserted) synced++
            } catch (err) {
              errors++
              logger.error(`Failed to process message UID ${uid}`, err, {
                module: 'email-imap',
                accountId,
              })
            }
          }
        }
      } finally {
        lock.release()
      }

      await client.logout()

      // Update lastSyncAt and clear error
      await db
        .update(emailAccounts)
        .set({
          lastSyncAt: new Date(),
          lastSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId))

      logger.info(`Sync completed: ${synced} synced, ${errors} errors`, {
        module: 'email-imap',
        accountId,
      })

      return { synced, errors }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Record sync error on the account
      await db
        .update(emailAccounts)
        .set({
          lastSyncError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId))

      logger.error('Sync failed', err, { module: 'email-imap', accountId })
      throw err
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {
          // Already disconnected, ignore
        }
      }
    }
  },

  /**
   * Sync all active accounts that have syncEnabled=true.
   */
  async syncAll(): Promise<{ results: Array<{ accountId: string; synced: number; errors: number; error?: string }> }> {
    const activeAccounts = await db
      .select()
      .from(emailAccounts)
      .where(
        and(
          eq(emailAccounts.isActive, true),
          eq(emailAccounts.syncEnabled, true),
        )
      )

    logger.info(`Starting sync for ${activeAccounts.length} accounts`, { module: 'email-imap' })

    const results: Array<{ accountId: string; synced: number; errors: number; error?: string }> = []

    for (const account of activeAccounts) {
      try {
        const result = await this.syncAccount(account.id)
        results.push({ accountId: account.id, ...result })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        results.push({ accountId: account.id, synced: 0, errors: 0, error: errorMessage })
      }
    }

    return { results }
  },

  /**
   * Fetch a single message by UID from a specific account.
   */
  async fetchMessage(accountId: string, uid: number): Promise<ParsedMessage | null> {
    const account = await EmailAccountService.getById(accountId)
    if (!account) {
      throw new Error(`Email account ${accountId} not found`)
    }

    let client: ImapFlow | null = null

    try {
      const imapflow = await import('imapflow')

      client = new imapflow.ImapFlow({
        host: account.imapHost,
        port: account.imapPort ?? 993,
        secure: account.imapTls ?? true,
        auth: {
          user: account.imapUser,
          pass: account.imapPassword,
        },
        logger: false,
      })

      await client.connect()

      const folder = account.syncFolder ?? 'INBOX'
      const lock = await client.getMailboxLock(folder)

      try {
        const message = await client.fetchOne(String(uid), {
          uid: true,
          envelope: true,
          source: true,
          bodyStructure: true,
        })

        if (!message) return null

        return this._parseImapMessage(message, uid)
      } finally {
        lock.release()
      }
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {
          // Already disconnected, ignore
        }
      }
    }
  },

  /**
   * Process a single message: check if it already exists, fetch, parse, store, and auto-link.
   * Returns true if a new email was inserted, false if it already existed.
   */
  async _processMessage(
    client: ImapFlow,
    account: EmailAccount,
    uid: number,
    folder: string,
  ): Promise<boolean> {
    // Fetch the message envelope and full source
    const message = await client.fetchOne(String(uid), {
      uid: true,
      envelope: true,
      source: true,
      bodyStructure: true,
    })

    if (!message) return false

    const parsed = this._parseImapMessage(message, uid)

    // Check if message already exists by messageId
    if (parsed.messageId) {
      const [existing] = await db
        .select({ id: emails.id })
        .from(emails)
        .where(
          and(
            eq(emails.accountId, account.id),
            eq(emails.messageId, parsed.messageId),
          )
        )
        .limit(1)

      if (existing) return false
    }

    // Also check by UID + accountId as fallback
    const [existingByUid] = await db
      .select({ id: emails.id })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, account.id),
          eq(emails.uid, uid),
        )
      )
      .limit(1)

    if (existingByUid) return false

    // Auto-link to person/company by matching fromAddress
    const { personId, companyId } = await this._autoLink(parsed.fromAddress ?? null)

    // Build a snippet from the body text
    const snippet = parsed.bodyText
      ? parsed.bodyText.replace(/\s+/g, ' ').trim().slice(0, 497) + (parsed.bodyText.length > 497 ? '...' : '')
      : null

    await db.insert(emails).values({
      accountId: account.id,
      messageId: parsed.messageId ?? null,
      uid,
      folder,
      subject: parsed.subject ?? null,
      fromAddress: parsed.fromAddress ?? null,
      fromName: parsed.fromName ?? null,
      toAddresses: parsed.to.map((a) => ({ address: a.address, name: a.name })),
      ccAddresses: parsed.cc.map((a) => ({ address: a.address, name: a.name })),
      bodyText: parsed.bodyText ?? null,
      bodyHtml: parsed.bodyHtml ?? null,
      snippet,
      date: parsed.date ?? null,
      isRead: false,
      hasAttachments: parsed.hasAttachments,
      attachments: parsed.attachments,
      headers: {},
      personId,
      companyId,
      direction: 'inbound',
    })

    return true
  },

  /**
   * Parse an IMAP message from imapflow's fetchOne result into our internal format.
   */
  _parseImapMessage(message: FetchMessageObject, uid: number): ParsedMessage {
    const envelope = message.envelope
    const bodyStructure = message.bodyStructure
    const source = message.source

    // Extract addresses from envelope
    const from = envelope?.from?.[0]
    const toList = envelope?.to ?? []
    const ccList = envelope?.cc ?? []

    // Parse body from source if available
    let bodyText: string | undefined
    let bodyHtml: string | undefined

    if (source) {
      const sourceStr = source.toString('utf-8')
      bodyText = this._extractTextBody(sourceStr)
      bodyHtml = this._extractHtmlBody(sourceStr)
    }

    // Detect attachments from bodyStructure
    const attachments = this._extractAttachments(bodyStructure)

    return {
      messageId: envelope?.messageId,
      uid,
      subject: envelope?.subject,
      fromAddress: from?.address,
      fromName: from?.name,
      to: toList.map((a) => ({ address: a.address, name: a.name })),
      cc: ccList.map((a) => ({ address: a.address, name: a.name })),
      date: envelope?.date,
      bodyText,
      bodyHtml,
      hasAttachments: attachments.length > 0,
      attachments,
    }
  },

  /**
   * Extract plain text body from raw email source (simple extraction).
   */
  _extractTextBody(source: string): string | undefined {
    // Try to find text/plain content in a MIME message
    const textMatch = source.match(
      /Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i
    )
    if (textMatch?.[1]) {
      return textMatch[1].trim()
    }

    // For non-MIME messages, strip headers and return body
    const headerEnd = source.indexOf('\r\n\r\n')
    if (headerEnd !== -1) {
      return source.slice(headerEnd + 4).trim()
    }

    return undefined
  },

  /**
   * Extract HTML body from raw email source (simple extraction).
   */
  _extractHtmlBody(source: string): string | undefined {
    const htmlMatch = source.match(
      /Content-Type:\s*text\/html[^]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i
    )
    return htmlMatch?.[1]?.trim()
  },

  /**
   * Extract attachment metadata from IMAP bodyStructure.
   */
  _extractAttachments(
    bodyStructure: MessageStructureObject | undefined,
  ): Array<{ filename?: string; size?: number; contentType?: string }> {
    if (!bodyStructure) return []

    const attachments: Array<{ filename?: string; size?: number; contentType?: string }> = []

    const walk = (part: MessageStructureObject) => {
      if (part.disposition === 'attachment' || part.disposition === 'inline') {
        const params = part.dispositionParameters ?? part.parameters ?? {}
        attachments.push({
          filename: params.filename ?? params.name ?? undefined,
          size: part.size,
          contentType: part.type,
        })
      }

      if (part.childNodes && Array.isArray(part.childNodes)) {
        for (const child of part.childNodes) {
          walk(child)
        }
      }
    }

    walk(bodyStructure)
    return attachments
  },

  /**
   * Auto-link an email address to a person and their company.
   */
  async _autoLink(
    fromAddress: string | null,
  ): Promise<{ personId: string | null; companyId: string | null }> {
    if (!fromAddress) return { personId: null, companyId: null }

    try {
      const [person] = await db
        .select({
          id: persons.id,
          companyId: persons.companyId,
        })
        .from(persons)
        .where(eq(persons.email, fromAddress.toLowerCase()))
        .limit(1)

      if (person) {
        return {
          personId: person.id,
          companyId: person.companyId ?? null,
        }
      }
    } catch (err) {
      logger.warn('Auto-link lookup failed', { module: 'email-imap', fromAddress })
    }

    return { personId: null, companyId: null }
  },
}

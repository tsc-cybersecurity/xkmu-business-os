import { db } from '@/lib/db'
import { emailAccounts } from '@/lib/db/schema'
import type { EmailAccount, NewEmailAccount } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import type { ImapFlow } from 'imapflow'

export type CreateEmailAccountInput = Omit<NewEmailAccount, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateEmailAccountInput = Partial<Omit<NewEmailAccount, 'id' | 'createdAt' | 'updatedAt'>>

export const EmailAccountService = {
  async list(): Promise<EmailAccount[]> {
    return db
      .select()
      .from(emailAccounts)
      .orderBy(asc(emailAccounts.createdAt))
  },

  async getById(id: string): Promise<EmailAccount | null> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, id))
      .limit(1)

    return account ?? null
  },

  async create(data: CreateEmailAccountInput): Promise<EmailAccount> {
    const [account] = await db
      .insert(emailAccounts)
      .values(data)
      .returning()

    logger.info('Email account created', { module: 'email-account', accountId: account.id })
    return account
  },

  async update(id: string, data: UpdateEmailAccountInput): Promise<EmailAccount | null> {
    const [account] = await db
      .update(emailAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailAccounts.id, id))
      .returning()

    if (!account) return null

    logger.info('Email account updated', { module: 'email-account', accountId: id })
    return account
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(emailAccounts)
      .where(eq(emailAccounts.id, id))
      .returning({ id: emailAccounts.id })

    if (result.length === 0) return false

    logger.info('Email account deleted', { module: 'email-account', accountId: id })
    return true
  },

  async testConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const account = await this.getById(id)
    if (!account) {
      return { success: false, error: 'Account not found' }
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
      await client.logout()

      // Clear any previous sync error on successful connection
      await db
        .update(emailAccounts)
        .set({ lastSyncError: null, updatedAt: new Date() })
        .where(eq(emailAccounts.id, id))

      logger.info('IMAP connection test successful', { module: 'email-account', accountId: id })
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      await db
        .update(emailAccounts)
        .set({ lastSyncError: errorMessage, updatedAt: new Date() })
        .where(eq(emailAccounts.id, id))

      logger.error('IMAP connection test failed', err, { module: 'email-account', accountId: id })
      return { success: false, error: errorMessage }
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
}

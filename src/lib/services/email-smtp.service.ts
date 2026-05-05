import { db } from '@/lib/db'
import { emailAccounts, emails } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

interface SendEmailInput {
  accountId: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  inReplyTo?: string
  references?: string[]
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export const EmailSmtpService = {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references } = input

    // 1. Load account from DB
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))

    if (!account) {
      return { success: false, error: `Email account ${accountId} not found` }
    }

    // 2. Check smtpHost is configured
    if (!account.smtpHost) {
      return { success: false, error: `SMTP is not configured for account "${account.name}"` }
    }

    try {
      // 3. Create nodemailer transport (dynamic import)
      const nodemailer = await import('nodemailer')

      const smtpPort = account.smtpPort ?? 587
      const transport = nodemailer.createTransport({
        host: account.smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: account.smtpUser || account.imapUser,
          pass: account.smtpPassword || account.imapPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })

      // 4. Build and send the message
      const from = `"${account.name}" <${account.email}>`

      const mailOptions: Record<string, unknown> = {
        from,
        to: to.join(', '),
        subject,
        html: bodyHtml,
        headers: {
          'X-Mailer': 'xKMU BusinessOS',
        },
      }

      if (bodyText) {
        mailOptions.text = bodyText
      }
      if (cc && cc.length > 0) {
        mailOptions.cc = cc.join(', ')
      }
      if (bcc && bcc.length > 0) {
        mailOptions.bcc = bcc.join(', ')
      }
      if (inReplyTo) {
        mailOptions.inReplyTo = inReplyTo
      }
      if (references && references.length > 0) {
        mailOptions.references = references.join(' ')
      }
      if (input.attachments && input.attachments.length > 0) {
        mailOptions.attachments = input.attachments
      }

      const info = await transport.sendMail(mailOptions)

      logger.info('Email sent successfully', {
        module: 'email-smtp',
        accountId,
        messageId: info.messageId,
        to,
      })

      // 5. Store sent email in DB with direction='outbound'
      const snippet = bodyText
        ? bodyText.substring(0, 500)
        : bodyHtml.replace(/<[^>]*>/g, '').substring(0, 500)

      await db.insert(emails).values({
        accountId,
        messageId: info.messageId,
        folder: 'Sent',
        subject,
        fromAddress: account.email,
        fromName: account.name,
        toAddresses: to.map((addr) => ({ address: addr })),
        ccAddresses: cc ? cc.map((addr) => ({ address: addr })) : [],
        bccAddresses: bcc ? bcc.map((addr) => ({ address: addr })) : [],
        bodyHtml,
        bodyText: bodyText ?? null,
        snippet,
        date: new Date(),
        isRead: true,
        direction: 'outbound',
        headers: {
          inReplyTo: inReplyTo ?? null,
          references: references ?? null,
        },
      })

      // 6. Return success
      return { success: true, messageId: info.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMTP error'
      logger.error('Failed to send email via SMTP', error, {
        module: 'email-smtp',
        accountId,
        to,
      })
      return { success: false, error: message }
    }
  },
}

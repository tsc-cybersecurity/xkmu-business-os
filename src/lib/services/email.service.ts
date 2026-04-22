import { db } from '@/lib/db'
import { activities, emailAccounts } from '@/lib/db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'
import nodemailer from 'nodemailer'
import { logger } from '@/lib/utils/logger'

export interface EmailConfig {
  provider: 'smtp' | 'gmail'
  host?: string
  port?: number
  secure?: boolean
  user: string
  password: string // App password for Gmail
}

export interface SendEmailInput {
  to: string
  subject: string
  body: string
  html?: string
  cc?: string
  leadId?: string
  companyId?: string
  personId?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * E-Mail Service
 * Supports SMTP and Gmail (via SMTP with app password)
 */
export const EmailService = {
  /**
   * Get email config from environment or organization settings
   */
  getConfig(): EmailConfig | null {
    // Check environment variables
    const provider = process.env.EMAIL_PROVIDER as 'smtp' | 'gmail' || 'gmail'
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER
    const password = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD

    if (!user || !password) {
      return null
    }

    if (provider === 'gmail') {
      return {
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user,
        password,
      }
    }

    return {
      provider: 'smtp',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user,
      password,
    }
  },

  /**
   * Create nodemailer transporter
   */
  createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
  },

  /**
   * Pick a default SMTP-capable email account from the DB.
   * Prefers the first active account with smtpHost configured.
   */
  async getDefaultAccount() {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.isActive, true), isNotNull(emailAccounts.smtpHost)))
      .orderBy(emailAccounts.createdAt)
      .limit(1)
    return account ?? null
  },

  /**
   * Resolve the special "__ADMIN__" recipient to a real address.
   * Preference order:
   *   1. First active admin user's email (users table, role with admin slug)
   *   2. ADMIN_EMAIL env var
   *   3. SEED_ADMIN_EMAIL env var
   *   4. The default email_account's own address (we send to ourselves)
   */
  async resolveAdminRecipient(): Promise<string | null> {
    // 1. Direct varchar role
    try {
      const { users } = await import('@/lib/db/schema')
      const [row] = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.status, 'active'), eq(users.role, 'admin')))
        .limit(1)
      if (row?.email) return row.email
    } catch {
      // fall through
    }
    // 2. Role via roleId → roles.name='admin' (case-insensitive)
    try {
      const { users, roles } = await import('@/lib/db/schema')
      const { sql } = await import('drizzle-orm')
      const [row] = await db
        .select({ email: users.email })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(
          eq(users.status, 'active'),
          sql`lower(${roles.name}) IN ('admin', 'administrator')`
        ))
        .limit(1)
      if (row?.email) return row.email
    } catch {
      // fall through
    }
    // 3. Fallback to env vars
    if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL
    if (process.env.SEED_ADMIN_EMAIL) return process.env.SEED_ADMIN_EMAIL
    // 4. Last resort: send to ourselves (default email account)
    const account = await this.getDefaultAccount()
    if (account?.email) {
      logger.warn(`__ADMIN__ resolved to sending account ${account.email} (no admin user + no env var)`, { module: 'EmailService' })
      return account.email
    }
    logger.error('__ADMIN__ cannot be resolved: no active admin user, no ADMIN_EMAIL env, no default account', undefined, { module: 'EmailService' })
    return null
  },

  /**
   * Send email.
   * Primary path: use a configured email_account (SMTP settings from DB).
   * Fallback: env-based nodemailer (legacy EMAIL_USER/EMAIL_PASSWORD).
   * Special recipient "__ADMIN__" is resolved to the admin user's email.
   */
  async send(input: SendEmailInput,
    userId?: string | null
  ): Promise<SendEmailResult> {
    // Resolve __ADMIN__ sentinel
    if (input.to === '__ADMIN__') {
      const resolved = await this.resolveAdminRecipient()
      if (!resolved) {
        return { success: false, error: 'Kein Admin-Empfänger auflösbar (kein aktiver Admin-User, ADMIN_EMAIL nicht gesetzt)' }
      }
      input = { ...input, to: resolved }
    }
    // Primary: DB-backed account via EmailSmtpService (multi-account, encrypted creds, logs to emails table)
    const account = await this.getDefaultAccount()
    if (account) {
      const { EmailSmtpService } = await import('./email-smtp.service')
      const html = input.html || input.body.replace(/\n/g, '<br>')
      const result = await EmailSmtpService.send({
        accountId: account.id,
        to: [input.to],
        cc: input.cc ? [input.cc] : undefined,
        subject: input.subject,
        bodyHtml: html,
        bodyText: input.body,
      })

      if (result.success) {
        // Keep CRM activity log in sync (EmailSmtpService only logs to emails table)
        try {
          await db.insert(activities).values({
            leadId: input.leadId || undefined,
            companyId: input.companyId || undefined,
            personId: input.personId || undefined,
            type: 'email',
            subject: input.subject,
            content: `An: ${input.to}\n\n${input.body}`,
            metadata: {
              messageId: result.messageId,
              to: input.to,
              sentVia: 'email_account',
              accountId: account.id,
            },
            userId: userId || undefined,
          })
        } catch (logErr) {
          logger.warn('Failed to log email activity', { module: 'EmailService', err: logErr })
        }
      }
      return result
    }

    // Fallback: legacy env-based nodemailer
    const config = this.getConfig()
    if (!config) {
      return {
        success: false,
        error: 'E-Mail nicht konfiguriert. Kein aktives E-Mail-Konto mit SMTP gefunden und keine ENV-Credentials gesetzt.',
      }
    }

    try {
      const transporter = this.createTransporter(config)
      const info = await transporter.sendMail({
        from: config.user,
        to: input.to,
        cc: input.cc || undefined,
        subject: input.subject,
        text: input.body,
        html: input.html || input.body.replace(/\n/g, '<br>'),
        attachments: input.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })

      await db.insert(activities).values({
        leadId: input.leadId || undefined,
        companyId: input.companyId || undefined,
        personId: input.personId || undefined,
        type: 'email',
        subject: input.subject,
        content: `An: ${input.to}\n\n${input.body}`,
        metadata: {
          messageId: info.messageId,
          to: input.to,
          sentVia: config.provider,
        },
        userId: userId || undefined,
      })

      return { success: true, messageId: info.messageId }
    } catch (error) {
      logger.error('Email send error', error, { module: 'EmailService' })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen',
      }
    }
  },

  /**
   * Check if email is configured — either a DB account or env fallback.
   */
  async isConfigured(): Promise<boolean> {
    const account = await this.getDefaultAccount()
    if (account) return true
    return this.getConfig() !== null
  },

  /**
   * Send email using a template
   */
  async sendWithTemplate(templateSlug: string,
    to: string,
    placeholders: Record<string, string>,
    options?: {
      cc?: string
      attachments?: SendEmailInput['attachments']
      leadId?: string
      companyId?: string
      personId?: string
    },
    userId?: string | null
  ): Promise<SendEmailResult> {
    const { EmailTemplateService } = await import('./email-template.service')
    const template = await EmailTemplateService.getBySlug(templateSlug)
    if (!template) {
      return { success: false, error: `E-Mail-Template '${templateSlug}' nicht gefunden` }
    }

    const subject = EmailTemplateService.applyPlaceholders(template.subject, placeholders)
    const html = EmailTemplateService.applyPlaceholders(template.bodyHtml, placeholders)
    const body = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    return this.send({
      to,
      subject,
      body,
      html,
      cc: options?.cc,
      attachments: options?.attachments,
      leadId: options?.leadId,
      companyId: options?.companyId,
      personId: options?.personId,
    }, userId)
  },

  /**
   * Verify email configuration
   */
  async verifyConfig(): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig()

    if (!config) {
      return {
        success: false,
        error: 'E-Mail nicht konfiguriert',
      }
    }

    try {
      const transporter = this.createTransporter(config)
      await transporter.verify()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verbindungsfehler',
      }
    }
  },
}

import { db } from '@/lib/db'
import { activities } from '@/lib/db/schema'
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
  leadId?: string
  companyId?: string
  personId?: string
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
   * Get email config from environment or tenant settings
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
   * Send email
   */
  async send(
    tenantId: string,
    input: SendEmailInput,
    userId?: string | null
  ): Promise<SendEmailResult> {
    const config = this.getConfig()

    if (!config) {
      return {
        success: false,
        error: 'E-Mail nicht konfiguriert. Bitte EMAIL_USER und EMAIL_PASSWORD in .env setzen.',
      }
    }

    try {
      const transporter = this.createTransporter(config)

      // Send email
      const info = await transporter.sendMail({
        from: config.user,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: input.html || input.body.replace(/\n/g, '<br>'),
      })

      // Log activity
      await db.insert(activities).values({
        tenantId,
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

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      logger.error('Email send error', error, { module: 'EmailService' })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen',
      }
    }
  },

  /**
   * Check if email is configured
   */
  isConfigured(): boolean {
    return this.getConfig() !== null
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

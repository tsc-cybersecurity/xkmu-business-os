import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}))

// Mock logger to suppress output
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

const sendMailMock = vi.fn()
const verifyMock = vi.fn()

function makeTransporter() {
  return {
    sendMail: sendMailMock,
    verify: verifyMock,
  }
}

describe('EmailService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    sendMailMock.mockReset()
    verifyMock.mockReset()
  })

  afterEach(() => {
    // Clean up env vars
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASSWORD
    delete process.env.EMAIL_PROVIDER
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE
  })

  async function getService() {
    const mod = await import('@/lib/services/email.service')
    return mod.EmailService
  }

  async function getNodemailer() {
    const mod = await import('nodemailer')
    return mod.default
  }

  // ---- getConfig ----

  describe('getConfig', () => {
    it('returns null when EMAIL_USER is missing', async () => {
      const service = await getService()
      const result = service.getConfig()
      expect(result).toBeNull()
    })

    it('returns gmail config when provider is gmail', async () => {
      process.env.EMAIL_USER = 'test@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const service = await getService()
      const result = service.getConfig()

      expect(result).not.toBeNull()
      expect(result?.provider).toBe('gmail')
      expect(result?.host).toBe('smtp.gmail.com')
      expect(result?.port).toBe(587)
      expect(result?.user).toBe('test@gmail.com')
    })

    it('returns smtp config when provider is smtp', async () => {
      process.env.EMAIL_USER = 'test@company.com'
      process.env.EMAIL_PASSWORD = 'secret'
      process.env.EMAIL_PROVIDER = 'smtp'
      process.env.SMTP_HOST = 'mail.company.com'
      process.env.SMTP_PORT = '465'
      process.env.SMTP_SECURE = 'true'

      const service = await getService()
      const result = service.getConfig()

      expect(result).not.toBeNull()
      expect(result?.provider).toBe('smtp')
      expect(result?.host).toBe('mail.company.com')
      expect(result?.port).toBe(465)
      expect(result?.secure).toBe(true)
    })
  })

  // ---- isConfigured ----

  describe('isConfigured', () => {
    it('returns false when no config', async () => {
      const service = await getService()
      const result = await service.isConfigured()
      expect(result).toBe(false)
    })

    it('returns true when config present', async () => {
      process.env.EMAIL_USER = 'test@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'

      const service = await getService()
      const result = await service.isConfigured()
      expect(result).toBe(true)
    })
  })

  // ---- send ----

  describe('send', () => {
    it('returns error result when not configured', async () => {
      const service = await getService()
      const result = await service.send({
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('EMAIL_USER')
    })

    it('calls transporter.sendMail and returns success with messageId', async () => {
      process.env.EMAIL_USER = 'sender@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const nodemailer = await getNodemailer()
      vi.mocked(nodemailer.createTransport).mockReturnValue(makeTransporter() as unknown as ReturnType<typeof nodemailer.createTransport>)
      sendMailMock.mockResolvedValue({ messageId: 'msg-123' })
      dbMock.mockInsert.mockResolvedValue([{}])

      const service = await getService()
      const result = await service.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Hello World',
      }, TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Subject',
        })
      )
    })

    it('logs activity to DB after successful send', async () => {
      process.env.EMAIL_USER = 'sender@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const nodemailer = await getNodemailer()
      vi.mocked(nodemailer.createTransport).mockReturnValue(makeTransporter() as unknown as ReturnType<typeof nodemailer.createTransport>)
      sendMailMock.mockResolvedValue({ messageId: 'msg-456' })
      dbMock.mockInsert.mockResolvedValue([{}])

      const service = await getService()
      await service.send({
        to: 'recipient@example.com',
        subject: 'Log Test',
        body: 'Test body',
      })

      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('returns error result when sendMail throws', async () => {
      process.env.EMAIL_USER = 'sender@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const nodemailer = await getNodemailer()
      vi.mocked(nodemailer.createTransport).mockReturnValue(makeTransporter() as unknown as ReturnType<typeof nodemailer.createTransport>)
      sendMailMock.mockRejectedValue(new Error('SMTP connection refused'))

      const service = await getService()
      const result = await service.send({
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('SMTP connection refused')
    })
  })

  // ---- verifyConfig ----

  describe('verifyConfig', () => {
    it('returns success when transporter.verify() resolves', async () => {
      process.env.EMAIL_USER = 'sender@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const nodemailer = await getNodemailer()
      vi.mocked(nodemailer.createTransport).mockReturnValue(makeTransporter() as unknown as ReturnType<typeof nodemailer.createTransport>)
      verifyMock.mockResolvedValue(true)

      const service = await getService()
      const result = await service.verifyConfig()

      expect(result.success).toBe(true)
    })

    it('returns error when transporter.verify() rejects', async () => {
      process.env.EMAIL_USER = 'sender@gmail.com'
      process.env.EMAIL_PASSWORD = 'app-password'
      process.env.EMAIL_PROVIDER = 'gmail'

      const nodemailer = await getNodemailer()
      vi.mocked(nodemailer.createTransport).mockReturnValue(makeTransporter() as unknown as ReturnType<typeof nodemailer.createTransport>)
      verifyMock.mockRejectedValue(new Error('Connection failed'))

      const service = await getService()
      const result = await service.verifyConfig()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection failed')
    })
  })
})

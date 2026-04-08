import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { EmailSmtpService } from '@/lib/services/email-smtp.service'

// POST /api/v1/emails/send - Send an email via SMTP
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async () => {
    try {
      const body = await request.json()

      // Validate required fields
      const validationErrors: Array<{ field: string; message: string }> = []

      if (!body.accountId || typeof body.accountId !== 'string') {
        validationErrors.push({ field: 'accountId', message: 'accountId is required' })
      }
      if (!Array.isArray(body.to) || body.to.length === 0) {
        validationErrors.push({ field: 'to', message: 'to must be a non-empty array of email addresses' })
      }
      if (!body.subject || typeof body.subject !== 'string') {
        validationErrors.push({ field: 'subject', message: 'subject is required' })
      }
      if (!body.bodyHtml || typeof body.bodyHtml !== 'string') {
        validationErrors.push({ field: 'bodyHtml', message: 'bodyHtml is required' })
      }

      if (validationErrors.length > 0) {
        return apiValidationError(validationErrors)
      }

      const result = await EmailSmtpService.send({
        accountId: body.accountId,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        inReplyTo: body.inReplyTo,
        references: body.references,
      })

      if (!result.success) {
        return apiError('SEND_FAILED', result.error || 'Failed to send email', 500)
      }

      return apiSuccess({ messageId: result.messageId }, undefined, 201)
    } catch (error) {
      logger.error('Failed to send email', error, { module: 'EmailSendAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to send email', 500)
    }
  })
}

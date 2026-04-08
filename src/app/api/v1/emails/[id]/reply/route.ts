import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { emails } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { EmailSmtpService } from '@/lib/services/email-smtp.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/emails/[id]/reply - Reply to an email
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'create', async () => {
    const { id } = await params

    try {
      const body = await request.json()

      // Validate required fields
      const validationErrors: Array<{ field: string; message: string }> = []

      if (!body.bodyHtml || typeof body.bodyHtml !== 'string') {
        validationErrors.push({ field: 'bodyHtml', message: 'bodyHtml is required' })
      }

      if (validationErrors.length > 0) {
        return apiValidationError(validationErrors)
      }

      // 1. Load original email
      const [originalEmail] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, id))

      if (!originalEmail) {
        return apiNotFound('Original email not found')
      }

      // 2. Determine accountId
      const accountId = body.accountId || originalEmail.accountId

      // 3. Build reply recipients
      const replyTo: string[] = []
      if (originalEmail.fromAddress) {
        replyTo.push(originalEmail.fromAddress)
      }

      if (body.replyAll) {
        // Add all original to/cc recipients (excluding our own account's address)
        const toAddresses = originalEmail.toAddresses as Array<{ address?: string; name?: string }> | null
        const ccAddresses = originalEmail.ccAddresses as Array<{ address?: string; name?: string }> | null

        if (toAddresses && Array.isArray(toAddresses)) {
          for (const recipient of toAddresses) {
            if (recipient.address && !replyTo.includes(recipient.address)) {
              replyTo.push(recipient.address)
            }
          }
        }
        if (ccAddresses && Array.isArray(ccAddresses)) {
          for (const recipient of ccAddresses) {
            if (recipient.address && !replyTo.includes(recipient.address)) {
              replyTo.push(recipient.address)
            }
          }
        }
      }

      if (replyTo.length === 0) {
        return apiError('SEND_FAILED', 'Cannot determine reply recipient: original email has no from address', 400)
      }

      // 4. Build subject with Re: prefix
      let replySubject = originalEmail.subject || ''
      if (replySubject && !/^Re:/i.test(replySubject)) {
        replySubject = `Re: ${replySubject}`
      }

      // 5. Build threading headers
      const inReplyTo = originalEmail.messageId || undefined
      const references = originalEmail.messageId ? [originalEmail.messageId] : undefined

      // 6. Send via SMTP
      const result = await EmailSmtpService.send({
        accountId,
        to: replyTo,
        subject: replySubject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        inReplyTo,
        references,
      })

      if (!result.success) {
        return apiError('SEND_FAILED', result.error || 'Failed to send reply', 500)
      }

      return apiSuccess({ messageId: result.messageId }, undefined, 201)
    } catch (error) {
      logger.error('Failed to send reply', error, { module: 'EmailReplyAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to send reply', 500)
    }
  })
}

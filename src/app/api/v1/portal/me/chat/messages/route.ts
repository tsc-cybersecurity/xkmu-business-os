import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const sinceParam = searchParams.get('since')
      const since = sinceParam ? new Date(sinceParam) : undefined
      // Guard invalid date → just ignore since param
      const effectiveSince = since && !isNaN(since.getTime()) ? since : undefined

      const rows = await PortalChatService.listForCompany(auth.companyId, effectiveSince, 100)
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list portal chat messages', error, { module: 'PortalChatAPI' })
      return apiError('LIST_FAILED', 'Nachrichten konnten nicht geladen werden', 500)
    }
  })
}

const sendSchema = z.object({
  bodyText: z.string().min(1, 'Nachricht darf nicht leer sein').max(5000),
}).strict()

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'portal-chat-send', 30, 60_000)
  if (limited) return limited

  return withPortalAuth(request, async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(sendSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const { bodyText } = validation.data

      const msg = await PortalChatService.createMessage({
        companyId: auth.companyId,
        senderId: auth.userId,
        senderRole: 'portal_user',
        bodyText,
      })

      // Audit (fail-safe, no bodyText in payload)
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: 'portal_user',
          action: 'portal.chat_message_sent',
          entityType: 'chat_message',
          entityId: msg.id,
          payload: {
            companyId: auth.companyId,
            messageId: msg.id,
            characterCount: bodyText.length,
          },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for chat_message_sent', err, { module: 'PortalChatAPI' })
      }

      return apiSuccess(msg, undefined, 201)
    } catch (error) {
      logger.error('Failed to send portal chat message', error, { module: 'PortalChatAPI' })
      return apiError('SEND_FAILED', 'Nachricht konnte nicht gesendet werden', 500)
    }
  })
}

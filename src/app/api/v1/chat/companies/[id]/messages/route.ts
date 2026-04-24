import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'read', async () => {
    const { id: companyId } = await params
    try {
      const { searchParams } = new URL(request.url)
      const sinceParam = searchParams.get('since')
      const since = sinceParam ? new Date(sinceParam) : undefined
      const effectiveSince = since && !isNaN(since.getTime()) ? since : undefined

      const rows = await PortalChatService.listForCompany(companyId, effectiveSince, 200)
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list admin chat messages', error, { module: 'AdminChatAPI' })
      return apiError('LIST_FAILED', 'Nachrichten konnten nicht geladen werden', 500)
    }
  })
}

const sendSchema = z.object({
  bodyText: z.string().min(1, 'Nachricht darf nicht leer sein').max(5000),
}).strict()

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const limited = await rateLimit(request, 'admin-chat-send', 60, 60_000)
  if (limited) return limited

  return withPermission(request, 'users', 'update', async (auth) => {
    const { id: companyId } = await params

    if (!auth.userId) {
      return apiError('FORBIDDEN', 'API-Key darf keine Chat-Nachrichten senden', 403)
    }

    try {
      const body = await request.json()
      const validation = validateAndParse(sendSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const { bodyText } = validation.data

      const msg = await PortalChatService.createMessage({
        companyId,
        senderId: auth.userId,
        senderRole: auth.role,
        bodyText,
      })

      // Audit
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: auth.role,
          action: 'admin.chat_message_sent',
          entityType: 'chat_message',
          entityId: msg.id,
          payload: {
            companyId,
            messageId: msg.id,
            characterCount: bodyText.length,
          },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for admin chat_message_sent', err, { module: 'AdminChatAPI' })
      }

      return apiSuccess(msg, undefined, 201)
    } catch (error) {
      logger.error('Failed to send admin chat message', error, { module: 'AdminChatAPI' })
      return apiError('SEND_FAILED', 'Nachricht konnte nicht gesendet werden', 500)
    }
  })
}

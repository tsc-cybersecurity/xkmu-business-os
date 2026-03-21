import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { EmailService } from '@/lib/services/email.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  html: z.string().optional(),
  leadId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
})

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

// POST /api/v1/email/send - Send an email
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const body = await request.json()
    const parseResult = sendEmailSchema.safeParse(body)

    if (!parseResult.success) {
      return apiValidationError(
        parseResult.error.issues.map(i => ({
          field: i.path.join('.') || 'input',
          message: i.message,
        }))
      )
    }

    const { to, subject, body: emailBody, html, leadId, companyId, personId } = parseResult.data

    // Check if email is configured
    if (!EmailService.isConfigured()) {
      return apiError(
        'EMAIL_NOT_CONFIGURED',
        'E-Mail-Versand ist nicht konfiguriert. Bitte verwenden Sie "In Gmail öffnen" oder "Im E-Mail-Client öffnen".',
        400
      )
    }

    // Send email
    const result = await EmailService.send(
      auth.tenantId,
      {
        to,
        subject,
        body: emailBody,
        html,
        leadId,
        companyId,
        personId,
      },
      auth.userId
    )

    if (result.success) {
      return apiSuccess({
        message: 'E-Mail erfolgreich gesendet',
        messageId: result.messageId,
      })
    } else {
      return apiError('EMAIL_SEND_FAILED', result.error || 'E-Mail-Versand fehlgeschlagen', 500)
    }
  } catch (error) {
    logger.error('Email send route error', error, { module: 'EmailSendAPI' })
    return apiError('INTERNAL_ERROR', 'Interner Serverfehler', 500)
  }
}

// GET /api/v1/email/send - Check email configuration status
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const isConfigured = EmailService.isConfigured()

  if (isConfigured) {
    const verification = await EmailService.verifyConfig()
    return apiSuccess({
      configured: true,
      verified: verification.success,
      error: verification.error,
    })
  }

  return apiSuccess({
    configured: false,
    verified: false,
    message: 'E-Mail-Versand nicht konfiguriert. Setzen Sie EMAIL_USER und EMAIL_PASSWORD in .env',
  })
}

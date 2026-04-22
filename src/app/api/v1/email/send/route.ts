import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { EmailService } from '@/lib/services/email.service'
import { withPermission } from '@/lib/auth/require-permission'
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

// POST /api/v1/email/send - Send an email
export async function POST(request: NextRequest) {
  return withPermission(request, 'activities', 'create', async (auth) => {
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
    if (!(await EmailService.isConfigured())) {
      return apiError(
        'EMAIL_NOT_CONFIGURED',
        'E-Mail-Versand ist nicht konfiguriert. Bitte verwenden Sie "In Gmail öffnen" oder "Im E-Mail-Client öffnen".',
        400
      )
    }

    // Send email
    const result = await EmailService.send({
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
  })
}

// GET /api/v1/email/send - Check email configuration status
export async function GET(request: NextRequest) {
  return withPermission(request, 'activities', 'create', async (auth) => {
  const isConfigured = await EmailService.isConfigured()

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
  })
}

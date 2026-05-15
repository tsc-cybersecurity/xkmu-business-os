import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { timingSafeEqual } from 'crypto'
import { VoiceCallService } from '@/lib/services/voice-call.service'
import { logger } from '@/lib/utils/logger'

// ──────────────────────────────────────────────────────────────
// Webhook-Empfaenger fuer voice.xkmu.de → Call-Ende.
//
// Auth: Bearer-Token aus env VOICE_WEBHOOK_SECRET. Vergleich
// timing-safe gegen Side-Channel-Attacks.
//
// Idempotent: Re-Post derselben room_name aktualisiert die Zeile
// und ersetzt die Messages.
// ──────────────────────────────────────────────────────────────

const transcriptItemSchema = z.object({
  ts: z.string().or(z.date()),
  role: z.string().min(1).max(20),
  text: z.string().min(1).max(50000),
})

const webhookSchema = z.object({
  roomName: z.string().min(1).max(200),
  agentKey: z.string().min(1).max(50),
  direction: z.enum(['outbound', 'inbound']).optional(),
  phone: z.string().max(30).nullable().optional(),
  callerName: z.string().max(200).nullable().optional(),
  contextText: z.string().max(5000).nullable().optional(),
  startedAt: z.string().or(z.date()),
  endedAt: z.string().or(z.date()).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  status: z.string().max(30).optional(),
  summary: z.string().max(10000).nullable().optional(),
  recordingUrl: z.string().url().max(2000).nullable().optional(),
  twilioCallSid: z.string().max(100).nullable().optional(),
  transcript: z.array(transcriptItemSchema).max(2000).optional(),
})

function isValidBearer(authHeader: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET
  if (!secret || secret.length < 16) return false
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const presented = authHeader.slice('Bearer '.length).trim()
  if (presented.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(presented), Buffer.from(secret))
}

export async function POST(request: NextRequest) {
  if (!isValidBearer(request.headers.get('authorization'))) {
    return apiError('UNAUTHORIZED', 'Bearer-Token fehlt oder ungueltig.', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Body ist kein gueltiges JSON.', 400)
  }

  const validation = validateAndParse(webhookSchema, body)
  if (!validation.success) {
    return apiValidationError(formatZodErrors(validation.errors))
  }

  try {
    const call = await VoiceCallService.upsertFromWebhook({
      ...validation.data,
      rawPayload: body as Record<string, unknown>,
    })
    return apiSuccess({ id: call.id, roomName: call.roomName })
  } catch (error) {
    logger.error('Voice webhook persist failed', error, { module: 'VoiceWebhook' })
    return apiServerError(error instanceof Error ? error.message : undefined)
  }
}

// OPTIONS-Preflight — voice.xkmu.de koennte aus einem Browser-Context
// posten; antwortet 204 mit minimalen CORS-Headern. Server-to-Server-
// Calls brauchen das nicht.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppointmentService, AppointmentTokenError } from '@/lib/services/appointment.service'
import { AuditLogService } from '@/lib/services/audit-log.service'

const Body = z.object({
  token: z.string().min(10),
  reason: z.string().max(500).optional(),
})

const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const RATE_LIMIT_MAX = 10
const ipBuckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  bucket.count++
  return bucket.count <= RATE_LIMIT_MAX
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const { alreadyCancelled, appointmentId } = await AppointmentService.cancel({
      token: parsed.data.token,
      reason: parsed.data.reason,
    })
    if (!alreadyCancelled) {
      try {
        await AuditLogService.log({
          userId: null,
          userRole: 'customer',
          action: 'appointment.cancel',
          entityType: 'appointment',
          entityId: appointmentId,
          payload: {
            cancelledBy: 'customer',
            reason: parsed.data.reason?.slice(0, 200) ?? null,
            alreadyCancelled,
          },
          request,
        })
      } catch (err) {
        console.error('Audit-log write failed for appointment.cancel:', err)
        return NextResponse.json({ error: 'audit_log_failed' }, { status: 500 })
      }
    }
    return NextResponse.json({ success: true, alreadyCancelled })
  } catch (err) {
    if (err instanceof AppointmentTokenError) {
      const code = err.reason === 'expired' ? 410 : 403
      return NextResponse.json({ error: `token_${err.reason}` }, { status: code })
    }
    console.error('Cancel route error:', err)
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }
}

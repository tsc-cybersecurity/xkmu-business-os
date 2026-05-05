import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { AppointmentService, SlotNoLongerAvailableError } from '@/lib/services/appointment.service'
import { AuditLogService } from '@/lib/services/audit-log.service'

interface RouteContext { params: Promise<{ slug: string }> }

const BookSchema = z.object({
  slotTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(1).max(50),
  customerMessage: z.string().max(2000).nullable().optional(),
  consentDsgvo: z.literal(true),
})

const RATE_LIMIT_WINDOW_MS = 60 * 60_000  // 1 hour
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

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params

  // Lookup user
  const userRows = await db.select({
    id: users.id, bookingPageActive: users.bookingPageActive,
  }).from(users).where(eq(users.bookingSlug, slug)).limit(1)
  const user = userRows[0]
  if (!user || !user.bookingPageActive) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Rate-limit
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 })
  }

  // Parse + validate body
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = BookSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const appt = await AppointmentService.book({
      userId: user.id,
      slotTypeId: parsed.data.slotTypeId,
      startAtUtc: new Date(parsed.data.startAt),
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      customerMessage: parsed.data.customerMessage ?? null,
      source: 'public',
    })
    try {
      await AuditLogService.log({
        userId: null,
        userRole: 'customer',
        action: 'appointment.create',
        entityType: 'appointment',
        entityId: appt.id,
        payload: {
          source: 'public',
          slotTypeId: parsed.data.slotTypeId,
          startAt: appt.startAt.toISOString(),
          customerEmail: parsed.data.customerEmail,
        },
        request,
      })
    } catch (err) {
      console.error('Audit-log write failed for appointment.create:', err)
      return NextResponse.json({ error: 'audit_log_failed' }, { status: 500 })
    }
    return NextResponse.json({
      appointmentId: appt.id,
      redirectUrl: `/buchen/${slug}/bestaetigt?id=${appt.id}`,
    })
  } catch (err) {
    if (err instanceof SlotNoLongerAvailableError) {
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 })
    }
    console.error('Booking failed:', err)
    return NextResponse.json({ error: 'booking_failed' }, { status: 500 })
  }
}

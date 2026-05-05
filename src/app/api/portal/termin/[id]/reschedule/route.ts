import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppointmentService, SlotNoLongerAvailableError } from '@/lib/services/appointment.service'
import { getSession } from '@/lib/auth/session'

const BodySchema = z.object({
  startAtUtc: z.string().datetime(),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const result = await AppointmentService.rescheduleByOwner({
      appointmentId: id,
      portalUserId: session.user.id,
      newStartAtUtc: new Date(parsed.data.startAtUtc),
    })
    return NextResponse.json({
      success: true,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
    })
  } catch (err) {
    if (err instanceof SlotNoLongerAvailableError) {
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 })
    }
    if (err instanceof Error) {
      if (err.message === 'not_owned') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      if (err.message === 'appointment_not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (err.message === 'appointment_cancelled') return NextResponse.json({ error: 'appointment_cancelled' }, { status: 410 })
    }
    console.error('Portal reschedule error:', err)
    return NextResponse.json({ error: 'reschedule_failed' }, { status: 500 })
  }
}

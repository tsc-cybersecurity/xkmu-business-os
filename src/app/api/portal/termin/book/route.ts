import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppointmentService, SlotNoLongerAvailableError } from '@/lib/services/appointment.service'
import { getSession } from '@/lib/auth/session'

const BodySchema = z.object({
  userId: z.string().uuid(),
  slotTypeId: z.string().uuid(),
  startAtUtc: z.string().datetime(),
  message: z.string().max(2000).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const result = await AppointmentService.bookForPortal({
      portalUserId: session.user.id,
      userId: parsed.data.userId,
      slotTypeId: parsed.data.slotTypeId,
      startAtUtc: new Date(parsed.data.startAtUtc),
      message: parsed.data.message ?? null,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof SlotNoLongerAvailableError) {
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 })
    }
    if (err instanceof Error) {
      if (err.message === 'person_not_linked') {
        return NextResponse.json({ error: 'person_not_linked' }, { status: 412 })
      }
      if (err.message === 'person_missing_email') {
        return NextResponse.json({ error: 'person_missing_email' }, { status: 412 })
      }
      if (err.message === 'slot_type_invalid') {
        return NextResponse.json({ error: 'slot_type_invalid' }, { status: 404 })
      }
      if (err.message === 'staff_not_bookable') {
        return NextResponse.json({ error: 'staff_not_bookable' }, { status: 404 })
      }
    }
    console.error('Portal book error:', err)
    return NextResponse.json({ error: 'book_failed' }, { status: 500 })
  }
}

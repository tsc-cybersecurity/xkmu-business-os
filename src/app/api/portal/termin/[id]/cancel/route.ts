import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppointmentService } from '@/lib/services/appointment.service'
import { getSession } from '@/lib/auth/session'

const BodySchema = z.object({ reason: z.string().max(500).nullable().optional() })

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let raw: unknown = {}
  try { raw = await req.json() } catch { /* empty body OK */ }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const { alreadyCancelled } = await AppointmentService.cancelByOwner({
      appointmentId: id,
      portalUserId: session.user.id,
      reason: parsed.data.reason ?? null,
    })
    return NextResponse.json({ success: true, alreadyCancelled })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'not_owned') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      if (err.message === 'appointment_not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('Portal cancel error:', err)
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }
}

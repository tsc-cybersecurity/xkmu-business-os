import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AppointmentService, SlotNoLongerAvailableError } from '@/lib/services/appointment.service'

const BodySchema = z.object({
  userId: z.string().uuid(),
  slotTypeId: z.string().uuid(),
  startAtUtc: z.string().datetime(),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(1).max(50),
  customerMessage: z.string().max(2000).nullable().optional(),
  personId: z.string().uuid().optional(),
  suppressCustomerMail: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async () => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    try {
      const result = await AppointmentService.bookManual({
        userId: parsed.data.userId,
        slotTypeId: parsed.data.slotTypeId,
        startAtUtc: new Date(parsed.data.startAtUtc),
        customer: {
          name: parsed.data.customerName,
          email: parsed.data.customerEmail,
          phone: parsed.data.customerPhone,
          message: parsed.data.customerMessage ?? null,
        },
        personId: parsed.data.personId,
        suppressCustomerMail: parsed.data.suppressCustomerMail,
      })
      return NextResponse.json({ appointment: result }, { status: 201 })
    } catch (err) {
      if (err instanceof SlotNoLongerAvailableError) {
        return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 })
      }
      const msg = err instanceof Error ? err.message : 'book_failed'
      console.error('Manual booking failed:', err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}

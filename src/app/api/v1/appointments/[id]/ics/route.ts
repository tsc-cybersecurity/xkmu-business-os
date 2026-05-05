import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, slotTypes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildIcs, buildIcsDescription } from '@/lib/services/appointment-ics.util'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const [row] = await db
    .select({
      apptId: appointments.id,
      icsSequence: appointments.icsSequence,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      customerPhone: appointments.customerPhone,
      customerMessage: appointments.customerMessage,
      slotTypeName: slotTypes.name,
      slotTypeLocation: slotTypes.location,
      slotTypeLocationDetails: slotTypes.locationDetails,
      organizerEmail: users.email,
      organizerFirst: users.firstName,
      organizerLast: users.lastName,
    })
    .from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .innerJoin(users, eq(appointments.userId, users.id))
    .where(eq(appointments.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const description = buildIcsDescription({
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerMessage: row.customerMessage,
  })

  // Status mapping:
  //  - cancelled → METHOD:CANCEL (so calendar clients remove the event on import)
  //  - pending or confirmed → METHOD:REQUEST (Google-sync race window is tiny;
  //    emitting REQUEST while pending is acceptable since the bestaetigt page
  //    only surfaces the download link after booking returns success)
  const method: 'REQUEST' | 'CANCEL' = row.status === 'cancelled' ? 'CANCEL' : 'REQUEST'

  const ics = buildIcs({
    uid: row.apptId,
    sequence: row.icsSequence,
    method,
    startUtc: row.startAt,
    endUtc: row.endAt,
    summary: row.slotTypeName,
    description,
    location: row.slotTypeLocationDetails || row.slotTypeLocation,
    organizerEmail: row.organizerEmail || 'noreply@xkmu.de',
    organizerName: `${row.organizerFirst ?? ''} ${row.organizerLast ?? ''}`.trim() || 'xKMU',
    attendeeEmail: row.customerEmail,
    attendeeName: row.customerName,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': `text/calendar; charset=utf-8; method=${method}`,
      'Content-Disposition': 'attachment; filename="termin.ics"',
      'Cache-Control': 'no-store',
    },
  })
}

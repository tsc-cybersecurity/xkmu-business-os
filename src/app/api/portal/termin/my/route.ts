import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, persons, slotTypes, users } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Find the linked person
  const [person] = await db.select({ id: persons.id })
    .from(persons).where(eq(persons.portalUserId, session.user.id)).limit(1)
  if (!person) return NextResponse.json({ appointments: [] })

  const rows = await db.select({
    id: appointments.id,
    startAt: appointments.startAt,
    endAt: appointments.endAt,
    status: appointments.status,
    customerMessage: appointments.customerMessage,
    cancelledAt: appointments.cancelledAt,
    cancellationReason: appointments.cancellationReason,
    slotTypeName: slotTypes.name,
    slotTypeColor: slotTypes.color,
    location: slotTypes.location,
    locationDetails: slotTypes.locationDetails,
    durationMinutes: slotTypes.durationMinutes,
    minNoticeHours: slotTypes.minNoticeHours,
    maxAdvanceDays: slotTypes.maxAdvanceDays,
    staffFirstName: users.firstName,
    staffLastName: users.lastName,
    staffTimezone: users.timezone,
    userId: appointments.userId,
    slotTypeId: appointments.slotTypeId,
  }).from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .innerJoin(users, eq(appointments.userId, users.id))
    .where(eq(appointments.personId, person.id))
    .orderBy(desc(appointments.startAt))

  return NextResponse.json({ appointments: rows })
}

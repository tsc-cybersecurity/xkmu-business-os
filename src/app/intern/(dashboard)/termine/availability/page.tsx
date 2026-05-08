import { redirect } from 'next/navigation'
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { appointments, externalBusy, slotTypes, userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { AvailabilityService } from '@/lib/services/availability.service'
import { AvailabilityView } from './_components/AvailabilityView'

export default async function AvailabilityPage() {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  // Read-only Overlays fuer den Block-Kalender: vier Wochen rueckwaerts
  // bis vier Wochen vorwaerts. Reicht fuer das uebliche Navi-Fenster.
  const now = new Date()
  const from = new Date(now); from.setDate(from.getDate() - 28)
  const to = new Date(now); to.setDate(to.getDate() + 28)

  const [rules, overrides, appts, busy] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id),
    fetchAppointments(session.user.id, from, to),
    fetchExternalBusy(session.user.id, from, to),
  ])

  return (
    <AvailabilityView
      initialRules={rules}
      initialOverrides={overrides.map(o => ({
        id: o.id,
        userId: o.userId,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt.toISOString(),
        kind: o.kind as 'free' | 'block',
        reason: o.reason,
        createdAt: o.createdAt.toISOString(),
      }))}
      appointments={appts.map(a => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        customerName: a.customerName,
        slotTypeName: a.slotTypeName,
        color: a.color,
      }))}
      externalBusy={busy.map(b => ({
        id: b.id,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        summary: b.summary,
      }))}
    />
  )
}

async function fetchAppointments(userId: string, from: Date, to: Date) {
  return db.select({
    id: appointments.id,
    startAt: appointments.startAt,
    endAt: appointments.endAt,
    customerName: appointments.customerName,
    slotTypeName: slotTypes.name,
    color: slotTypes.color,
  }).from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .where(and(
      eq(appointments.userId, userId),
      or(eq(appointments.status, 'pending'), eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed')),
      gte(appointments.endAt, from),
      lte(appointments.startAt, to),
    ))
}

async function fetchExternalBusy(userId: string, from: Date, to: Date) {
  const accountRows = await db.select().from(userCalendarAccounts)
    .where(and(eq(userCalendarAccounts.userId, userId), isNull(userCalendarAccounts.revokedAt)))
    .limit(1)
  const account = accountRows[0]
  if (!account) return []
  const watched = await db.select().from(userCalendarsWatched)
    .where(and(
      eq(userCalendarsWatched.accountId, account.id),
      eq(userCalendarsWatched.readForBusy, true),
    ))
  if (watched.length === 0) return []
  const calendarIds = watched.map(w => w.googleCalendarId)
  return db.select().from(externalBusy).where(and(
    eq(externalBusy.accountId, account.id),
    inArray(externalBusy.googleCalendarId, calendarIds),
    eq(externalBusy.transparency, 'opaque'),
    gte(externalBusy.endAt, from),
    lte(externalBusy.startAt, to),
  ))
}

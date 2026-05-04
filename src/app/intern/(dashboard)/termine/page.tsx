import { redirect } from 'next/navigation'
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { externalBusy, userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { AvailabilityService } from '@/lib/services/availability.service'
import { WeekCalendarView } from './_components/WeekCalendarView'

interface PageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function TermineOverviewPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/intern/login')
  const { week } = await searchParams

  const anchor = week ? new Date(week) : new Date()
  const monday = startOfWeek(anchor)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const [rules, overrides, busy] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id, monday, sunday),
    fetchExternalBusy(session.user.id, monday, sunday),
  ])

  return (
    <WeekCalendarView
      monday={monday.toISOString()}
      rules={rules}
      overrides={overrides.map(o => ({
        id: o.id,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt.toISOString(),
        kind: o.kind as 'free' | 'block',
        reason: o.reason,
      }))}
      externalBusy={busy.map(e => ({
        id: e.id,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        summary: e.summary,
      }))}
    />
  )
}

async function fetchExternalBusy(userId: string, from: Date, to: Date) {
  // Find the user's active calendar account
  const accountRows = await db.select().from(userCalendarAccounts)
    .where(and(eq(userCalendarAccounts.userId, userId), isNull(userCalendarAccounts.revokedAt)))
    .limit(1)
  const account = accountRows[0]
  if (!account) return []

  // Only consider calendars with read_for_busy = true
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

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
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

  const [rules, overrides] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id, monday, sunday),
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
    />
  )
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

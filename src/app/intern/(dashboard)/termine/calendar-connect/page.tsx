import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { isCalendarFeatureEnabled } from '@/lib/services/calendar-env'
import { CalendarConnectView } from './_components/CalendarConnectView'

interface PageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function CalendarConnectPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  const { connected, error } = await searchParams

  if (!isCalendarFeatureEnabled()) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Google-Calendar-Integration ist nicht konfiguriert. Setze die Env-Variablen
        <code className="mx-1 rounded bg-amber-100 px-1">GOOGLE_CALENDAR_*</code>, dann erneut laden.
      </div>
    )
  }

  const account = await CalendarAccountService.getActiveAccount(session.user.id)
  const calendars = account ? await CalendarAccountService.listWatchedCalendars(account.id) : []

  return (
    <CalendarConnectView
      account={account ? {
        id: account.id,
        googleEmail: account.googleEmail,
        primaryCalendarId: account.primaryCalendarId,
        connectedAt: account.createdAt.toISOString(),
      } : null}
      calendars={calendars.map(c => ({
        id: c.id,
        googleCalendarId: c.googleCalendarId,
        displayName: c.displayName,
        readForBusy: c.readForBusy,
      }))}
      flashConnected={connected === '1'}
      flashError={error ?? null}
    />
  )
}

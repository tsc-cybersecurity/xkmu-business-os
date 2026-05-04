'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-states'

interface CalendarRow {
  id: string
  googleCalendarId: string
  displayName: string
  readForBusy: boolean
}

interface AccountInfo {
  id: string
  googleEmail: string
  primaryCalendarId: string | null
  connectedAt: string
}

interface CalendarAccountResponse {
  account: AccountInfo | null
  calendars: CalendarRow[]
}

export function CalendarConnectCard() {
  const searchParams = useSearchParams()
  const flashConnected = searchParams.get('calendar') === 'connected'
  const flashError = searchParams.get('calendar_error')

  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [calendars, setCalendars] = useState<CalendarRow[]>([])
  const [primary, setPrimary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/v1/calendar-account', { headers: { 'Content-Type': 'application/json' } })
      .then(async res => {
        if (!res.ok) return
        const data: CalendarAccountResponse = await res.json()
        setAccount(data.account)
        setCalendars(data.calendars ?? [])
        setPrimary(data.account?.primaryCalendarId ?? null)
      })
      .catch(() => {
        // Feature unavailable or not configured — render gracefully
      })
      .finally(() => setLoading(false))
  }, [])

  async function setPrimaryCalendar(googleCalendarId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPrimary', googleCalendarId }),
      })
      if (!res.ok) throw new Error('Setzen des primären Kalenders fehlgeschlagen')
      setPrimary(googleCalendarId)
      toast.success('Primärer Kalender gesetzt')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function toggleReadForBusy(watchedId: string, next: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setReadForBusy', watchedId, readForBusy: next }),
      })
      if (!res.ok) throw new Error('Toggle fehlgeschlagen')
      setCalendars(cs => cs.map(c => c.id === watchedId ? { ...c, readForBusy: next } : c))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function disconnect() {
    if (!confirm('Google-Account wirklich trennen? Die Verbindung wird widerrufen.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Trennen fehlgeschlagen')
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
      setBusy(false)
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Google Kalender</CardTitle>
        <CardDescription>
          Verbinde deinen Google-Account, damit Termine automatisch in deinen Kalender geschrieben
          und Doppelbuchungen verhindert werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flashError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            Fehler: {flashError}
          </div>
        )}
        {flashConnected && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            Google-Account erfolgreich verbunden.
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : account ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">Verbunden mit {account.googleEmail}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    seit {new Date(account.connectedAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={disconnect}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Trennen
                </button>
              </div>
            </div>

            {calendars.length > 0 && (
              <div className="rounded-lg border">
                <div className="border-b p-4">
                  <h3 className="font-medium">Kalender</h3>
                  <p className="text-sm text-muted-foreground">
                    Wähle den primären Kalender (Buchungen werden dort angelegt) und welche Kalender als „belegt" gelten.
                  </p>
                </div>
                <ul className="divide-y">
                  {calendars.map(c => (
                    <li key={c.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">{c.displayName}</div>
                        <div className="text-xs text-muted-foreground">{c.googleCalendarId}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="primary"
                            checked={primary === c.googleCalendarId}
                            onChange={() => setPrimaryCalendar(c.googleCalendarId)}
                            disabled={busy}
                          />
                          Primär
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={c.readForBusy}
                            onChange={e => toggleReadForBusy(c.id, e.target.checked)}
                            disabled={busy}
                          />
                          als belegt zählen
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border p-6">
            <h3 className="text-base font-medium">Kein Google-Account verbunden</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Verbinde deinen Google-Account, damit Buchungen automatisch in deinen Kalender
              geschrieben und Doppelbuchungen verhindert werden.
            </p>
            <a
              href="/api/google-calendar/oauth/start"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Mit Google verbinden
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

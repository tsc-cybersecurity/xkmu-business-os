'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CancelDialog } from './CancelDialog'
import { RescheduleDialog } from './RescheduleDialog'

type Appointment = {
  id: string
  startAt: string
  endAt: string
  status: string
  customerMessage: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  slotTypeName: string
  slotTypeColor: string
  location: string
  locationDetails: string | null
  durationMinutes: number
  staffFirstName: string | null
  staffLastName: string | null
  staffTimezone: string
  userId: string
  slotTypeId: string
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
  pending: 'Ausstehend',
}

const STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  cancelled: 'bg-red-100 text-red-900 border-red-200',
  completed: 'bg-zinc-100 text-zinc-900 border-zinc-200',
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
}

export function MyAppointmentsList({ onChanged }: { onChanged?: () => void }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [now, setNow] = useState<number>(0)

  const reload = useCallback(() => {
    setLoading(true)
    fetch('/api/portal/termin/my')
      .then(r => r.json())
      .then(d => setAppointments(d.appointments ?? []))
      .catch(() => toast.error('Fehler beim Laden'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
    // Refresh "now" every minute so future/past partition stays correct
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [reload])

  const { upcoming, past } = useMemo(() => {
    const upc = appointments
      .filter(a => new Date(a.endAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    const pst = appointments
      .filter(a => new Date(a.endAt).getTime() <= now)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    return { upcoming: upc, past: pst }
  }, [appointments, now])

  function fmtFull(iso: string, tz: string): string {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  }

  function renderRow(a: Appointment) {
    const isCancelled = a.status === 'cancelled'
    const isFuture = new Date(a.endAt).getTime() > now
    const canModify = a.status === 'confirmed' && isFuture
    const staffName = `${a.staffFirstName ?? ''} ${a.staffLastName ?? ''}`.trim() || 'Mitarbeiter'
    return (
      <Card key={a.id} className={isCancelled ? 'opacity-60' : ''}>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border"
                  style={{ backgroundColor: a.slotTypeColor }}
                  aria-hidden
                />
                <span className="font-medium">{a.slotTypeName}</span>
                <span
                  className={`ml-2 inline-block px-2 py-0.5 text-xs rounded-full border ${STATUS_CLASS[a.status] ?? ''}`}
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">mit {staffName}</p>
              <p className="text-sm">
                <strong>{fmtFull(a.startAt, a.staffTimezone)}</strong> Uhr ({a.durationMinutes} min)
              </p>
              {a.locationDetails && (
                <p className="text-xs text-muted-foreground">{a.locationDetails}</p>
              )}
              {isCancelled && a.cancellationReason && (
                <p className="text-xs text-muted-foreground italic">
                  Grund: {a.cancellationReason}
                </p>
              )}
              {a.customerMessage && (
                <p className="text-xs text-muted-foreground">
                  Nachricht: {a.customerMessage}
                </p>
              )}
            </div>
            {canModify && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setRescheduleTarget(a)}>
                  Umbuchen
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCancelTarget(a)}>
                  Stornieren
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Bevorstehende Termine</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine bevorstehenden Termine.</p>
        ) : (
          <div className="space-y-3">{upcoming.map(renderRow)}</div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Vergangene Termine</h2>
          <div className="space-y-3">{past.map(renderRow)}</div>
        </section>
      )}

      <CancelDialog
        appt={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => { reload(); onChanged?.() }}
      />
      <RescheduleDialog
        appt={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={() => { reload(); onChanged?.() }}
      />
    </div>
  )
}

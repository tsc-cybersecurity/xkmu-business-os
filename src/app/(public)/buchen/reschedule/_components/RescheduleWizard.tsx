'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface SlotType {
  id: string
  name: string
  durationMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
}

export function RescheduleWizard({ token, timezone, slotType }: {
  token: string
  timezone: string
  slotType: SlotType
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ startAt: string; endAt: string } | null>(null)

  const minDate = new Date(today.getTime() + slotType.minNoticeHours * 3600_000)
  const maxDate = new Date(today.getTime() + slotType.maxAdvanceDays * 86400_000)

  useEffect(() => {
    if (!selectedDate) { setSlots([]); return }
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetch(`/api/buchen/reschedule/availability?token=${encodeURIComponent(token)}&date=${selectedDate}`)
      .then(async r => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error ?? 'Fehler')
        }
        return r.json()
      })
      .then(d => setSlots(d.slots ?? []))
      .catch(e => toast.error(e instanceof Error ? e.message : 'Fehler beim Laden der Slots'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, token])

  function dayKey(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  function isInRange(y: number, m: number, d: number): boolean {
    const dt = new Date(y, m, d)
    return dt >= new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
        && dt <= new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
  }

  const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1))
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = Array(offset).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  function navigateMonth(delta: number) {
    let y = viewYear, m = viewMonth + delta
    if (m < 0) { y--; m = 11 }
    if (m > 11) { y++; m = 0 }
    setViewYear(y); setViewMonth(m)
  }

  function fmtSlotTime(iso: string): string {
    return new Intl.DateTimeFormat('de-DE', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  }
  function fmtFull(iso: string): string {
    return new Intl.DateTimeFormat('de-DE', { timeZone: timezone, dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
  }

  async function submit() {
    if (!selectedSlot) { toast.error('Bitte einen Slot auswählen'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/buchen/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, startAtUtc: selectedSlot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) throw new Error('Dieser Slot ist nicht mehr verfügbar. Bitte wähle einen anderen.')
        throw new Error(data.error ?? 'Umbuchung fehlgeschlagen')
      }
      setDone({ startAt: data.startAt, endAt: data.endAt })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-6 text-emerald-900">
        <h2 className="text-lg font-semibold mb-2">Termin wurde verschoben.</h2>
        <p>Neuer Termin: <strong>{fmtFull(done.startAt)}</strong></p>
        <p className="text-sm mt-3">Eine Bestätigung wurde an deine E-Mail-Adresse gesendet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} aria-label="Vormonat">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{monthName}</div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} aria-label="Nächster Monat">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const inRange = isInRange(viewYear, viewMonth, d)
            const key = dayKey(viewYear, viewMonth, d)
            const isSelected = key === selectedDate
            return (
              <button
                key={i}
                type="button"
                disabled={!inRange}
                onClick={() => setSelectedDate(key)}
                className={`h-9 rounded text-sm transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground' :
                  inRange ? 'hover:bg-accent' : 'opacity-30 cursor-not-allowed'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Slots */}
      {selectedDate && (
        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-3">Verfügbare Zeiten am {new Date(selectedDate).toLocaleDateString('de-DE', { dateStyle: 'long' })}</h2>
          {slotsLoading ? (
            <p className="text-sm text-muted-foreground">Lade Slots…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine freien Zeiten an diesem Tag.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(iso => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedSlot(iso)}
                  className={`px-3 py-2 rounded border text-sm ${
                    selectedSlot === iso ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  }`}
                >
                  {fmtSlotTime(iso)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {selectedSlot && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="text-sm">
            Neuer Termin: <strong>{fmtFull(selectedSlot)}</strong> ({slotType.durationMinutes} min)
          </div>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Wird verschoben…' : 'Termin verschieben'}
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  appt: {
    id: string
    userId: string
    slotTypeId: string
    slotTypeName: string
    durationMinutes: number
    staffTimezone: string
  } | null
  onClose: () => void
  onRescheduled?: () => void
}

// Sensible defaults — server will reject out-of-range slots anyway
const MIN_NOTICE_HOURS = 2
const MAX_ADVANCE_DAYS = 60

export function RescheduleDialog({ appt, onClose, onRescheduled }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset state when target changes
  useEffect(() => {
    if (appt) {
      const t = new Date()
      t.setHours(0, 0, 0, 0)
      setViewYear(t.getFullYear())
      setViewMonth(t.getMonth())
      setSelectedDate(null)
      setSlots([])
      setSelectedSlot(null)
    }
  }, [appt])

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !appt) { setSlots([]); return }
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetch(`/api/portal/termin/availability?userId=${appt.userId}&slotTypeId=${appt.slotTypeId}&date=${selectedDate}`)
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
  }, [selectedDate, appt])

  const minDate = new Date(today.getTime() + MIN_NOTICE_HOURS * 3600_000)
  const maxDate = new Date(today.getTime() + MAX_ADVANCE_DAYS * 86400_000)

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
    if (!appt) return ''
    return new Intl.DateTimeFormat('de-DE', { timeZone: appt.staffTimezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  }
  function fmtFull(iso: string): string {
    if (!appt) return ''
    return new Intl.DateTimeFormat('de-DE', { timeZone: appt.staffTimezone, dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
  }

  async function submit() {
    if (!appt || !selectedSlot) { toast.error('Bitte einen Slot auswählen'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/termin/${appt.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAtUtc: selectedSlot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) throw new Error('Dieser Slot ist nicht mehr verfügbar. Bitte wähle einen anderen.')
        if (res.status === 410) throw new Error('Dieser Termin wurde bereits storniert.')
        if (res.status === 403) throw new Error('Keine Berechtigung für diesen Termin.')
        throw new Error(data.error ?? 'Umbuchung fehlgeschlagen')
      }
      toast.success('Termin verschoben')
      onRescheduled?.()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={appt !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        {appt ? (
          <>
            <DialogHeader>
              <DialogTitle>Termin umbuchen</DialogTitle>
              <DialogDescription>
                {appt.slotTypeName} — bitte wähle ein neues Datum und eine neue Uhrzeit.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Calendar */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} aria-label="Vorheriger Monat">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium">{monthName}</div>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} aria-label="Nächster Monat">
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
              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-medium mb-3">
                  {selectedDate
                    ? new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(selectedDate))
                    : 'Bitte zuerst ein Datum wählen'}
                </h3>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Lade Slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine freien Zeiten an diesem Tag.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(iso => (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedSlot(iso)}
                        className={`px-2 py-2 rounded border text-sm transition-colors ${
                          selectedSlot === iso
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {fmtSlotTime(iso)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedSlot && (
              <p className="text-sm">
                Neuer Termin: <strong>{fmtFull(selectedSlot)}</strong> ({appt.durationMinutes} min)
              </p>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Abbrechen</Button>
              <Button onClick={submit} disabled={submitting || !selectedSlot}>
                {submitting ? 'Wird verschoben…' : 'Umbuchen'}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

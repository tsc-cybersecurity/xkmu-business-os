'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Phone, Video, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SlotType {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  location: string
  locationDetails: string | null
  color: string
  minNoticeHours: number
  maxAdvanceDays: number
}

interface StaffEntry {
  id: string
  firstName: string | null
  lastName: string | null
  bookingPageTitle: string | null
  bookingPageSubtitle: string | null
  timezone: string
  slotTypes: SlotType[]
}

const LOCATION_ICON: Record<string, typeof Phone> = {
  phone: Phone, video: Video, onsite: MapPin, custom: Clock,
}
const LOCATION_LABEL: Record<string, string> = {
  phone: 'Telefon', video: 'Video', onsite: 'Vor Ort', custom: 'Sonstiges',
}

export function BookingWizard({ onBooked }: { onBooked?: () => void }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [staff, setStaff] = useState<StaffEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selStaff, setSelStaff] = useState<StaffEntry | null>(null)
  const [selSlotType, setSelSlotType] = useState<SlotType | null>(null)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load staff on mount; auto-skip step 1 if only one staff
  useEffect(() => {
    fetch('/api/portal/termin/staff')
      .then(r => r.json())
      .then(d => {
        const list: StaffEntry[] = d.staff ?? []
        setStaff(list)
        if (list.length === 1) {
          setSelStaff(list[0])
          setStep(2)
        }
        setLoading(false)
      })
      .catch(() => { toast.error('Fehler beim Laden'); setLoading(false) })
  }, [])

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !selStaff || !selSlotType) { setSlots([]); return }
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetch(`/api/portal/termin/availability?userId=${selStaff.id}&slotTypeId=${selSlotType.id}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .catch(() => toast.error('Fehler beim Laden der Slots'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, selStaff, selSlotType])

  function dayKey(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function isInRange(y: number, m: number, d: number): boolean {
    if (!selSlotType) return false
    const minDate = new Date(today.getTime() + selSlotType.minNoticeHours * 3600_000)
    const maxDate = new Date(today.getTime() + selSlotType.maxAdvanceDays * 86400_000)
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
    if (!selStaff) return ''
    return new Intl.DateTimeFormat('de-DE', { timeZone: selStaff.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  }

  function fmtFull(iso: string): string {
    if (!selStaff) return ''
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: selStaff.timezone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  }

  async function submit() {
    if (!selStaff || !selSlotType || !selectedSlot) { toast.error('Auswahl unvollständig'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/termin/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selStaff.id,
          slotTypeId: selSlotType.id,
          startAtUtc: selectedSlot,
          message: message || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) throw new Error('Dieser Slot ist nicht mehr verfügbar.')
        if (res.status === 412) throw new Error('Dein Profil ist nicht vollständig (E-Mail fehlt). Bitte wende dich an den Administrator.')
        throw new Error(data.error ?? 'Buchung fehlgeschlagen')
      }
      toast.success('Termin gebucht')
      onBooked?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade…</p>
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Aktuell sind keine Termine buchbar.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Step 1 — staff selection (multiple staff)
  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Mit wem möchtest du einen Termin buchen?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelStaff(s); setStep(2) }}
              className="text-left"
            >
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">
                    {s.bookingPageTitle?.trim() || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Mitarbeiter'}
                  </CardTitle>
                  {s.bookingPageSubtitle && (
                    <CardDescription>{s.bookingPageSubtitle}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {s.slotTypes.length} {s.slotTypes.length === 1 ? 'Termintyp' : 'Termintypen'} verfügbar
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step 2 — slot-type selection
  if (step === 2 && selStaff) {
    return (
      <div className="space-y-4">
        {staff.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => { setSelStaff(null); setStep(1) }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> zurück
          </Button>
        )}
        <h2 className="text-lg font-medium">
          {selStaff.bookingPageTitle?.trim() || `${selStaff.firstName ?? ''} ${selStaff.lastName ?? ''}`.trim()}
        </h2>
        {selStaff.slotTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Termintypen verfügbar.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {selStaff.slotTypes.map(st => {
              const Icon = LOCATION_ICON[st.location] ?? Clock
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => { setSelSlotType(st); setStep(3) }}
                  className="text-left"
                >
                  <Card className="hover:border-primary transition-colors h-full">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        {st.name}
                      </CardTitle>
                      <CardDescription>
                        {st.durationMinutes} min · {LOCATION_LABEL[st.location] ?? st.location}
                      </CardDescription>
                    </CardHeader>
                    {st.description && (
                      <CardContent>
                        <p className="text-sm whitespace-pre-line line-clamp-3">{st.description}</p>
                      </CardContent>
                    )}
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Step 3 — date+time picker
  if (step === 3 && selStaff && selSlotType) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelSlotType(null); setSelectedDate(null); setSelectedSlot(null); setStep(2) }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> zurück
        </Button>
        <header>
          <h2 className="text-lg font-medium">{selSlotType.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selSlotType.durationMinutes} min · {LOCATION_LABEL[selSlotType.location] ?? selSlotType.location}
            {selSlotType.locationDetails && ` — ${selSlotType.locationDetails}`}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} aria-label="Vorheriger Monat">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base">{monthName}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} aria-label="Nächster Monat">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                  <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} />
                  const inRange = isInRange(viewYear, viewMonth, d)
                  const key = dayKey(viewYear, viewMonth, d)
                  const isSelected = selectedDate === key
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!inRange}
                      onClick={() => setSelectedDate(key)}
                      className={[
                        'h-9 rounded text-sm transition-colors',
                        inRange ? 'hover:bg-muted cursor-pointer' : 'text-muted-foreground/30 cursor-not-allowed',
                        isSelected ? 'bg-primary text-primary-foreground hover:bg-primary' : '',
                      ].join(' ')}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Slot list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Uhrzeit</CardTitle>
              <CardDescription>
                {selectedDate
                  ? new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(selectedDate))
                  : 'Bitte zuerst ein Datum wählen'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : slotsLoading ? (
                <p className="text-sm text-muted-foreground">Lade Slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine freien Slots an diesem Tag.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSelectedSlot(s); setStep(4) }}
                      className={[
                        'py-2 px-2 rounded text-sm border transition-colors',
                        selectedSlot === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted',
                      ].join(' ')}
                    >
                      {fmtSlotTime(s)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Step 4 — confirm
  if (step === 4 && selStaff && selSlotType && selectedSlot) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedSlot(null); setStep(3) }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> zurück
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Termin bestätigen</CardTitle>
            <CardDescription>Bitte überprüfe deine Auswahl.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Mit:</dt>
              <dd>
                {selStaff.bookingPageTitle?.trim() || `${selStaff.firstName ?? ''} ${selStaff.lastName ?? ''}`.trim()}
              </dd>
              <dt className="text-muted-foreground">Termintyp:</dt>
              <dd>{selSlotType.name}</dd>
              <dt className="text-muted-foreground">Termin:</dt>
              <dd><strong>{fmtFull(selectedSlot)}</strong> Uhr</dd>
              <dt className="text-muted-foreground">Dauer:</dt>
              <dd>{selSlotType.durationMinutes} min</dd>
              <dt className="text-muted-foreground">Ort:</dt>
              <dd>
                {LOCATION_LABEL[selSlotType.location] ?? selSlotType.location}
                {selSlotType.locationDetails && ` — ${selSlotType.locationDetails}`}
              </dd>
            </dl>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="message">Nachricht (optional)</label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? 'Wird gebucht…' : 'Verbindlich buchen'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

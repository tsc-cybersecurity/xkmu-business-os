'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Phone, Video, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SlotType {
  id: string
  slug: string
  name: string
  description: string | null
  durationMinutes: number
  location: string
  locationDetails: string | null
  minNoticeHours: number
  maxAdvanceDays: number
}

const LOCATION_ICON: Record<string, typeof Phone> = {
  phone: Phone, video: Video, onsite: MapPin, custom: Clock,
}
const LOCATION_LABEL: Record<string, string> = {
  phone: 'Telefon', video: 'Video', onsite: 'Vor Ort', custom: 'Sonstiges',
}

export function BookingWizard({ slug, timezone, slotType }: { slug: string; timezone: string; slotType: SlotType }) {
  const router = useRouter()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())  // 0..11
  const [selectedDate, setSelectedDate] = useState<string | null>(null)  // YYYY-MM-DD
  const [slots, setSlots] = useState<string[]>([])  // ISO UTC strings
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '', customerMessage: '',
    consentDsgvo: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const minDate = new Date(today.getTime() + slotType.minNoticeHours * 3600_000)
  const maxDate = new Date(today.getTime() + slotType.maxAdvanceDays * 86400_000)

  useEffect(() => {
    if (!selectedDate) { setSlots([]); return }
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetch(`/api/buchen/${slug}/availability?slotTypeId=${slotType.id}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .catch(() => toast.error('Fehler beim Laden der Slots'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, slotType.id, slug])

  function dayKey(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  function isInRange(y: number, m: number, d: number): boolean {
    const dt = new Date(y, m, d)
    return dt >= new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
        && dt <= new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
  }

  const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1))
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()  // 0=Sun..6=Sat
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1  // 0=Mon..6=Sun
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) { toast.error('Bitte einen Slot auswählen'); return }
    if (!form.consentDsgvo) { toast.error('Bitte Datenschutz zustimmen'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/buchen/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotTypeId: slotType.id,
          startAt: selectedSlot,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          customerMessage: form.customerMessage || null,
          consentDsgvo: true,
        }),
      })
      if (res.status === 409) {
        toast.error('Dieser Slot ist leider schon vergeben. Bitte einen anderen wählen.')
        // refetch slots
        if (selectedDate) {
          const r = await fetch(`/api/buchen/${slug}/availability?slotTypeId=${slotType.id}&date=${selectedDate}`)
          const d = await r.json()
          setSlots(d.slots ?? [])
        }
        setSelectedSlot(null)
        setSubmitting(false)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Buchung fehlgeschlagen')
      }
      const out = await res.json()
      router.push(out.redirectUrl)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
      setSubmitting(false)
    }
  }

  const Icon = LOCATION_ICON[slotType.location] ?? Clock

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/buchen/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" /> zurück
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          <Icon className="h-6 w-6 shrink-0" />
          {slotType.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {slotType.durationMinutes} min · {LOCATION_LABEL[slotType.location] ?? slotType.location}
          {slotType.locationDetails && ` — ${slotType.locationDetails}`}
        </p>
        {slotType.description && (
          <p className="mt-3 text-sm whitespace-pre-line">{slotType.description}</p>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datepicker */}
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
                    onClick={() => { setSelectedSlot(s); setTimeout(() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' }), 50) }}
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

      {/* Form */}
      {selectedSlot && (
        <Card id="booking-form" className="mt-6">
          <CardHeader>
            <CardTitle>Ihre Daten</CardTitle>
            <CardDescription>
              Termin: {new Intl.DateTimeFormat('de-DE', {
                timeZone: timezone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }).format(new Date(selectedSlot))} Uhr ({slotType.durationMinutes} min)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" required value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input id="email" type="email" required value={form.customerEmail}
                    onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input id="phone" type="tel" required value={form.customerPhone}
                    onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Nachricht (optional)</Label>
                <Textarea id="message" rows={3} value={form.customerMessage}
                  onChange={e => setForm({ ...form, customerMessage: e.target.value })} />
              </div>
              <div className="flex items-start gap-2">
                <input id="dsgvo" type="checkbox" required checked={form.consentDsgvo}
                  onChange={e => setForm({ ...form, consentDsgvo: e.target.checked })}
                  className="mt-1" />
                <Label htmlFor="dsgvo" className="font-normal">
                  Ich willige der Verarbeitung meiner Daten gemäß der{' '}
                  <Link href="/datenschutz" target="_blank" className="underline">Datenschutzerklärung</Link>{' '}
                  zu. *
                </Label>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Wird gebucht…' : 'Verbindlich buchen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

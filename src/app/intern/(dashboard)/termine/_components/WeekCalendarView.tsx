'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AvailabilityRule } from '@/lib/db/schema'
import { ManualBookingDialog } from './ManualBookingDialog'

interface OverrideLite {
  id: string
  startAt: string
  endAt: string
  kind: 'free' | 'block'
  reason: string | null
}

interface ExternalBusyLite {
  id: string
  startAt: string
  endAt: string
  summary: string | null
}

interface AppointmentLite {
  id: string
  startAt: string
  endAt: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerMessage: string | null
  slotTypeName: string
  color: string
  status: string
}

const DAYS_DE_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i)
const SLOT_PX = 14 // h-3.5
const HOUR_PX = SLOT_PX * 4 // 56
const DAY_START_MIN = HOURS[0] * 60 // 06:00 → 360
const DAY_END_MIN = (HOURS[HOURS.length - 1] + 1) * 60 // 23:00 → 1380

function ruleTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function dateMinutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function WeekCalendarView(props: {
  monday: string
  rules: AvailabilityRule[]
  overrides: OverrideLite[]
  externalBusy?: ExternalBusyLite[]
  appointments?: AppointmentLite[]
  slotTypes: { id: string; name: string; durationMinutes: number; color: string }[]
  userTimezone: string
  userId: string
}) {
  const router = useRouter()
  const [selectedAppt, setSelectedAppt] = useState<AppointmentLite | null>(null)
  const [manualOpen, setManualOpen] = useState<{ open: boolean; preset?: { startAtUtc?: Date } }>({ open: false })
  const monday = new Date(props.monday)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  function navigate(weeks: number) {
    const next = new Date(monday)
    next.setDate(next.getDate() + weeks * 7)
    router.push(`/intern/termine?week=${next.toISOString().slice(0, 10)}`)
  }

  function findExternalBusy(cellStart: Date, cellEnd: Date) {
    const busy = props.externalBusy ?? []
    for (const e of busy) {
      const s = new Date(e.startAt)
      const en = new Date(e.endAt)
      if (cellStart < en && cellEnd > s) return e
    }
    return null
  }

  type CellState = 'available' | 'blocked' | 'free-override' | 'busy-external' | 'idle'

  function cellState(dayIdx: number, hourMinute: number): { state: CellState; busy: ExternalBusyLite | null; cellStart: Date } {
    const day = days[dayIdx]
    const cellStart = new Date(day)
    cellStart.setHours(0, 0, 0, 0)
    cellStart.setMinutes(hourMinute)
    const cellEnd = new Date(cellStart)
    cellEnd.setMinutes(cellEnd.getMinutes() + 15)

    // External Google events take precedence — even if rules would say "available"
    const busy = findExternalBusy(cellStart, cellEnd)
    if (busy) return { state: 'busy-external', busy, cellStart }

    for (const o of props.overrides) {
      const oStart = new Date(o.startAt)
      const oEnd = new Date(o.endAt)
      if (cellStart < oEnd && cellEnd > oStart) {
        return { state: o.kind === 'block' ? 'blocked' : 'free-override', busy: null, cellStart }
      }
    }

    const jsDay = day.getDay()
    const ourDay = jsDay === 0 ? 6 : jsDay - 1
    const matching = props.rules.filter(r => r.dayOfWeek === ourDay && r.isActive)
    for (const r of matching) {
      const start = ruleTimeToMinutes(r.startTime)
      const end = ruleTimeToMinutes(r.endTime)
      if (hourMinute >= start && hourMinute + 15 <= end) return { state: 'available', busy: null, cellStart }
    }
    return { state: 'idle', busy: null, cellStart }
  }

  const cellClass = (state: CellState): string => {
    switch (state) {
      case 'available': return 'bg-emerald-50 dark:bg-emerald-950/40'
      case 'blocked': return 'bg-red-100 dark:bg-red-950/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]'
      case 'free-override': return 'bg-emerald-200 dark:bg-emerald-900/60'
      case 'busy-external': return 'bg-slate-300 dark:bg-slate-700'
      default: return ''
    }
  }

  function appointmentsForDay(dayIdx: number): { appt: AppointmentLite; topPx: number; heightPx: number }[] {
    const day = days[dayIdx]
    const result: { appt: AppointmentLite; topPx: number; heightPx: number }[] = []
    for (const a of props.appointments ?? []) {
      const s = new Date(a.startAt)
      const e = new Date(a.endAt)
      if (!sameLocalDay(s, day) && !sameLocalDay(e, day)) continue
      const startMin = sameLocalDay(s, day) ? Math.max(DAY_START_MIN, dateMinutesFromMidnight(s)) : DAY_START_MIN
      const endMin = sameLocalDay(e, day) ? Math.min(DAY_END_MIN, dateMinutesFromMidnight(e)) : DAY_END_MIN
      if (endMin <= startMin) continue
      const topPx = ((startMin - DAY_START_MIN) / 15) * SLOT_PX
      const heightPx = ((endMin - startMin) / 15) * SLOT_PX
      result.push({ appt: a, topPx, heightPx })
    }
    return result
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Vorwoche">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(0)}>Heute</Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Nächste Woche">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">
            KW {weekNumber(monday)} · {monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – {days[6].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Legend />
          <Button onClick={() => setManualOpen({ open: true })}>
            <Plus className="h-4 w-4" /> Termin anlegen
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            <div className="border-b bg-muted/40 p-2 text-xs font-medium" />
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime()
              return (
                <div
                  key={i}
                  className={`border-b border-l bg-muted/40 p-2 text-xs font-medium text-center ${isToday ? 'bg-primary/10' : ''}`}
                >
                  <div>{DAYS_DE_SHORT[i]}</div>
                  <div className="text-muted-foreground">{d.getDate()}.{d.getMonth() + 1}.</div>
                </div>
              )
            })}
          </div>

          {/* Body row: time column + 7 day columns (each is its own positioning context for appointment overlays) */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Time column */}
            <div className="border-r">
              {HOURS.map(h => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="border-b p-1 text-xs text-muted-foreground text-right pr-2"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((_, dayIdx) => (
              <div key={dayIdx} className="relative border-l">
                {HOURS.map(h => (
                  <div key={h} className="border-b">
                    {[0, 15, 30, 45].map(min => {
                      const hourMinute = h * 60 + min
                      const { state, busy, cellStart } = cellState(dayIdx, hourMinute)
                      const isClickable = state === 'available' || state === 'free-override'
                      const baseClass = `h-3.5 w-full ${cellClass(state)} ${min === 0 ? '' : 'border-t border-dashed border-muted-foreground/10'}`
                      if (isClickable) {
                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setManualOpen({ open: true, preset: { startAtUtc: cellStart } })}
                            title={`${cellStart.toLocaleString('de-DE')} — Termin hier anlegen`}
                            className={`${baseClass} cursor-pointer hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-ring`}
                          />
                        )
                      }
                      return (
                        <div
                          key={min}
                          title={busy?.summary ?? undefined}
                          className={baseClass}
                        />
                      )
                    })}
                  </div>
                ))}

                {/* Appointment overlays — one button per appointment, sized to its duration */}
                {appointmentsForDay(dayIdx).map(({ appt, topPx, heightPx }) => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => setSelectedAppt(appt)}
                    style={{ top: topPx, height: heightPx, backgroundColor: appt.color }}
                    className="absolute inset-x-0.5 rounded-sm border border-black/15 px-1 py-0 text-left text-[10px] leading-tight text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden cursor-pointer"
                    aria-label={`Termin: ${appt.slotTypeName} mit ${appt.customerName}`}
                    title={`${appt.slotTypeName} — ${appt.customerName}`}
                  >
                    <div className="truncate font-semibold">{appt.slotTypeName}</div>
                    {heightPx >= SLOT_PX * 2 ? (
                      <div className="truncate opacity-95">{appt.customerName}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hinweis: Externe Google-Events werden bei jedem Webhook-Call automatisch synchronisiert. Klicke auf eine Buchung, um Details zu sehen.
      </p>

      <AppointmentDetailsDialog
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
      />

      <ManualBookingDialog
        open={manualOpen.open}
        onClose={() => setManualOpen({ open: false })}
        onCreated={() => { setManualOpen({ open: false }); router.refresh() }}
        preset={manualOpen.preset}
        slotTypes={props.slotTypes}
        userTimezone={props.userTimezone}
        userId={props.userId}
      />
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const date = start.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const t = (d: Date) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${t(start)} – ${t(end)}`
}

function AppointmentDetailsDialog({ appt, onClose }: { appt: AppointmentLite | null; onClose: () => void }) {
  return (
    <Dialog open={appt !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        {appt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: appt.color }}
                />
                {appt.slotTypeName}
              </DialogTitle>
              <DialogDescription>{formatRange(appt.startAt, appt.endAt)}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{STATUS_LABELS[appt.status] ?? appt.status}</dd>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <dt className="text-muted-foreground">Kunde</dt>
                <dd>{appt.customerName}</dd>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <dt className="text-muted-foreground">E-Mail</dt>
                <dd>
                  <a className="underline hover:no-underline" href={`mailto:${appt.customerEmail}`}>
                    {appt.customerEmail}
                  </a>
                </dd>
              </div>
              {appt.customerPhone ? (
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-muted-foreground">Telefon</dt>
                  <dd>
                    <a className="underline hover:no-underline" href={`tel:${appt.customerPhone}`}>
                      {appt.customerPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {appt.customerMessage ? (
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-muted-foreground">Nachricht</dt>
                  <dd className="whitespace-pre-wrap">{appt.customerMessage}</dd>
                </div>
              ) : null}
            </dl>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-50 border" />
        verfügbar
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200 border" />
        zusätzlich frei
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-slate-300 border" />
        extern belegt
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-blue-400 border" />
        Buchung
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border" />
        blockiert
      </span>
    </div>
  )
}

function weekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const yearStart = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7)
}

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AvailabilityRule } from '@/lib/db/schema'

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

const DAYS_DE_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i)

function ruleTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function WeekCalendarView(props: {
  monday: string
  rules: AvailabilityRule[]
  overrides: OverrideLite[]
  externalBusy?: ExternalBusyLite[]
}) {
  const router = useRouter()
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

  function cellState(dayIdx: number, hourMinute: number): { state: CellState; busy: ExternalBusyLite | null } {
    const day = days[dayIdx]
    const cellStart = new Date(day)
    cellStart.setHours(0, 0, 0, 0)
    cellStart.setMinutes(hourMinute)
    const cellEnd = new Date(cellStart)
    cellEnd.setMinutes(cellEnd.getMinutes() + 15)

    // External Google events take precedence — even if rules would say "available"
    const busy = findExternalBusy(cellStart, cellEnd)
    if (busy) return { state: 'busy-external', busy }

    for (const o of props.overrides) {
      const oStart = new Date(o.startAt)
      const oEnd = new Date(o.endAt)
      if (cellStart < oEnd && cellEnd > oStart) {
        return { state: o.kind === 'block' ? 'blocked' : 'free-override', busy: null }
      }
    }

    const jsDay = day.getDay()
    const ourDay = jsDay === 0 ? 6 : jsDay - 1
    const matching = props.rules.filter(r => r.dayOfWeek === ourDay && r.isActive)
    for (const r of matching) {
      const start = ruleTimeToMinutes(r.startTime)
      const end = ruleTimeToMinutes(r.endTime)
      if (hourMinute >= start && hourMinute + 15 <= end) return { state: 'available', busy: null }
    }
    return { state: 'idle', busy: null }
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
        <Legend />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
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

          {HOURS.map(h => (
            <div key={`row-${h}`} className="contents">
              <div className="border-r border-b p-1 text-xs text-muted-foreground text-right pr-2">
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((_, dayIdx) => (
                <div key={`cell-${h}-${dayIdx}`} className="border-l border-b">
                  {[0, 15, 30, 45].map(min => {
                    const hourMinute = h * 60 + min
                    const { state, busy } = cellState(dayIdx, hourMinute)
                    return (
                      <div
                        key={min}
                        title={busy?.summary ?? undefined}
                        className={`h-3.5 ${cellClass(state)} ${min === 0 ? '' : 'border-t border-dashed border-muted-foreground/10'}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hinweis: Eigene Buchungen werden in Phase 4 ergänzt. Externe Google-Events werden bei jedem Webhook-Call automatisch synchronisiert.
      </p>
    </div>
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

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Ban, CheckCircle2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { OverrideRow } from './OverridesEditor'

const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOUR_START = 7
const HOUR_END = 22
const SLOT_MINUTES = 30
const HOURS = HOUR_END - HOUR_START
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES
const TOTAL_SLOTS = HOURS * SLOTS_PER_HOUR
const SLOT_HEIGHT = 18 // px

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - day)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function fmtTime(slotIdx: number): string {
  const totalMinutes = slotIdx * SLOT_MINUTES + HOUR_START * 60
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface DragState {
  dayIdx: number
  startSlot: number
  currentSlot: number
}

interface OverridePosition {
  override: OverrideRow
  dayIdx: number
  topSlot: number
  bottomSlot: number
}

function overrideToPositions(o: OverrideRow, weekStart: Date): OverridePosition[] {
  // Override koennte mehrere Tage abdecken — wir splitten auf einzelne Tagesabschnitte
  const start = new Date(o.startAt)
  const end = new Date(o.endAt)
  const result: OverridePosition[] = []

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dayStart = addDays(weekStart, dayIdx)
    const dayEnd = addDays(dayStart, 1)
    if (end <= dayStart || start >= dayEnd) continue
    const segStart = start > dayStart ? start : dayStart
    const segEnd = end < dayEnd ? end : dayEnd
    const startMinutes = (segStart.getTime() - dayStart.getTime()) / 60000
    const endMinutes = (segEnd.getTime() - dayStart.getTime()) / 60000
    const topSlot = Math.max(0, (startMinutes - HOUR_START * 60) / SLOT_MINUTES)
    const bottomSlot = Math.min(TOTAL_SLOTS, (endMinutes - HOUR_START * 60) / SLOT_MINUTES)
    if (bottomSlot <= 0 || topSlot >= TOTAL_SLOTS || bottomSlot <= topSlot) continue
    result.push({ override: o, dayIdx, topSlot, bottomSlot })
  }
  return result
}

function slotToDate(weekStart: Date, dayIdx: number, slot: number): Date {
  const d = addDays(weekStart, dayIdx)
  d.setMinutes(slot * SLOT_MINUTES + HOUR_START * 60)
  return d
}

export function BlockCalendarEditor({ overrides, onChange }: {
  overrides: OverrideRow[]
  onChange: (next: OverrideRow[]) => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [pendingKind, setPendingKind] = useState<'block' | 'free'>('block')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<OverrideRow | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const positions = useMemo(() => {
    const out: OverridePosition[] = []
    for (const o of overrides) out.push(...overrideToPositions(o, weekStart))
    return out
  }, [overrides, weekStart])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, dayIdx: number) {
    if (busy) return
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const rect = target.getBoundingClientRect()
    const slot = Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)))
    setDrag({ dayIdx, startSlot: slot, currentSlot: slot })
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const col = e.currentTarget
    const rect = col.getBoundingClientRect()
    const slot = Math.max(0, Math.min(TOTAL_SLOTS, Math.floor((e.clientY - rect.top) / SLOT_HEIGHT) + 1))
    setDrag({ ...drag, currentSlot: slot })
  }

  async function onPointerUp() {
    if (!drag) return
    const top = Math.min(drag.startSlot, drag.currentSlot)
    const bottom = Math.max(drag.startSlot, drag.currentSlot)
    setDrag(null)
    if (bottom - top < 1) return // zu kurz
    const startAt = slotToDate(weekStart, drag.dayIdx, top)
    const endAt = slotToDate(weekStart, drag.dayIdx, bottom)
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), kind: pendingKind, reason: null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { override } = await res.json()
      onChange([...overrides, override].sort((a, b) => a.startAt.localeCompare(b.startAt)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function deleteOverride(id: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/overrides/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      onChange(overrides.filter(o => o.id !== id))
      setSelected(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  // Esc zum Abbrechen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrag(null)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            <Calendar className="mr-1 h-4 w-4" /> Heute
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Vorige Woche">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[180px] text-center">
            {fmtDate(weekStart)} – {fmtDate(addDays(weekStart, 6))}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Naechste Woche">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant={pendingKind === 'block' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPendingKind('block')}
          >
            <Ban className="mr-1.5 h-4 w-4" />
            Blockieren
          </Button>
          <Button
            type="button"
            variant={pendingKind === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPendingKind('free')}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Zusaetzlich frei
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        In den Tagesspalten klicken &amp; ziehen, um einen neuen Block anzulegen. Klick auf einen Block: Details &amp; Loeschen.
      </p>

      <div className="rounded-lg border bg-background overflow-hidden select-none">
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] bg-muted/30 text-xs">
          <div />
          {DAYS_DE.map((d, i) => {
            const day = addDays(weekStart, i)
            const isToday = new Date().toDateString() === day.toDateString()
            return (
              <div key={i} className={`text-center py-2 border-l ${isToday ? 'bg-sky-50 dark:bg-sky-950/30 font-semibold' : ''}`}>
                <div>{d}</div>
                <div className="text-muted-foreground">{fmtDate(day)}</div>
              </div>
            )
          })}
        </div>
        <div ref={gridRef} className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))]">
          <div className="text-xs text-muted-foreground">
            {Array.from({ length: HOURS + 1 }, (_, h) => (
              <div key={h} style={{ height: h === HOURS ? 0 : SLOT_HEIGHT * SLOTS_PER_HOUR }} className="px-1 text-right border-t">
                {String(HOUR_START + h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const dayPositions = positions.filter(p => p.dayIdx === dayIdx)
            const isDragDay = drag?.dayIdx === dayIdx
            const dragTop = isDragDay && drag ? Math.min(drag.startSlot, drag.currentSlot) : 0
            const dragBottom = isDragDay && drag ? Math.max(drag.startSlot, drag.currentSlot) : 0
            return (
              <div
                key={dayIdx}
                className="relative border-l cursor-crosshair"
                style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
                onPointerDown={(e) => onPointerDown(e, dayIdx)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
              >
                {Array.from({ length: HOURS }).map((_, h) => (
                  <div key={h} style={{ top: h * SLOT_HEIGHT * SLOTS_PER_HOUR, height: SLOT_HEIGHT * SLOTS_PER_HOUR }}
                    className="absolute left-0 right-0 border-t border-muted/40 pointer-events-none" />
                ))}
                {dayPositions.map(p => {
                  const isBlock = p.override.kind === 'block'
                  const isSelected = selected?.id === p.override.id
                  return (
                    <button
                      key={p.override.id + '-' + p.dayIdx}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setSelected(p.override) }}
                      style={{ top: p.topSlot * SLOT_HEIGHT, height: (p.bottomSlot - p.topSlot) * SLOT_HEIGHT }}
                      className={`absolute left-0.5 right-0.5 rounded text-xs px-1.5 text-left transition-shadow ${
                        isBlock
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      } ${isSelected ? 'ring-2 ring-sky-500 z-10' : 'hover:shadow-md'}`}
                    >
                      <div className="font-medium truncate">
                        {isBlock ? 'Blockiert' : 'Frei'}
                      </div>
                      <div className="opacity-70 truncate">
                        {p.override.reason ?? `${fmtTime(p.topSlot)}–${fmtTime(p.bottomSlot)}`}
                      </div>
                    </button>
                  )
                })}
                {isDragDay && drag && dragBottom > dragTop && (
                  <div
                    className={`absolute left-0.5 right-0.5 rounded border-2 border-dashed pointer-events-none ${
                      pendingKind === 'block'
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-emerald-500 bg-emerald-500/20'
                    }`}
                    style={{ top: dragTop * SLOT_HEIGHT, height: (dragBottom - dragTop) * SLOT_HEIGHT }}
                  >
                    <div className="text-[10px] px-1 font-medium">
                      {fmtTime(dragTop)}–{fmtTime(dragBottom)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selected.kind === 'block'
                  ? <Ban className="h-4 w-4 text-red-600" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                <span className="font-medium text-sm">
                  {selected.kind === 'block' ? 'Blockiert' : 'Zusaetzlich frei'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Schliessen
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(selected.startAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(selected.endAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
            <ReasonEditor row={selected} onSaved={(updated) => {
              onChange(overrides.map(o => o.id === updated.id ? updated : o))
              setSelected(updated)
            }} />
            <Button variant="destructive" size="sm" onClick={() => deleteOverride(selected.id)} disabled={busy}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Loeschen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReasonEditor({ row, onSaved }: { row: OverrideRow; onSaved: (r: OverrideRow) => void }) {
  const [reason, setReason] = useState(row.reason ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setReason(row.reason ?? '') }, [row.id, row.reason])

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/overrides/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null }),
      })
      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      const { override } = await res.json()
      onSaved(override)
      toast.success('Gespeichert')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="reason-edit" className="text-xs">Grund (optional)</Label>
      <div className="flex gap-2">
        <Input id="reason-edit" value={reason} placeholder="z. B. Urlaub"
          onChange={e => setReason(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          disabled={busy} />
      </div>
    </div>
  )
}

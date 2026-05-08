'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Ban, CheckCircle2, ChevronLeft, ChevronRight, Calendar, Lock } from 'lucide-react'
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
const RESIZE_HANDLE_PX = 6

export interface AppointmentRow {
  id: string
  startAt: string
  endAt: string
  customerName: string
  slotTypeName: string
  color: string
}

export interface ExternalBusyRow {
  id: string
  startAt: string
  endAt: string
  summary: string | null
}

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

interface SegPosition<T> {
  item: T
  dayIdx: number
  topSlot: number
  bottomSlot: number
}

function rangeToPositions<T extends { startAt: string; endAt: string }>(
  item: T,
  weekStart: Date,
): SegPosition<T>[] {
  const start = new Date(item.startAt)
  const end = new Date(item.endAt)
  const result: SegPosition<T>[] = []
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
    result.push({ item, dayIdx, topSlot, bottomSlot })
  }
  return result
}

function slotToDate(weekStart: Date, dayIdx: number, slot: number): Date {
  const d = addDays(weekStart, dayIdx)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(slot * SLOT_MINUTES + HOUR_START * 60)
  return d
}

type DragState =
  | { kind: 'create'; dayIdx: number; startSlot: number; currentSlot: number }
  | { kind: 'move'; overrideId: string; originalTop: number; originalBottom: number; originalDay: number; offsetSlot: number; previewTop: number; previewDay: number }
  | { kind: 'resize-top' | 'resize-bottom'; overrideId: string; originalTop: number; originalBottom: number; dayIdx: number; previewTop: number; previewBottom: number }

export function BlockCalendarEditor({ overrides, onChange, appointments, externalBusy }: {
  overrides: OverrideRow[]
  onChange: (next: OverrideRow[]) => void
  appointments: AppointmentRow[]
  externalBusy: ExternalBusyRow[]
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [pendingKind, setPendingKind] = useState<'block' | 'free'>('block')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<OverrideRow | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const overridePositions = useMemo(() => {
    return overrides.flatMap(o => rangeToPositions(o, weekStart))
  }, [overrides, weekStart])

  const appointmentPositions = useMemo(() => {
    return appointments.flatMap(a => rangeToPositions(a, weekStart))
  }, [appointments, weekStart])

  const externalBusyPositions = useMemo(() => {
    return externalBusy.flatMap(e => rangeToPositions(e, weekStart))
  }, [externalBusy, weekStart])

  function localSlot(e: React.PointerEvent<HTMLDivElement>, snapMode: 'floor' | 'round' = 'floor'): number {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw = (e.clientY - rect.top) / SLOT_HEIGHT
    const fn = snapMode === 'round' ? Math.round : Math.floor
    return Math.max(0, Math.min(TOTAL_SLOTS, fn(raw)))
  }

  function dayUnderPointer(e: React.PointerEvent): number | null {
    if (!gridRef.current) return null
    const cols = gridRef.current.querySelectorAll<HTMLDivElement>('[data-day-col]')
    for (let i = 0; i < cols.length; i++) {
      const r = cols[i].getBoundingClientRect()
      if (e.clientX >= r.left && e.clientX <= r.right) return i
    }
    return null
  }

  function onColPointerDown(e: React.PointerEvent<HTMLDivElement>, dayIdx: number) {
    if (busy) return
    if ((e.target as HTMLElement).closest('[data-block]')) return // Block-Click hat eigenen Handler
    e.currentTarget.setPointerCapture(e.pointerId)
    const slot = localSlot(e)
    setDrag({ kind: 'create', dayIdx, startSlot: slot, currentSlot: slot })
  }

  function onBlockPointerDown(e: React.PointerEvent<HTMLButtonElement>, pos: SegPosition<OverrideRow>) {
    if (busy) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetWithinBlock = e.clientY - rect.top
    const offsetSlot = Math.floor(offsetWithinBlock / SLOT_HEIGHT)
    // Resize-Edges am oberen / unteren Rand erkennen
    if (offsetWithinBlock < RESIZE_HANDLE_PX) {
      setDrag({
        kind: 'resize-top',
        overrideId: pos.item.id,
        originalTop: pos.topSlot,
        originalBottom: pos.bottomSlot,
        dayIdx: pos.dayIdx,
        previewTop: pos.topSlot,
        previewBottom: pos.bottomSlot,
      })
    } else if (rect.height - offsetWithinBlock < RESIZE_HANDLE_PX) {
      setDrag({
        kind: 'resize-bottom',
        overrideId: pos.item.id,
        originalTop: pos.topSlot,
        originalBottom: pos.bottomSlot,
        dayIdx: pos.dayIdx,
        previewTop: pos.topSlot,
        previewBottom: pos.bottomSlot,
      })
    } else {
      setDrag({
        kind: 'move',
        overrideId: pos.item.id,
        originalTop: pos.topSlot,
        originalBottom: pos.bottomSlot,
        originalDay: pos.dayIdx,
        offsetSlot,
        previewTop: pos.topSlot,
        previewDay: pos.dayIdx,
      })
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    if (drag.kind === 'create') {
      const slot = localSlot(e, 'round')
      setDrag({ ...drag, currentSlot: slot })
      return
    }
    if (drag.kind === 'move') {
      // Day-Wechsel ueber clientX
      const targetDay = dayUnderPointer(e) ?? drag.previewDay
      const slot = localSlot(e)
      const top = Math.max(0, Math.min(TOTAL_SLOTS - (drag.originalBottom - drag.originalTop), slot - drag.offsetSlot))
      setDrag({ ...drag, previewTop: top, previewDay: targetDay })
      return
    }
    // Resize
    const slot = localSlot(e, 'round')
    if (drag.kind === 'resize-top') {
      const newTop = Math.max(0, Math.min(drag.originalBottom - 1, slot))
      setDrag({ ...drag, previewTop: newTop })
    } else {
      const newBottom = Math.min(TOTAL_SLOTS, Math.max(drag.originalTop + 1, slot))
      setDrag({ ...drag, previewBottom: newBottom })
    }
  }

  async function onPointerUp() {
    if (!drag) return
    const current = drag
    setDrag(null)
    if (current.kind === 'create') {
      const top = Math.min(current.startSlot, current.currentSlot)
      const bottom = Math.max(current.startSlot, current.currentSlot)
      if (bottom - top < 1) return
      const startAt = slotToDate(weekStart, current.dayIdx, top)
      const endAt = slotToDate(weekStart, current.dayIdx, bottom)
      await createOverride(startAt, endAt, pendingKind)
      return
    }
    if (current.kind === 'move') {
      if (current.previewTop === current.originalTop && current.previewDay === current.originalDay) return
      const length = current.originalBottom - current.originalTop
      const startAt = slotToDate(weekStart, current.previewDay, current.previewTop)
      const endAt = slotToDate(weekStart, current.previewDay, current.previewTop + length)
      await patchOverride(current.overrideId, { startAt, endAt })
      return
    }
    // Resize
    if (current.previewTop === current.originalTop && current.previewBottom === current.originalBottom) return
    const startAt = slotToDate(weekStart, current.dayIdx, current.previewTop)
    const endAt = slotToDate(weekStart, current.dayIdx, current.previewBottom)
    await patchOverride(current.overrideId, { startAt, endAt })
  }

  async function createOverride(startAt: Date, endAt: Date, kind: 'block' | 'free') {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), kind, reason: null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { override } = await res.json()
      onChange([...overrides, override].sort((a, b) => a.startAt.localeCompare(b.startAt)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function patchOverride(id: string, patch: { startAt?: Date; endAt?: Date; reason?: string | null }) {
    setBusy(true)
    try {
      const body: Record<string, unknown> = {}
      if (patch.startAt) body.startAt = patch.startAt.toISOString()
      if (patch.endAt) body.endAt = patch.endAt.toISOString()
      if (patch.reason !== undefined) body.reason = patch.reason
      const res = await fetch(`/api/v1/availability/overrides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Update fehlgeschlagen')
      const { override } = await res.json()
      onChange(overrides.map(o => o.id === id ? override : o))
      if (selected?.id === id) setSelected(override)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function deleteOverride(id: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/overrides/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Loeschen fehlgeschlagen')
      onChange(overrides.filter(o => o.id !== id))
      setSelected(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

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

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Klick &amp; ziehen: neuer Block</span>
        <span>·</span>
        <span>Block ziehen: verschieben (auch zwischen Tagen)</span>
        <span>·</span>
        <span>Obere/untere Kante: Dauer aendern</span>
        <span>·</span>
        <span>Klick: Details</span>
      </div>

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
            const dayOverrides = overridePositions.filter(p => p.dayIdx === dayIdx)
            const dayAppts = appointmentPositions.filter(p => p.dayIdx === dayIdx)
            const dayBusy = externalBusyPositions.filter(p => p.dayIdx === dayIdx)
            const isCreatingHere = drag?.kind === 'create' && drag.dayIdx === dayIdx
            const isMovingHere = drag?.kind === 'move' && drag.previewDay === dayIdx
            const isResizingHere = (drag?.kind === 'resize-top' || drag?.kind === 'resize-bottom') && drag.dayIdx === dayIdx
            return (
              <div
                key={dayIdx}
                data-day-col
                className="relative border-l cursor-crosshair"
                style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
                onPointerDown={(e) => onColPointerDown(e, dayIdx)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
              >
                {Array.from({ length: HOURS }).map((_, h) => (
                  <div key={h} style={{ top: h * SLOT_HEIGHT * SLOTS_PER_HOUR, height: SLOT_HEIGHT * SLOTS_PER_HOUR }}
                    className="absolute left-0 right-0 border-t border-muted/40 pointer-events-none" />
                ))}

                {/* Read-only overlay: external busy (Google) */}
                {dayBusy.map(p => (
                  <div
                    key={'busy-' + p.item.id + '-' + p.dayIdx}
                    style={{ top: p.topSlot * SLOT_HEIGHT, height: (p.bottomSlot - p.topSlot) * SLOT_HEIGHT }}
                    className="absolute left-0 right-0 bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 text-[10px] px-1 pointer-events-none"
                  >
                    <Lock className="h-3 w-3 inline mr-0.5" />
                    {p.item.summary ?? 'Extern'}
                  </div>
                ))}

                {/* Read-only overlay: confirmed appointments */}
                {dayAppts.map(p => (
                  <div
                    key={'appt-' + p.item.id + '-' + p.dayIdx}
                    style={{
                      top: p.topSlot * SLOT_HEIGHT,
                      height: (p.bottomSlot - p.topSlot) * SLOT_HEIGHT,
                      borderLeftColor: p.item.color || '#3b82f6',
                    }}
                    className="absolute left-0 right-0 bg-sky-50/80 dark:bg-sky-950/30 border-l-4 text-[10px] px-1 pointer-events-none text-sky-900 dark:text-sky-200"
                  >
                    <div className="font-medium truncate">{p.item.customerName}</div>
                    <div className="opacity-70 truncate">{p.item.slotTypeName}</div>
                  </div>
                ))}

                {/* Editable: overrides */}
                {dayOverrides.map(p => {
                  const isBlock = p.item.kind === 'block'
                  const isSelected = selected?.id === p.item.id
                  const isBeingDragged = drag && 'overrideId' in drag && drag.overrideId === p.item.id
                  // Falls Block gerade gedragged wird: Original ausblenden, Preview wird separat gerendert
                  if (isBeingDragged) return null
                  return (
                    <button
                      key={p.item.id + '-' + p.dayIdx}
                      data-block
                      onPointerDown={(e) => onBlockPointerDown(e, p)}
                      onClick={(e) => { e.stopPropagation(); setSelected(p.item) }}
                      style={{ top: p.topSlot * SLOT_HEIGHT, height: (p.bottomSlot - p.topSlot) * SLOT_HEIGHT }}
                      className={`absolute left-0.5 right-0.5 rounded text-xs px-1.5 text-left transition-shadow cursor-grab active:cursor-grabbing ${
                        isBlock
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      } ${isSelected ? 'ring-2 ring-sky-500 z-10' : 'hover:shadow-md'}`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize" />
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize" />
                      <div className="font-medium truncate pointer-events-none">
                        {isBlock ? 'Blockiert' : 'Frei'}
                      </div>
                      <div className="opacity-70 truncate pointer-events-none">
                        {p.item.reason ?? `${fmtTime(p.topSlot)}–${fmtTime(p.bottomSlot)}`}
                      </div>
                    </button>
                  )
                })}

                {/* Drag-Preview: create */}
                {isCreatingHere && drag.kind === 'create' && (() => {
                  const top = Math.min(drag.startSlot, drag.currentSlot)
                  const bottom = Math.max(drag.startSlot, drag.currentSlot)
                  if (bottom <= top) return null
                  return (
                    <div
                      className={`absolute left-0.5 right-0.5 rounded border-2 border-dashed pointer-events-none ${
                        pendingKind === 'block' ? 'border-red-500 bg-red-500/20' : 'border-emerald-500 bg-emerald-500/20'
                      }`}
                      style={{ top: top * SLOT_HEIGHT, height: (bottom - top) * SLOT_HEIGHT }}
                    >
                      <div className="text-[10px] px-1 font-medium">{fmtTime(top)}–{fmtTime(bottom)}</div>
                    </div>
                  )
                })()}

                {/* Drag-Preview: move */}
                {isMovingHere && drag.kind === 'move' && (() => {
                  const length = drag.originalBottom - drag.originalTop
                  const top = drag.previewTop
                  const bottom = top + length
                  return (
                    <div
                      className="absolute left-0.5 right-0.5 rounded border-2 border-sky-500 bg-sky-500/20 pointer-events-none"
                      style={{ top: top * SLOT_HEIGHT, height: length * SLOT_HEIGHT }}
                    >
                      <div className="text-[10px] px-1 font-medium">{fmtTime(top)}–{fmtTime(bottom)}</div>
                    </div>
                  )
                })()}

                {/* Drag-Preview: resize */}
                {isResizingHere && (drag.kind === 'resize-top' || drag.kind === 'resize-bottom') && (() => {
                  const top = drag.previewTop
                  const bottom = drag.previewBottom
                  return (
                    <div
                      className="absolute left-0.5 right-0.5 rounded border-2 border-sky-500 bg-sky-500/20 pointer-events-none"
                      style={{ top: top * SLOT_HEIGHT, height: (bottom - top) * SLOT_HEIGHT }}
                    >
                      <div className="text-[10px] px-1 font-medium">{fmtTime(top)}–{fmtTime(bottom)}</div>
                    </div>
                  )
                })()}
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
    if ((reason || null) === (row.reason ?? null)) return
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

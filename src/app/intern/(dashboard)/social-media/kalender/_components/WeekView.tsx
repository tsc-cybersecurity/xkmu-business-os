'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOUR_START = 6
const HOUR_END = 23
const SLOT_MINUTES = 30
const HOURS = HOUR_END - HOUR_START
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES
const TOTAL_SLOTS = HOURS * SLOTS_PER_HOUR
const SLOT_HEIGHT = 18
const POST_DEFAULT_SLOTS = 1 // 30 min visuell

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
  instagram: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-800',
  linkedin: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800',
  x: 'bg-neutral-200 text-neutral-900 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600',
  twitter: 'bg-neutral-200 text-neutral-900 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600',
  xing: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
}

export interface WeekPost {
  id: string
  platform: string
  title: string | null
  content: string
  scheduledAt: string | null
  postedAt: string | null
  status: string | null
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

function postPosition(p: WeekPost, weekStart: Date): { dayIdx: number; topSlot: number } | null {
  // Direct-gepostete Posts haben kein scheduledAt — postedAt als Fallback.
  const effectiveAt = p.scheduledAt ?? p.postedAt
  if (!effectiveAt) return null
  const at = new Date(effectiveAt)
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dayStart = addDays(weekStart, dayIdx)
    const dayEnd = addDays(dayStart, 1)
    if (at >= dayStart && at < dayEnd) {
      const minutes = (at.getTime() - dayStart.getTime()) / 60000 - HOUR_START * 60
      const topSlot = minutes / SLOT_MINUTES
      if (topSlot < 0 || topSlot >= TOTAL_SLOTS) return null
      return { dayIdx, topSlot }
    }
  }
  return null
}

function slotToDate(weekStart: Date, dayIdx: number, slot: number): Date {
  const d = addDays(weekStart, dayIdx)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(slot * SLOT_MINUTES + HOUR_START * 60)
  return d
}

function isLocked(status: string | null): boolean {
  return status === 'posted'
}

interface DragState {
  postId: string
  originalDay: number
  originalTop: number
  offsetSlot: number
  previewDay: number
  previewTop: number
}

export function WeekView({ scheduled, backlog, onChanged }: {
  scheduled: WeekPost[]
  backlog: WeekPost[]
  onChanged: () => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [busy, setBusy] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const positions = useMemo(() => {
    const arr: Array<{ post: WeekPost; dayIdx: number; topSlot: number }> = []
    for (const p of scheduled) {
      const pos = postPosition(p, weekStart)
      if (pos) arr.push({ post: p, ...pos })
    }
    return arr
  }, [scheduled, weekStart])

  function localSlot(e: React.PointerEvent<HTMLElement>): number {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(TOTAL_SLOTS - POST_DEFAULT_SLOTS, Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)))
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

  function onPostPointerDown(e: React.PointerEvent<HTMLButtonElement>, post: WeekPost, dayIdx: number, topSlot: number) {
    if (busy || isLocked(post.status)) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetSlot = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)
    setDrag({
      postId: post.id,
      originalDay: dayIdx,
      originalTop: topSlot,
      offsetSlot,
      previewDay: dayIdx,
      previewTop: topSlot,
    })
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const targetDay = dayUnderPointer(e) ?? drag.previewDay
    const slot = localSlot(e)
    setDrag({ ...drag, previewDay: targetDay, previewTop: slot })
  }

  async function onPointerUp() {
    if (!drag) return
    const current = drag
    setDrag(null)
    if (current.previewDay === current.originalDay && current.previewTop === current.originalTop) return
    const newAt = slotToDate(weekStart, current.previewDay, current.previewTop)
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/social-media/posts/${current.postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newAt.toISOString(), status: 'scheduled' }),
      })
      if (!res.ok) throw new Error('update_failed')
      toast.success(`Verschoben auf ${newAt.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`)
      onChanged()
    } catch {
      toast.error('Verschieben fehlgeschlagen')
    } finally { setBusy(false) }
  }

  // HTML5 Drop-Target fuer Backlog-Items (die haben kein scheduledAt, also
  // nutzen wir HTML5-DnD analog zur Monatsansicht — Pointer-Events sind nur
  // fuer In-Calendar-Move).
  const [hoverSlot, setHoverSlot] = useState<{ dayIdx: number; topSlot: number } | null>(null)

  function onDayDragOver(e: React.DragEvent<HTMLDivElement>, dayIdx: number) {
    if (!e.dataTransfer.types.includes('text/x-post-id')) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const slot = Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)))
    setHoverSlot({ dayIdx, topSlot: slot })
  }

  async function onDayDrop(e: React.DragEvent<HTMLDivElement>, dayIdx: number) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/x-post-id')
    setHoverSlot(null)
    if (!id) return
    const rect = e.currentTarget.getBoundingClientRect()
    const slot = Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)))
    const at = slotToDate(weekStart, dayIdx, slot)
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/social-media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: at.toISOString(), status: 'scheduled' }),
      })
      if (!res.ok) throw new Error('update_failed')
      toast.success(`Geplant fuer ${at.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`)
      onChanged()
    } catch {
      toast.error('Anlegen fehlgeschlagen')
    } finally { setBusy(false) }
  }

  async function onBacklogDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/x-post-id')
    if (!id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/social-media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: null, status: 'draft' }),
      })
      if (!res.ok) throw new Error('update_failed')
      toast.success('Zurueck in den Backlog')
      onChanged()
    } catch {
      toast.error('Verschieben fehlgeschlagen')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-xs px-2 py-1 rounded border hover:bg-muted"
            >
              Heute
            </button>
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="text-xs px-2 py-1 rounded border hover:bg-muted"
            >
              ← Woche
            </button>
            <span className="text-sm font-medium px-2 min-w-[180px] text-center">
              {fmtDate(weekStart)} – {fmtDate(addDays(weekStart, 6))}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="text-xs px-2 py-1 rounded border hover:bg-muted"
            >
              Woche →
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Im Kalender ziehen: Tag &amp; Uhrzeit aendern. Aus dem Backlog ziehen: einplanen.
          </p>
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
              const dayPositions = positions.filter(p => p.dayIdx === dayIdx)
              const isMovingHere = drag?.previewDay === dayIdx
              const showHover = hoverSlot?.dayIdx === dayIdx
              return (
                <div
                  key={dayIdx}
                  data-day-col
                  className="relative border-l"
                  style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  onDragOver={(e) => onDayDragOver(e, dayIdx)}
                  onDragLeave={() => setHoverSlot(null)}
                  onDrop={(e) => onDayDrop(e, dayIdx)}
                >
                  {Array.from({ length: HOURS }).map((_, h) => (
                    <div key={h} style={{ top: h * SLOT_HEIGHT * SLOTS_PER_HOUR, height: SLOT_HEIGHT * SLOTS_PER_HOUR }}
                      className="absolute left-0 right-0 border-t border-muted/40 pointer-events-none" />
                  ))}

                  {dayPositions.map(({ post, topSlot }) => {
                    const locked = isLocked(post.status)
                    const isDragged = drag?.postId === post.id
                    if (isDragged) return null
                    const platformClass = PLATFORM_COLORS[post.platform] ?? 'bg-muted text-foreground border-border'
                    const titleText = post.title || post.content.slice(0, 60)
                    const effectiveAt = post.scheduledAt ?? post.postedAt
                    const time = effectiveAt
                      ? new Date(effectiveAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                      : null
                    return (
                      <button
                        key={post.id}
                        onPointerDown={(e) => onPostPointerDown(e, post, dayIdx, topSlot)}
                        style={{ top: topSlot * SLOT_HEIGHT, height: POST_DEFAULT_SLOTS * SLOT_HEIGHT * 2 }}
                        className={`absolute left-0.5 right-0.5 rounded border text-left text-[10px] px-1.5 py-0.5 ${platformClass} ${
                          locked
                            ? 'opacity-50 grayscale cursor-not-allowed'
                            : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                        }`}
                        title={`${post.platform} · ${post.status} · ${titleText}`}
                      >
                        <div className="flex items-center gap-1 font-medium">
                          {locked && <Lock className="h-3 w-3" />}
                          <span className="capitalize">{post.platform}</span>
                          {time && <span className="opacity-70">{time}</span>}
                        </div>
                        <div className="truncate">{titleText}</div>
                        <Link
                          href={`/intern/social-media/${post.id}`}
                          className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Beitrag oeffnen"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </button>
                    )
                  })}

                  {/* Drag-Preview (in-calendar move) */}
                  {isMovingHere && drag && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded border-2 border-sky-500 bg-sky-500/20 pointer-events-none text-[10px] px-1"
                      style={{ top: drag.previewTop * SLOT_HEIGHT, height: POST_DEFAULT_SLOTS * SLOT_HEIGHT * 2 }}
                    >
                      {fmtTime(drag.previewTop)}
                    </div>
                  )}

                  {/* Hover-Preview (HTML5-Drop von Backlog) */}
                  {showHover && hoverSlot && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded border-2 border-dashed border-emerald-500 bg-emerald-500/15 pointer-events-none text-[10px] px-1"
                      style={{ top: hoverSlot.topSlot * SLOT_HEIGHT, height: POST_DEFAULT_SLOTS * SLOT_HEIGHT * 2 }}
                    >
                      {fmtTime(hoverSlot.topSlot)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Card
        onDragOver={(e) => { if (e.dataTransfer.types.includes('text/x-post-id')) e.preventDefault() }}
        onDrop={onBacklogDrop}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Backlog (Entwuerfe)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {backlog.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Keine Entwuerfe ohne Datum.
            </p>
          ) : (
            backlog.map((post) => {
              const platformClass = PLATFORM_COLORS[post.platform] ?? 'bg-muted text-foreground border-border'
              const titleText = post.title || post.content.slice(0, 60)
              return (
                <div
                  key={post.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/x-post-id', post.id); e.dataTransfer.effectAllowed = 'move' }}
                  className={`rounded border ${platformClass} px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{post.platform}</span>
                  </div>
                  <div className="line-clamp-2">{titleText}</div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface CalendarPost {
  id: string
  platform: string
  title: string | null
  content: string
  imageUrl: string | null
  scheduledAt: string | null
  postedAt: string | null
  status: string | null
  topicName: string | null
  topicColor: string | null
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
  instagram: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-800',
  linkedin: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800',
  x: 'bg-neutral-200 text-neutral-900 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600',
  twitter: 'bg-neutral-200 text-neutral-900 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600',
  xing: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  posted: 'Gepostet',
  failed: 'Fehlgeschlagen',
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
}

// Mo=0..So=6 (statt JS-Default So=0)
function dowMon(d: Date): number {
  return (d.getDay() + 6) % 7
}

function buildMonthGrid(month: Date): Date[][] {
  const first = startOfMonth(month)
  const lead = dowMon(first)
  const start = new Date(first)
  start.setDate(first.getDate() - lead)

  const weeks: Date[][] = []
  const cur = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function fmtDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameMonth(d: Date, ref: Date): boolean {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function SocialMediaCalendarPage() {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [scheduled, setScheduled] = useState<CalendarPost[]>([])
  const [backlog, setBacklog] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const grid = buildMonthGrid(month)
      const from = grid[0][0]
      const to = new Date(grid[grid.length - 1][6])
      to.setDate(to.getDate() + 1)
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      const res = await fetch(`/api/v1/social-media/posts/calendar?${params}`)
      const data = await res.json()
      if (data.success) {
        setScheduled(data.data.scheduled)
        setBacklog(data.data.backlog)
      }
    } catch (err) {
      logger.error('Failed to load calendar data', err, { module: 'SocialMediaCalendar' })
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>()
    for (const p of scheduled) {
      if (!p.scheduledAt) continue
      const key = fmtDayKey(new Date(p.scheduledAt))
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return map
  }, [scheduled])

  const grid = useMemo(() => buildMonthGrid(month), [month])

  const handleDragStart = (id: string) => {
    setDraggingId(id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    if (dropTarget !== targetKey) setDropTarget(targetKey)
  }

  const handleDropOnDay = async (e: React.DragEvent, day: Date) => {
    e.preventDefault()
    const id = draggingId
    setDraggingId(null)
    setDropTarget(null)
    if (!id) return

    // Vorhandene Uhrzeit beibehalten falls scheduled, sonst 09:00 default.
    const existing = scheduled.find((p) => p.id === id) || backlog.find((p) => p.id === id)
    const next = new Date(day)
    if (existing?.scheduledAt) {
      const prev = new Date(existing.scheduledAt)
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
    } else {
      next.setHours(9, 0, 0, 0)
    }

    try {
      const res = await fetch(`/api/v1/social-media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: next.toISOString(),
          status: existing?.status === 'posted' ? 'posted' : 'scheduled',
        }),
      })
      if (!res.ok) throw new Error('update_failed')
      toast.success(`Verschoben auf ${day.toLocaleDateString('de-DE')}`)
      fetchData()
    } catch {
      toast.error('Verschieben fehlgeschlagen')
    }
  }

  const handleDropOnBacklog = async (e: React.DragEvent) => {
    e.preventDefault()
    const id = draggingId
    setDraggingId(null)
    setDropTarget(null)
    if (!id) return

    try {
      const res = await fetch(`/api/v1/social-media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: null, status: 'draft' }),
      })
      if (!res.ok) throw new Error('update_failed')
      toast.success('In Backlog verschoben')
      fetchData()
    } catch {
      toast.error('Verschieben fehlgeschlagen')
    }
  }

  const monthLabel = month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const today = new Date()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Posting-Kalender</h1>
          <p className="text-muted-foreground text-sm">
            Geplante Beiträge per Drag-Drop verschieben.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Vorheriger Monat"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center font-medium">{monthLabel}</div>
          <Button variant="outline" size="icon" aria-label="Nächster Monat"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(startOfMonth(today))}
            disabled={isSameMonth(today, month)}
          >
            Heute
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <div key={d} className="px-2 py-1.5 text-center">{d}</div>
                ))}
              </div>
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                  {week.map((day) => {
                    const key = fmtDayKey(day)
                    const inMonth = isSameMonth(day, month)
                    const dayPosts = postsByDay.get(key) ?? []
                    const isHover = dropTarget === key
                    return (
                      <div
                        key={key}
                        onDragOver={(e) => handleDragOver(e, key)}
                        onDrop={(e) => handleDropOnDay(e, day)}
                        className={`min-h-[120px] border-r last:border-r-0 p-1.5 flex flex-col gap-1 ${
                          inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground'
                        } ${isHover ? 'ring-2 ring-inset ring-primary' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isToday(day) ? 'font-bold text-primary' : ''}`}>
                            {day.getDate()}
                          </span>
                          {dayPosts.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{dayPosts.length}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {dayPosts.map((p) => (
                            <PostCard key={p.id} post={p} onDragStart={handleDragStart} onDragEnd={handleDragEnd} compact />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <Card
          onDragOver={(e) => handleDragOver(e, '__backlog__')}
          onDrop={handleDropOnBacklog}
          className={dropTarget === '__backlog__' ? 'ring-2 ring-primary' : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Backlog (Entwürfe)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {backlog.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Keine Entwürfe ohne Datum. Hierher ziehen, um zu entplanen.
              </p>
            ) : (
              backlog.map((p) => (
                <PostCard key={p.id} post={p} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// PostCard
// ----------------------------------------------------------------------------

function PostCard({
  post,
  onDragStart,
  onDragEnd,
  compact,
}: {
  post: CalendarPost
  onDragStart: (id: string) => void
  onDragEnd: () => void
  compact?: boolean
}) {
  const platformClass = PLATFORM_COLORS[post.platform] ?? 'bg-muted text-foreground border-border'
  const time = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null
  const titleText = post.title || post.content.slice(0, 60)
  const isPosted = post.status === 'posted'
  const isFailed = post.status === 'failed'

  return (
    <div
      draggable={!isPosted}
      onDragStart={() => onDragStart(post.id)}
      onDragEnd={onDragEnd}
      className={`group rounded border ${platformClass} ${
        isPosted ? 'opacity-60' : ''
      } ${isFailed ? 'border-destructive' : ''} ${
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1.5 text-xs'
      } cursor-${isPosted ? 'default' : 'grab'} active:cursor-grabbing relative`}
      title={`${post.platform} · ${STATUS_LABELS[post.status ?? 'draft'] ?? post.status} · ${titleText}`}
    >
      <div className="flex items-center gap-1">
        <span className="capitalize font-medium">{post.platform}</span>
        {time && <span className="opacity-70">{time}</span>}
      </div>
      <div className="line-clamp-2">{titleText}</div>
      <Link
        href={`/intern/social-media/${post.id}`}
        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
        aria-label="Beitrag öffnen"
      >
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  )
}

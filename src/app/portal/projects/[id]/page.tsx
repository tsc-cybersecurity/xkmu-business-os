'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Briefcase, CheckCircle2, Calendar } from 'lucide-react'

interface PortalTask {
  id: string
  title: string
  description: string | null
  columnId: string | null
  position: number | null
  priority: string | null
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  labels: string[] | null
  status: 'done' | 'open'
}

interface ProjectColumn {
  id: string
  name: string
  color?: string
}

interface ProjectDetail {
  id: string
  name: string
  description: string | null
  status: string | null
  priority: string | null
  projectType: string | null
  startDate: string | null
  endDate: string | null
  tags: string[] | null
  color: string | null
  columns: ProjectColumn[] | null
  tasks: PortalTask[]
}

const STATUS_UI: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Aktiv', variant: 'default' },
  completed: { label: 'Abgeschlossen', variant: 'secondary' },
  on_hold: { label: 'Pausiert', variant: 'outline' },
}

const PRIORITY_DOT: Record<string, string> = {
  hoch: 'bg-red-500',
  mittel: 'bg-amber-500',
  niedrig: 'bg-emerald-500',
  kritisch: 'bg-red-700',
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
}

export default function PortalProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/v1/portal/me/projects/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.success) setData(d.data)
        else setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (notFound || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Projekt nicht gefunden.</p>
          <Button variant="outline" asChild>
            <Link href="/portal/projects"><ArrowLeft className="h-4 w-4 mr-2" />Zur Liste</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sc = (data.status && STATUS_UI[data.status]) ?? null
  const columns = data.columns || []
  const knownColumnIds = new Set(columns.map((c) => c.id))
  const orphanTasks = data.tasks.filter((t) => !t.columnId || !knownColumnIds.has(t.columnId))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/projects"><ArrowLeft className="h-4 w-4 mr-2" />Zurück</Link>
        </Button>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          {data.name}
        </h1>
        {sc && <Badge variant={sc.variant}>{sc.label}</Badge>}
      </div>

      {data.description && (
        <p className="text-muted-foreground">{data.description}</p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Eckdaten</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Priorität</dt>
              <dd className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${(data.priority && PRIORITY_DOT[data.priority]) ?? 'bg-muted-foreground'}`} />
                {data.priority || '—'}
              </dd>
            </div>
            <div><dt className="text-muted-foreground">Laufzeit</dt><dd>{formatDate(data.startDate)} – {formatDate(data.endDate)}</dd></div>
            <div><dt className="text-muted-foreground">Aufgaben gesamt</dt><dd>{data.tasks.length}</dd></div>
            {data.tags && data.tags.length > 0 && (
              <div className="md:col-span-3">
                <dt className="text-muted-foreground mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {data.tags.map((t) => <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>)}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Kanban read-only */}
      {data.tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Noch keine Aufgaben in diesem Projekt.
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => {
            const colTasks = data.tasks.filter((t) => t.columnId === col.id)
            return <KanbanColumn key={col.id} name={col.name} color={col.color} tasks={colTasks} />
          })}
          {orphanTasks.length > 0 && (
            <KanbanColumn name="Ohne Spalte" color="#94a3b8" tasks={orphanTasks} />
          )}
        </div>
      )}
    </div>
  )
}

function KanbanColumn({ name, color, tasks }: { name: string; color?: string; tasks: PortalTask[] }) {
  return (
    <div className="shrink-0 w-72 space-y-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="h-2 w-2 rounded-full" style={{ background: color || '#94a3b8' }} />
        <h3 className="text-sm font-medium">{name}</h3>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">Keine Aufgaben</p>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: PortalTask }) {
  const dot = (task.priority && PRIORITY_DOT[task.priority]) ?? null
  return (
    <div className="rounded-md border bg-card p-3 text-sm space-y-2">
      <div className="flex items-start gap-2">
        {dot && <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${dot}`} />}
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-snug">{task.title}</div>
          {task.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</div>
          )}
        </div>
        {task.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
      </div>
      {(task.dueDate || (task.labels && task.labels.length > 0)) && (
        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('de-DE')}
            </span>
          )}
          {task.labels && task.labels.map((l) => (
            <Badge key={l} variant="outline" className="text-xs font-normal">{l}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}

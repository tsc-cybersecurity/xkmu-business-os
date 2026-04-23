'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Briefcase, ListChecks, Calendar } from 'lucide-react'

interface ProjectRow {
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
  taskCount: number
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

export default function PortalProjectsListPage() {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/portal/me/projects')
      .then(r => r.json())
      .then(d => { if (d?.success) setRows(d.data || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Projekte
        </h1>
        <p className="text-muted-foreground">Laufende und abgeschlossene Projekte</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Es liegen derzeit keine Projekte für Ihre Firma vor.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => {
            const sc = (p.status && STATUS_UI[p.status]) ?? null
            const dot = (p.priority && PRIORITY_DOT[p.priority]) ?? 'bg-muted-foreground'
            return (
              <Link key={p.id} href={`/portal/projects/${p.id}`} className="block">
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                      {sc && <Badge variant={sc.variant} className="shrink-0">{sc.label}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {p.description && (
                      <p className="text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {p.priority || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {p.taskCount} {p.taskCount === 1 ? 'Aufgabe' : 'Aufgaben'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    </div>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

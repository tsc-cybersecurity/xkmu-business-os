'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import { AlertCircle, ChevronLeft, Download, FileSpreadsheet, GraduationCap } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface ComplianceRow {
  userId: string
  email: string
  name: string
  courseId: string
  courseTitle: string
  courseSlug: string
  dueDate: string | null
  assignedAt: string
  status: 'pending' | 'completed' | 'overdue'
  completedLessons: number
  totalLessons: number
  percentage: number
  groupNames: string[]
}

interface GroupOption { id: string; name: string; description: string | null; memberCount: number }

const ALL = '__all__'

export function ComplianceReportView() {
  const [rows, setRows] = useState<ComplianceRow[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [groupFilter, setGroupFilter] = useState<string>(ALL)
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (groupFilter !== ALL) params.set('groupId', groupFilter)
      const [rRes, gRes] = await Promise.all([
        fetch(`/api/v1/elearning/reports/compliance?${params}`).then((r) => r.json()),
        fetch('/api/v1/user-groups').then((r) => r.json()),
      ])
      if (rRes.success) setRows(rRes.data)
      if (gRes.success) setGroups(gRes.data)
    } catch (err) {
      logger.error('Compliance report load failed', err, { module: 'ComplianceReportView' })
    } finally {
      setLoading(false)
    }
  }, [groupFilter])

  useEffect(() => { void load() }, [load])

  const filtered = rows.filter((r) => statusFilter === ALL || r.status === statusFilter)

  const counts = {
    total: rows.length,
    completed: rows.filter((r) => r.status === 'completed').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
  }

  const csvUrl = (() => {
    const params = new URLSearchParams()
    params.set('format', 'csv')
    if (groupFilter !== ALL) params.set('groupId', groupFilter)
    return `/api/v1/elearning/reports/compliance?${params}`
  })()

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/intern/elearning">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück zur Kursliste
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" />
            Compliance-Bericht
          </h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Pflichtkurse mit Frist und aktuellem Fortschritt.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href={csvUrl} download>
            <Download className="mr-2 h-4 w-4" />
            CSV exportieren
          </a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard title="Zuweisungen gesamt" value={counts.total} />
        <SummaryCard title="Erledigt" value={counts.completed} variant="success" />
        <SummaryCard title="In Arbeit" value={counts.pending} />
        <SummaryCard title="Überfällig" value={counts.overdue} variant="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span>Pflichtzuweisungen</span>
            <div className="flex gap-2">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Gruppe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alle Gruppen</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alle Status</SelectItem>
                  <SelectItem value="pending">In Arbeit</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                  <SelectItem value="completed">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Keine Daten"
              description={
                rows.length === 0
                  ? 'Es bestehen aktuell keine Pflichtzuweisungen. Lege im Kurs unter „Zuweisungen" eine an.'
                  : 'Mit den aktuellen Filtern werden keine Zuweisungen angezeigt.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Benutzer:in</th>
                    <th className="py-2 pr-4">Kurs</th>
                    <th className="py-2 pr-4">Frist</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Fortschritt</th>
                    <th className="py-2 pr-4">Gruppen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.userId}:${r.courseId}`} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/intern/elearning/${r.courseId}`}
                          className="hover:underline"
                        >
                          {r.courseTitle}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-xs">
                        {r.dueDate
                          ? new Date(r.dueDate).toLocaleDateString('de-DE')
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {r.status === 'overdue' ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Überfällig
                          </Badge>
                        ) : r.status === 'completed' ? (
                          <Badge className="text-xs bg-green-600">Erledigt</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">In Arbeit</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${r.percentage}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">
                            {r.completedLessons}/{r.totalLessons} ({r.percentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {r.groupNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.groupNames.map((g) => (
                              <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title, value, variant,
}: { title: string; value: number; variant?: 'success' | 'danger' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
        <div
          className={
            'mt-1 text-3xl font-semibold tabular-nums ' +
            (variant === 'danger' ? 'text-destructive' : variant === 'success' ? 'text-green-600' : '')
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

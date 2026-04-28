'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import { AlertCircle, Check, Download, Minus, FileSpreadsheet } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface ReportLesson { id: string; title: string; position: number; moduleId: string | null }
interface ReportRow {
  userId: string
  email: string
  name: string
  source: Array<'assigned' | 'granted' | 'progress'>
  perLesson: Record<string, { completedAt: string | null }>
  quizScores: Record<string, { bestScore: number; passed: boolean } | null>
  totalLessons: number
  completedLessons: number
  percentage: number
  lastActivity: string | null
  assignment: { dueDate: string | null; status: 'pending' | 'completed' | 'overdue' } | null
}
interface Report { course: { id: string; title: string; slug: string }; lessons: ReportLesson[]; rows: ReportRow[] }

export function CourseReportTab({ courseId }: { courseId: string }) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/report`).then((r) => r.json())
      if (res.success) setReport(res.data)
    } catch (err) {
      logger.error('Course report load failed', err, { module: 'CourseReportTab' })
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { void load() }, [load])

  if (loading) return <LoadingSpinner />
  if (!report) return null

  if (report.rows.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Noch keine Daten"
        description="Sobald Benutzer:innen den Kurs zugewiesen bekommen, freigeschaltet sind oder Lektionen erledigen, erscheinen hier ihre Fortschritte."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/v1/courses/${courseId}/report?format=csv`} download>
            <Download className="mr-2 h-4 w-4" />
            CSV exportieren
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fortschritt pro Benutzer:in ({report.rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 sticky left-0 bg-background">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Fortschritt</th>
                  <th className="py-2 pr-4">Letzte Aktivität</th>
                  {report.lessons.map((l) => (
                    <th key={l.id} className="py-2 pr-3 text-center whitespace-nowrap" title={l.title}>
                      {`L${l.position}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const overdue = r.assignment?.status === 'overdue'
                  return (
                    <tr key={r.userId} className="border-b last:border-0">
                      <td className="py-2 pr-4 sticky left-0 bg-background">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                        <div className="flex gap-1 mt-1">
                          {r.source.includes('assigned') && (
                            <Badge variant="outline" className="text-[10px]">Pflicht</Badge>
                          )}
                          {r.source.includes('granted') && (
                            <Badge variant="outline" className="text-[10px]">Berechtigt</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {r.assignment ? (
                          overdue ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" /> Überfällig
                            </Badge>
                          ) : r.assignment.status === 'completed' ? (
                            <Badge className="text-xs bg-green-600">Erledigt</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">In Arbeit</Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {r.assignment?.dueDate && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Frist {new Date(r.assignment.dueDate).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${r.percentage}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">
                            {r.completedLessons}/{r.totalLessons}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString('de-DE') : '—'}
                      </td>
                      {report.lessons.map((l) => {
                        const completed = !!r.perLesson[l.id]?.completedAt
                        const quiz = r.quizScores[l.id]
                        return (
                          <td key={l.id} className="py-2 pr-3 text-center">
                            {completed ? (
                              quiz ? (
                                <span
                                  className={
                                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] tabular-nums ' +
                                    (quiz.passed
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800')
                                  }
                                  title={`Quiz best: ${quiz.bestScore}%`}
                                >
                                  <Check className="h-3 w-3" />
                                  {quiz.bestScore}%
                                </span>
                              ) : (
                                <Check className="h-4 w-4 mx-auto text-green-600" />
                              )
                            ) : quiz ? (
                              <span className="text-[10px] text-yellow-700">
                                {quiz.bestScore}%
                              </span>
                            ) : (
                              <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

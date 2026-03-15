'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface ChecklistProgress {
  checklistId: number
  name: string
  slug: string
  priority: number
  sortOrder: number
  total: number
  answered: number
  ja: number
  nein: number
  nichtRelevant: number
  completionPercent: number
}

interface ProgressData {
  totalQuestions: number
  answeredJa: number
  answeredNein: number
  answeredNichtRelevant: number
  unanswered: number
  completionPercent: number
  implementationPercent: number
  checklistProgress: ChecklistProgress[]
  priorityProgress: Record<number, {
    total: number
    answered: number
    ja: number
    nein: number
    completionPercent: number
  }>
}

interface Prueffrage {
  id: number
  checklistId: number
  questionNumber: number
  questionText: string
  hilfsmittel: string | null
  aufwandKategorie: number | null
  grundschutzRef: string | null
}

interface AnswerItem {
  prueffrageId: number
  answer: string
  notizen: string | null
}

interface Assessment {
  id: string
  name: string
}

const priorityLabels: Record<number, string> = {
  1: 'Prioritaet 1 (Hoechste)',
  2: 'Prioritaet 2 (Hoch)',
  3: 'Prioritaet 3 (Mittel)',
  4: 'Prioritaet 4 (Niedrig)',
}

const aufwandLabels: Record<number, string> = {
  1: 'Gering',
  2: 'Mittel',
  3: 'Hoch',
  4: 'Sehr hoch',
}

const aufwandColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  3: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  4: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [allPrueffragen, setAllPrueffragen] = useState<Prueffrage[]>([])
  const [allAnswers, setAllAnswers] = useState<AnswerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'priority' | 'aufwand'>('priority')

  const fetchData = useCallback(async () => {
    try {
      const [assessmentRes, progressRes, answersRes, checklistsRes] = await Promise.all([
        fetch(`/api/v1/wiba/assessments/${id}`),
        fetch(`/api/v1/wiba/assessments/${id}/progress`),
        fetch(`/api/v1/wiba/assessments/${id}/answers`),
        fetch('/api/v1/wiba/checklists'),
      ])

      const assessmentData = await assessmentRes.json()
      const progressData = await progressRes.json()
      const answersData = await answersRes.json()
      const checklistsData = await checklistsRes.json()

      if (assessmentData.success) setAssessment(assessmentData.data)
      if (progressData.success) setProgress(progressData.data)
      if (answersData.success) setAllAnswers(answersData.data)

      // Load all prueffragen from all checklists
      if (checklistsData.success) {
        const allChecklists = checklistsData.data
        const prueffragenPromises = allChecklists.map((cl: { id: number }) =>
          fetch(`/api/v1/wiba/checklists/${cl.id}`).then(r => r.json())
        )
        const clResults = await Promise.all(prueffragenPromises)
        const allFragen: Prueffrage[] = []
        for (const result of clResults) {
          if (result.success && result.data.prueffragen) {
            allFragen.push(...result.data.prueffragen)
          }
        }
        setAllPrueffragen(allFragen)
      }
    } catch (error) {
      logger.error('Failed to fetch report data', error, { module: 'CybersecurityBasisabsicherungReportPage' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!assessment || !progress) {
    return <p className="text-muted-foreground">Bericht nicht verfuegbar.</p>
  }

  // Build answer map
  const answerMap = new Map(allAnswers.map((a) => [a.prueffrageId, a]))

  // Get "Nein" answers grouped by checklist & priority
  const neinPrueffragen = allPrueffragen
    .filter((f) => {
      const answer = answerMap.get(f.id)
      return answer && answer.answer === 'nein'
    })
    .map((f) => {
      const cl = progress.checklistProgress.find((c) => c.checklistId === f.checklistId)
      return {
        ...f,
        checklistName: cl?.name || '',
        priority: cl?.priority || 4,
        notizen: answerMap.get(f.id)?.notizen || null,
      }
    })

  // Sort nein items
  const sortedNein = [...neinPrueffragen].sort((a, b) => {
    if (sortBy === 'priority') {
      if (a.priority !== b.priority) return a.priority - b.priority
      return (a.aufwandKategorie || 4) - (b.aufwandKategorie || 4)
    } else {
      // Sort by aufwand ascending (quick wins first)
      if ((a.aufwandKategorie || 4) !== (b.aufwandKategorie || 4)) {
        return (a.aufwandKategorie || 4) - (b.aufwandKategorie || 4)
      }
      return a.priority - b.priority
    }
  })

  // Group by priority for display
  const neinByPriority = new Map<number, typeof sortedNein>()
  if (sortBy === 'priority') {
    for (const item of sortedNein) {
      const existing = neinByPriority.get(item.priority) || []
      existing.push(item)
      neinByPriority.set(item.priority, existing)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/intern/cybersecurity/basisabsicherung/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Bericht: {assessment.name}</h1>
          <p className="text-muted-foreground">Auswertung der Basisabsicherung</p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Gesamtfortschritt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold">{progress.completionPercent}%</div>
              <p className="text-sm text-muted-foreground">Bearbeitung</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{progress.implementationPercent}%</div>
              <p className="text-sm text-muted-foreground">Umsetzungsgrad</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-red-600">{progress.answeredNein}</div>
              <p className="text-sm text-muted-foreground">Massnahmen erforderlich</p>
            </div>
          </div>
          <div className="flex gap-6 justify-center text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {progress.answeredJa} Ja
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              {progress.answeredNein} Nein
            </span>
            <span className="text-muted-foreground">{progress.answeredNichtRelevant} Nicht relevant</span>
            <span className="text-muted-foreground">{progress.unanswered} Offen</span>
          </div>
        </CardContent>
      </Card>

      {/* Priority Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Fortschritt nach Prioritaet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((p) => {
            const pp = progress.priorityProgress[p]
            if (!pp) return null
            return (
              <div key={p}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{priorityLabels[p]}</span>
                  <span className="font-medium">
                    {pp.ja} Ja / {pp.nein} Nein / {pp.answered} von {pp.total} beantwortet
                  </span>
                </div>
                <Progress value={pp.completionPercent} className="h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Checklists Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Checklisten-Uebersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Checkliste</th>
                  <th className="text-center py-2 px-2">Prio</th>
                  <th className="text-center py-2 px-2">Gesamt</th>
                  <th className="text-center py-2 px-2 text-green-600">Ja</th>
                  <th className="text-center py-2 px-2 text-red-600">Nein</th>
                  <th className="text-center py-2 px-2">N/R</th>
                  <th className="text-center py-2 px-2">Offen</th>
                  <th className="text-right py-2 pl-4">Fortschritt</th>
                </tr>
              </thead>
              <tbody>
                {progress.checklistProgress.map((cl) => (
                  <tr key={cl.checklistId} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{cl.name}</td>
                    <td className="text-center py-2 px-2">
                      <Badge variant="outline" className="text-xs">P{cl.priority}</Badge>
                    </td>
                    <td className="text-center py-2 px-2">{cl.total}</td>
                    <td className="text-center py-2 px-2 text-green-600">{cl.ja}</td>
                    <td className="text-center py-2 px-2 text-red-600">{cl.nein}</td>
                    <td className="text-center py-2 px-2">{cl.nichtRelevant}</td>
                    <td className="text-center py-2 px-2">{cl.total - cl.answered}</td>
                    <td className="text-right py-2 pl-4">{cl.completionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Items (Nein answers) */}
      {sortedNein.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Massnahmenliste ({sortedNein.length})
                </CardTitle>
                <CardDescription>
                  Alle Prueffragen mit &quot;Nein&quot; - hier besteht Handlungsbedarf
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'priority' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('priority')}
                >
                  Nach Prioritaet
                </Button>
                <Button
                  variant={sortBy === 'aufwand' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('aufwand')}
                >
                  Quick Wins zuerst
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortBy === 'priority' ? (
              // Grouped by priority
              <div className="space-y-6">
                {[1, 2, 3, 4].map((p) => {
                  const items = neinByPriority.get(p)
                  if (!items || items.length === 0) return null
                  return (
                    <div key={p}>
                      <h3 className="font-semibold text-sm mb-3">{priorityLabels[p]} ({items.length})</h3>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{item.checklistName}</Badge>
                                  {item.aufwandKategorie && (
                                    <Badge className={`text-xs ${aufwandColors[item.aufwandKategorie]}`}>
                                      Aufwand: {aufwandLabels[item.aufwandKategorie]}
                                    </Badge>
                                  )}
                                  {item.grundschutzRef && (
                                    <Badge variant="secondary" className="text-xs">{item.grundschutzRef}</Badge>
                                  )}
                                </div>
                                <p className="text-sm">{item.questionText}</p>
                                {item.notizen && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    Notiz: {item.notizen}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Flat list sorted by aufwand
              <div className="space-y-3">
                {sortedNein.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">P{item.priority}</Badge>
                          <Badge variant="outline" className="text-xs">{item.checklistName}</Badge>
                          {item.aufwandKategorie && (
                            <Badge className={`text-xs ${aufwandColors[item.aufwandKategorie]}`}>
                              Aufwand: {aufwandLabels[item.aufwandKategorie]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{item.questionText}</p>
                        {item.notizen && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Notiz: {item.notizen}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

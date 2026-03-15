'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, FileText, Loader2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'
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

interface Assessment {
  id: string
  name: string
  description: string | null
  companyName: string | null
  status: string | null
  createdAt: string
}

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-800' },
  2: { label: 'P2', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-800' },
  3: { label: 'P3', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' },
  4: { label: 'P4', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700' },
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
}

export default function AssessmentDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [assessmentRes, progressRes] = await Promise.all([
        fetch(`/api/v1/wiba/assessments/${id}`),
        fetch(`/api/v1/wiba/assessments/${id}/progress`),
      ])
      const assessmentData = await assessmentRes.json()
      const progressData = await progressRes.json()

      if (assessmentData.success) setAssessment(assessmentData.data)
      if (progressData.success) setProgress(progressData.data)
    } catch (error) {
      logger.error('Failed to fetch assessment', error, { module: 'CybersecurityBasisabsicherungPage' })
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
    return <p className="text-muted-foreground">Assessment nicht gefunden.</p>
  }

  const getChecklistStatus = (cl: ChecklistProgress) => {
    if (cl.answered === 0) return 'not_started'
    if (cl.answered >= cl.total) return 'completed'
    return 'in_progress'
  }

  const getChecklistStatusLabel = (status: string) => {
    switch (status) {
      case 'not_started': return 'Nicht gestartet'
      case 'in_progress': return 'In Bearbeitung'
      case 'completed': return 'Abgeschlossen'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/intern/cybersecurity/basisabsicherung">
            <Button variant="ghost" size="icon" aria-label="Zurueck">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{assessment.name}</h1>
            <p className="text-muted-foreground">
              {assessment.companyName && <>{assessment.companyName}</>}
              {assessment.companyName && assessment.description && ' - '}
              {assessment.description && <>{assessment.description}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{statusLabels[assessment.status || 'draft']}</Badge>
          {progress.answeredJa + progress.answeredNein > 0 && (
            <Link href={`/intern/cybersecurity/basisabsicherung/${id}/report`}>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Bericht
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fortschritt</p>
                <p className="text-2xl font-bold">{progress.completionPercent}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{progress.totalQuestions - progress.unanswered}/{progress.totalQuestions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ja-Antworten</p>
                <p className="text-2xl font-bold text-green-600">{progress.answeredJa}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Massnahmenbedarf</p>
                <p className="text-2xl font-bold text-red-600">{progress.answeredNein}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offene Fragen</p>
                <p className="text-2xl font-bold">{progress.unanswered}</p>
              </div>
              <HelpCircle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Fortschritt nach Prioritaet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((p) => {
            const pp = progress.priorityProgress[p]
            if (!pp) return null
            const cfg = priorityConfig[p]
            return (
              <div key={p}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={`${cfg.color} text-xs`}>
                      {cfg.label}
                    </Badge>
                    <span>Prioritaet {p}</span>
                  </span>
                  <span className="font-medium">{pp.answered} / {pp.total} ({pp.completionPercent}%)</span>
                </div>
                <Progress value={pp.completionPercent} className="h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Checklist Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Checklisten</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progress.checklistProgress.map((cl) => {
            const cfg = priorityConfig[cl.priority]
            const status = getChecklistStatus(cl)

            return (
              <Link
                key={cl.checklistId}
                href={`/intern/cybersecurity/basisabsicherung/${id}/checklist/${cl.checklistId}`}
              >
                <Card className={`transition-shadow hover:shadow-md cursor-pointer border ${cfg.bg}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{cl.name}</CardTitle>
                      <Badge variant="outline" className={`${cfg.color} text-xs`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{getChecklistStatusLabel(status)}</span>
                      <span>{cl.answered} / {cl.total}</span>
                    </div>
                    <Progress value={cl.completionPercent} className="h-1.5" />
                    {cl.answered > 0 && (
                      <div className="flex gap-3 text-xs pt-1">
                        <span className="text-green-600">{cl.ja} Ja</span>
                        {cl.nein > 0 && <span className="text-red-600">{cl.nein} Nein</span>}
                        {cl.nichtRelevant > 0 && <span className="text-muted-foreground">{cl.nichtRelevant} N/R</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

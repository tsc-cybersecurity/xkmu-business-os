'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Briefcase, Loader2, Square, Play, Trash2, RefreshCcw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { ScoreGauge } from './_components/score-gauge'
import { CanvasView } from './_components/canvas-view'
import { KfwView } from './_components/kfw-view'
import { SimulationView } from './_components/simulation-view'
import { AnalysisView } from './_components/analysis-view'
import { IterationTimeline, type IterationRow } from './_components/iteration-timeline'

interface BusinessPlan {
  id: string
  title: string
  mode: 'canvas' | 'kfw' | 'both'
  inputType: 'quick' | 'briefing'
  seedInput: Record<string, unknown>
  currentIteration: number
  maxIterations: number
  scoreThreshold: number
  finalScore: number | null
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
  error: string | null
  createdAt: string | null
}

interface PlanDetailResponse {
  plan: BusinessPlan
  iterations: IterationRow[]
}

const STATUS_BADGE: Record<BusinessPlan['status'], string> = {
  idle: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700 animate-pulse',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  stopped: 'bg-amber-100 text-amber-700',
}

const STATUS_LABEL: Record<BusinessPlan['status'], string> = {
  idle: 'Bereit',
  running: 'Läuft',
  completed: 'Fertig',
  failed: 'Fehler',
  stopped: 'Gestoppt',
}

const POLL_MS = 5_000

export default function BusinessPlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<PlanDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)

  const fetchPlan = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/business-plans/${id}`)
      const json = await response.json()
      if (json.success) {
        setData(json.data)
      } else {
        toast.error(json.error?.message || 'Plan konnte nicht geladen werden')
      }
    } catch (err) {
      logger.error('Fetch plan failed', err, { module: 'BusinessPlanDetailPage' })
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPlan().finally(() => setLoading(false))
  }, [id, fetchPlan])

  // Polling solange Plan running ist
  useEffect(() => {
    if (data?.plan.status !== 'running') return
    const interval = setInterval(fetchPlan, POLL_MS)
    return () => clearInterval(interval)
  }, [data?.plan.status, fetchPlan])

  const handleStop = async () => {
    if (!confirm('Plan-Lauf wirklich stoppen?')) return
    setActionPending(true)
    try {
      const response = await fetch(`/api/v1/business-plans/${id}/stop`, { method: 'POST' })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Plan gestoppt')
        fetchPlan()
      } else {
        toast.error(json.error?.message || 'Stop fehlgeschlagen')
      }
    } finally {
      setActionPending(false)
    }
  }

  const handleIterate = async () => {
    setActionPending(true)
    try {
      const response = await fetch(`/api/v1/business-plans/${id}/iterate`, { method: 'POST' })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Iteration angestoßen')
        fetchPlan()
      } else {
        toast.error(json.error?.message || 'Anstoßen fehlgeschlagen')
      }
    } finally {
      setActionPending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Plan inkl. aller Iterationen wirklich löschen?')) return
    setActionPending(true)
    try {
      const response = await fetch(`/api/v1/business-plans/${id}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({ success: response.ok }))
      if (response.ok && json.success !== false) {
        toast.success('Plan gelöscht')
        router.push('/intern/business-plans')
      } else {
        toast.error(json.error?.message || 'Löschen fehlgeschlagen')
      }
    } finally {
      setActionPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Plan nicht gefunden</p>
        <Link href="/intern/business-plans">
          <Button variant="link">Zurück zur Liste</Button>
        </Link>
      </div>
    )
  }

  const { plan, iterations } = data
  // Aktuelle (letzte erfolgreich abgeschlossene) Iteration für die Top-Level-Tabs
  const latestDone = iterations
    .filter((it) => it.status === 'done')
    .sort((a, b) => b.iterationNumber - a.iterationNumber)[0]
  const latestAny = iterations.sort((a, b) => b.iterationNumber - a.iterationNumber)[0]
  const currentIter = latestDone ?? latestAny

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Link href="/intern/business-plans">
            <Button variant="ghost" size="icon" aria-label="Zurück">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              {plan.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={STATUS_BADGE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
              <Badge variant="secondary">{plan.mode}</Badge>
              <span className="text-sm text-muted-foreground font-mono">
                Iteration {plan.currentIteration}/{plan.maxIterations}
              </span>
              <span className="text-sm text-muted-foreground">
                · Ziel-Score {plan.scoreThreshold}
              </span>
            </div>
            {plan.error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1 max-w-xl">
                {plan.error}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ScoreGauge score={plan.finalScore} threshold={plan.scoreThreshold} size={110} />
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={fetchPlan} disabled={actionPending}>
              <RefreshCcw className="h-3 w-3 mr-1.5" /> Aktualisieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/v1/business-plans/${id}/export.pdf`, '_blank')}
              disabled={actionPending || plan.currentIteration === 0}
              title={plan.currentIteration === 0 ? 'Noch keine Iteration durchgelaufen' : 'Plan als PDF exportieren'}
            >
              <Download className="h-3 w-3 mr-1.5" /> PDF
            </Button>
            {plan.status === 'running' ? (
              <Button variant="outline" size="sm" onClick={handleStop} disabled={actionPending}>
                <Square className="h-3 w-3 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleIterate} disabled={actionPending}>
                <Play className="h-3 w-3 mr-1.5" /> Weiter iterieren
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={actionPending} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-3 w-3 mr-1.5" /> Löschen
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="iterations">Iterationen ({iterations.length})</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4 mt-4">
          {!currentIter ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Plan wird gerade generiert — komm gleich wieder.
              </CardContent>
            </Card>
          ) : (
            <>
              {(plan.mode === 'canvas' || plan.mode === 'both') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lean Canvas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CanvasView canvas={currentIter.planCanvas as Parameters<typeof CanvasView>[0]['canvas']} />
                  </CardContent>
                </Card>
              )}
              {(plan.mode === 'kfw' || plan.mode === 'both') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">KfW-Langform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KfwView markdown={currentIter.planKfwMarkdown} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="iterations" className="mt-4">
          <IterationTimeline iterations={iterations} />
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          {currentIter ? (
            <SimulationView
              request={currentIter.simulationRequest}
              result={currentIter.simulationResult as Parameters<typeof SimulationView>[0]['result']}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">Noch keine Simulation gelaufen.</p>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          {currentIter ? (
            <AnalysisView analysis={currentIter.analysis as Parameters<typeof AnalysisView>[0]['analysis']} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Noch keine Analyse vorhanden.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

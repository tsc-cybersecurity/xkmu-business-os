'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { CanvasView } from './canvas-view'
import { KfwView } from './kfw-view'
import { SimulationView } from './simulation-view'
import { AnalysisView } from './analysis-view'

export interface IterationRow {
  id: string
  iterationNumber: number
  planCanvas: unknown
  planKfwMarkdown: string | null
  simulationRequest: unknown
  simulationResult: unknown
  analysis: unknown
  durationMs: number | null
  status: 'pending' | 'generating' | 'simulating' | 'analyzing' | 'done' | 'failed'
  error: string | null
  createdAt: string | null
  updatedAt: string | null
}

const STATUS_CFG: Record<IterationRow['status'], { label: string; cls: string }> = {
  pending: { label: 'Wartet', cls: 'bg-gray-100 text-gray-700' },
  generating: { label: 'Generiert', cls: 'bg-blue-100 text-blue-700 animate-pulse' },
  simulating: { label: 'Simuliert', cls: 'bg-purple-100 text-purple-700 animate-pulse' },
  analyzing: { label: 'Analysiert', cls: 'bg-amber-100 text-amber-700 animate-pulse' },
  done: { label: 'Fertig', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Fehler', cls: 'bg-red-100 text-red-700' },
}

export function IterationTimeline({ iterations }: { iterations: IterationRow[] }) {
  if (iterations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Noch keine Iteration gelaufen — der Worker pickt den Plan in den nächsten Sekunden.
      </p>
    )
  }

  // Sortiere descending — neueste Iteration zuerst
  const sorted = [...iterations].sort((a, b) => b.iterationNumber - a.iterationNumber)

  // Score-Verlauf-Sparkline (oldest → newest)
  const scores = [...iterations]
    .sort((a, b) => a.iterationNumber - b.iterationNumber)
    .map((it) => (it.analysis as { score?: number } | null)?.score ?? null)

  return (
    <div className="space-y-4">
      {scores.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Score-Verlauf (Iter 1 → letzte)</div>
            <Sparkline scores={scores} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((iter) => (
          <IterationRowComponent key={iter.id} iter={iter} />
        ))}
      </div>
    </div>
  )
}

function Sparkline({ scores }: { scores: Array<number | null> }) {
  const validScores = scores.filter((s): s is number => s !== null)
  if (validScores.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Noch kein Score vorhanden.</p>
  }
  return (
    <div className="flex items-end gap-1.5 h-12">
      {scores.map((s, i) => {
        const h = s === null ? 4 : Math.max(4, (s / 100) * 48)
        const color = s === null
          ? 'bg-muted'
          : s >= 80 ? 'bg-green-500'
          : s >= 60 ? 'bg-amber-500'
          : 'bg-red-500'
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[20px]">
            <div className={`w-full ${color} rounded-sm`} style={{ height: `${h}px` }} />
            <span className="text-[10px] font-mono text-muted-foreground">{s ?? '–'}</span>
          </div>
        )
      })}
    </div>
  )
}

function IterationRowComponent({ iter }: { iter: IterationRow }) {
  const [open, setOpen] = useState(iter.iterationNumber === 1 && iter.status === 'done')
  const cfg = STATUS_CFG[iter.status]
  const score = (iter.analysis as { score?: number } | null)?.score
  const isRunning = ['generating', 'simulating', 'analyzing'].includes(iter.status)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">Iteration {iter.iterationNumber}</span>
          <Badge className={`${cfg.cls} flex items-center gap-1`}>
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {iter.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
            {iter.status === 'failed' && <AlertCircle className="h-3 w-3" />}
            {cfg.label}
          </Badge>
          {score !== undefined && (
            <Badge variant="outline" className="font-mono">Score {score}</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {iter.durationMs ? `${(iter.durationMs / 1000).toFixed(1)}s` : '–'}
        </div>
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 space-y-4 border-t">
          {iter.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-md">
              <strong>Fehler:</strong> {iter.error}
            </div>
          )}

          {Boolean(iter.planCanvas) && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Plan (Canvas)</h4>
              <CanvasView canvas={iter.planCanvas as Parameters<typeof CanvasView>[0]['canvas']} />
            </div>
          )}

          {iter.planKfwMarkdown && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Plan (KfW-Langform)</h4>
              <KfwView markdown={iter.planKfwMarkdown} />
            </div>
          )}

          {Boolean(iter.simulationResult) && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Mirofish-Simulation</h4>
              <SimulationView
                request={iter.simulationRequest}
                result={iter.simulationResult as Parameters<typeof SimulationView>[0]['result']}
              />
            </div>
          )}

          {Boolean(iter.analysis) && (
            <div>
              <h4 className="font-medium mb-2 text-sm">KI-Analyse</h4>
              <AnalysisView analysis={iter.analysis as Parameters<typeof AnalysisView>[0]['analysis']} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

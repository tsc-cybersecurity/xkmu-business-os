'use client'

/**
 * RunDetailView — Client-Component mit 5s-Polling solange Run nicht terminal.
 * Polling via chained setTimeout (clean cancellation).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7 (Run-Detail-Page)
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RunDagView } from './run-dag-view'
import { RunCostBreakdown } from './run-cost-breakdown'
import { ManualTriggers } from './manual-triggers'

interface RunDetail {
  run: {
    id: string
    goalId: string
    status: string
    startedAt: string
    finishedAt: string | null
    lastError: string | null
    costCents: number
    inputTokens: number
    outputTokens: number
    attempt: number
  }
  steps: Array<{
    id: string
    stepKey: string
    workerType: string
    status: string
    dependsOnStepKeys: string[]
    resultSummary: string | null
    error: string | null
  }>
  costEvents: Array<{
    id: string
    callRole: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    costCents: number
    occurredAt: string
  }>
}

const TERMINAL_STATUSES = ['succeeded', 'failed', 'cancelled']

export function RunDetailView({ runId }: { runId: string }) {
  const [data, setData] = useState<RunDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const r = await fetch(`/api/agents/runs/${runId}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j: RunDetail = await r.json()
        if (!alive) return
        setData(j)
        setError(null)
        if (!TERMINAL_STATUSES.includes(j.run.status) && alive) {
          timer = setTimeout(tick, 5000)
        }
      } catch (e) {
        if (alive) setError((e as Error).message)
      }
    }

    void tick()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [runId])

  if (error) return <div className="text-destructive">Fehler: {error}</div>
  if (!data) return <div className="text-muted-foreground">Lade Run...</div>

  const failedStepIds = data.steps.filter((s) => s.status === 'failed').map((s) => s.id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Run {data.run.id.slice(0, 8)} · Attempt {data.run.attempt}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Status: <Badge>{data.run.status}</Badge></div>
          <div>Started: {new Date(data.run.startedAt).toLocaleString('de-DE')}</div>
          {data.run.finishedAt && (
            <div>Finished: {new Date(data.run.finishedAt).toLocaleString('de-DE')}</div>
          )}
          <div>
            Cost: {data.run.costCents} Cent · {(data.run.inputTokens + data.run.outputTokens).toLocaleString('de-DE')} Tokens
          </div>
          {data.run.lastError && (
            <div className="text-destructive">Fehler: {data.run.lastError}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aktionen</CardTitle></CardHeader>
        <CardContent>
          <ManualTriggers
            runId={data.run.id}
            goalId={data.run.goalId}
            failedStepIds={failedStepIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan-DAG</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <RunDagView steps={data.steps} />
        </CardContent>
      </Card>

      <RunCostBreakdown events={data.costEvents} />

      <Card>
        <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.steps.map((s) => (
              <div key={s.id} className="border rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{s.status}</Badge>
                  <strong>{s.stepKey}</strong>
                  <span className="text-muted-foreground">({s.workerType})</span>
                </div>
                {s.resultSummary && (
                  <div className="text-muted-foreground">{s.resultSummary}</div>
                )}
                {s.error && (
                  <div className="text-destructive mt-1">{s.error}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

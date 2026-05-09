'use client'

/**
 * ManualTriggers — Buttons fuer sofortige Agent-Aktionen.
 * - Re-Plan jetzt: POST /api/agents/runs/[id]/replan-now
 * - Goal jetzt ausfuehren: POST /api/agents/goals/[id]/run-immediate
 * - Step retry (pro fehlgeschlagenem Step): POST /api/agents/steps/[id]/retry
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.4 (Manual-Trigger-Hooks)
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  runId?: string
  goalId?: string
  failedStepIds?: string[]
}

async function postJson(url: string): Promise<void> {
  const r = await fetch(url, { method: 'POST' })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
}

export function ManualTriggers({ runId, goalId, failedStepIds = [] }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const replanNow = async () => {
    if (!runId) return
    setLoading('replan')
    try {
      await postJson(`/api/agents/runs/${runId}/replan-now`)
      toast.success('Replan-Task gequeued')
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  const runImmediate = async () => {
    if (!goalId) return
    setLoading('immediate')
    try {
      await postJson(`/api/agents/goals/${goalId}/run-immediate`)
      toast.success('Goal auf executionMode=immediate gesetzt + Replan gequeued')
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  const retryStep = async (stepId: string) => {
    setLoading(`retry-${stepId}`)
    try {
      await postJson(`/api/agents/steps/${stepId}/retry`)
      toast.success(`Step ${stepId.slice(0, 8)} wieder gequeued`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {runId && (
        <Button size="sm" variant="outline" onClick={replanNow} disabled={loading !== null}>
          {loading === 'replan' ? '...' : 'Re-Plan jetzt'}
        </Button>
      )}
      {goalId && (
        <Button size="sm" variant="outline" onClick={runImmediate} disabled={loading !== null}>
          {loading === 'immediate' ? '...' : 'Goal jetzt ausfuehren'}
        </Button>
      )}
      {failedStepIds.map((sid) => (
        <Button key={sid} size="sm" variant="outline" onClick={() => retryStep(sid)} disabled={loading !== null}>
          {loading === `retry-${sid}` ? '...' : `Step ${sid.slice(0, 6)} retry`}
        </Button>
      ))}
    </div>
  )
}

/**
 * Worker Service — fuehrt einzelne agent_steps deterministisch aus.
 * Phase 3: deterministisch, kein Smart-Worker (kommt in Phase 5).
 *
 * Ablauf:
 *   1. Lade Step + Run + Goal
 *   2. Budget-Check via CostTracker
 *   3. Expandiere contextRefs via MemoryService.expandRefs (im Step.config einmischen)
 *   4. Resolve Tool via ToolRegistry.parseRef + invoke
 *   5. Persistiere Result (resultJson, resultSummary, status)
 *   6. Cost-Event schreiben
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.5
 */

import type { WorkerResult } from './types'

const RESULT_SUMMARY_MAX = 500

function deriveResultSummary(output: unknown, error?: string): string {
  if (error) return `FEHLER: ${error}`.slice(0, RESULT_SUMMARY_MAX)
  if (output == null) return ''
  if (typeof output === 'string') return output.slice(0, RESULT_SUMMARY_MAX)
  if (typeof output === 'object') {
    // Versuche text-Felder zu finden
    const obj = output as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text.slice(0, RESULT_SUMMARY_MAX)
    if (typeof obj.summary === 'string') return obj.summary.slice(0, RESULT_SUMMARY_MAX)
    return JSON.stringify(output).slice(0, RESULT_SUMMARY_MAX)
  }
  return String(output).slice(0, RESULT_SUMMARY_MAX)
}

export const WorkerService = {
  async executeStep(stepId: string): Promise<WorkerResult> {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')
    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    const { MemoryService } = await import('./memory.service')
    const { CostTrackerService } = await import('./cost-tracker.service')

    initializeToolRegistry()

    const [step] = await db.select().from(agentSteps).where(eq(agentSteps.id, stepId)).limit(1)
    if (!step) {
      throw new Error(`agent_step ${stepId} nicht gefunden`)
    }

    // Budget-Check
    const budget = await CostTrackerService.checkBudget(step.goalId)
    if (budget.exceeded) {
      const errMsg = `Budget exceeded: ${budget.reason} (${budget.spentTokens}/${budget.budgetTokens} tokens, ${budget.spentCents}/${budget.budgetCents} cents)`
      await db
        .update(agentSteps)
        .set({
          status: 'failed',
          error: errMsg,
          finishedAt: sql`now()`,
          updatedAt: sql`now()`,
          resultSummary: errMsg.slice(0, RESULT_SUMMARY_MAX),
        })
        .where(eq(agentSteps.id, stepId))
      return { status: 'failed', error: errMsg, resultSummary: errMsg.slice(0, RESULT_SUMMARY_MAX) }
    }

    // Step auf running setzen
    await db
      .update(agentSteps)
      .set({ status: 'running', startedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(agentSteps.id, stepId))

    // Refs expandieren — Inhalt fliesst in input.expandedRefs ein
    const refs = Array.isArray(step.contextRefs) ? (step.contextRefs as string[]) : []
    let expanded: Array<{ ref: string; title: string | null; body: string }> = []
    if (refs.length > 0) {
      try {
        expanded = await MemoryService.expandRefs(
          refs.filter((r): r is `memory://${string}` => r.startsWith('memory://')),
        )
      } catch {
        // expansion-Fehler nicht-fatal; tool kann ohne refs laufen
      }
    }

    // Tool resolve + invoke
    const ref = ToolRegistry.parseRef(step.workerType)
    const config = (step.config as Record<string, unknown>) ?? {}
    const toolInput: Record<string, unknown> = {
      ...config,
      _expandedRefs: expanded.length > 0 ? expanded : undefined,
    }

    const startTime = Date.now()
    const result = await ToolRegistry.invoke({
      ref,
      input: toolInput,
      context: { runId: step.runId, stepId: step.id, goalId: step.goalId },
    })
    const durationMs = Date.now() - startTime

    // Cost-Event
    if (result.usage) {
      await CostTrackerService.record({
        runId: step.runId,
        stepId: step.id,
        goalId: step.goalId,
        provider: result.usage.provider,
        model: result.usage.model,
        callRole: 'smart_worker',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costCents: result.usage.costCents,
      })
    }

    // Persist Step-Result
    if (result.status === 'succeeded') {
      const resultSummary = deriveResultSummary(result.output)
      await db
        .update(agentSteps)
        .set({
          status: 'succeeded',
          finishedAt: sql`now()`,
          updatedAt: sql`now()`,
          resultJson: (result.output ?? {}) as Record<string, unknown>,
          resultSummary,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          costCents: result.usage?.costCents ?? 0,
        })
        .where(eq(agentSteps.id, stepId))

      return {
        status: 'succeeded',
        resultJson: result.output as Record<string, unknown> | undefined,
        resultSummary,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        costCents: result.usage?.costCents,
      }
    }

    const errMsg = result.error ?? 'Unbekannter Fehler'
    const resultSummary = deriveResultSummary(null, errMsg)
    await db
      .update(agentSteps)
      .set({
        status: 'failed',
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
        error: errMsg,
        resultSummary,
      })
      .where(eq(agentSteps.id, stepId))

    return { status: 'failed', error: errMsg, resultSummary }
  },
}

// durationMs reserved for future telemetry
void 0

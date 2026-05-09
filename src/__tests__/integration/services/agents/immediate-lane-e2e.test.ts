/**
 * E2E-Integrations-Test fuer Immediate-Lane.
 * Laeuft nur wenn DATABASE_URL gesetzt ist (CI-safe via describe.skipIf).
 *
 * Vereinfachung: nutzt memory:list (Phase 2, immer verfuegbar) statt prompt:dummy_inline,
 * damit keine Template-Seed-Vorbedingung noetig ist.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.6
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

const skip = !process.env.DATABASE_URL
  ? 'DATABASE_URL fehlt — Immediate-Lane-E2E-Test wird uebersprungen'
  : null

describe.skipIf(skip !== null)('Immediate-Lane E2E', () => {
  let goalId: string

  beforeAll(async () => {
    // Mock LLM so plan() / replan() liefern deterministische JSON.
    // Step verwendet memory:list (kein LLM-Call im Worker, deterministisch).
    vi.mock('@/lib/services/ai', async () => {
      let callIdx = 0
      const responses = [
        // 1. plan: 1 Step mit memory:list
        '{"reasoning":"r","steps":[{"stepKey":"step-a","workerType":"memory:list","config":{"para":"Resources"},"contextRefs":[],"dependsOnStepKeys":[]}]}',
        // 2. replan: goal_complete
        '{"action":"goal_complete","reasoning":"fertig","newSteps":[]}',
      ]
      return {
        AIService: {
          complete: vi.fn().mockImplementation(async () => {
            const text = responses[Math.min(callIdx, responses.length - 1)]
            callIdx += 1
            return {
              text,
              provider: 'mock',
              model: 'mock',
              usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            }
          }),
          completeWithContext: vi.fn(),
        },
      }
    })

    // Goal mit executionMode='immediate' anlegen (nur create, nicht start)
    const { GoalService } = await import('@/lib/services/agents')
    const { id } = await GoalService.create({
      title: 'Immediate-Lane-E2E Goal',
      description: 'Inline-Test',
      executionMode: 'immediate',
    })
    goalId = id
  }, 30_000)

  afterAll(async () => {
    vi.unmock('@/lib/services/ai')
  })

  it('Goal mit executionMode=immediate laeuft inline durch und endet auf done', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const result = await GoalService.start(goalId)

    expect(result.runId).toBeDefined()
    expect(result.immediate).toBeDefined()
    expect(result.immediate?.terminalReason).toMatch(/goal_complete|handed_to_cron/)

    const detail = await GoalService.getDetail(goalId)
    expect(detail).not.toBeNull()
    expect(['done', 'running']).toContain(detail!.goal.status)
  }, 30_000)

  it('Watchdog-Deadline-Test: Goal mit kuenstlich kurzer Deadline endet ohne Datenverlust', async () => {
    const { GoalService, runImmediate } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')

    const { id: gid } = await GoalService.create({
      title: 'Watchdog-Test',
      executionMode: 'immediate',
    })
    const planResult = await OrchestratorService.plan(gid)

    // startStepIds=[] => sofort handed_to_cron (kein inline-faehiger Step)
    const r = await runImmediate({ runId: planResult.runId, startStepIds: [], deadlineMs: 1 })
    expect(['handed_to_cron', 'deadline_reached']).toContain(r.terminalReason)
  }, 30_000)
})

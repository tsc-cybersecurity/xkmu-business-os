import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt — Recovery-E2E uebersprungen' : null

describe.skipIf(skip !== null)('Recovery E2E', () => {
  let createdGoalIds: string[] = []

  beforeAll(async () => {
    // Mock LLM auf deterministische plan-Antwort fuer Setup
    vi.mock('@/lib/services/ai', () => ({
      AIService: {
        complete: vi.fn().mockResolvedValue({
          text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{"para":"Resources"},"contextRefs":[],"dependsOnStepKeys":[]}]}',
          provider: 'mock', model: 'mock', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }),
        completeWithContext: vi.fn(),
      },
    }))
  }, 30_000)

  afterAll(async () => {
    // Cleanup: alle Test-Goals loeschen
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { inArray } = await import('drizzle-orm')
    if (createdGoalIds.length > 0) {
      await db.delete(agentGoals).where(inArray(agentGoals.id, createdGoalIds))
    }
    vi.unmock('@/lib/services/ai')
  })

  it('Reconcile findet stranded Run und queued continuation-Task', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const { db } = await import('@/lib/db')
    const { agentRuns } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Reconcile' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Force-Stranded: liveness_checked_at + started_at zurueckdatieren
    await db.execute(sql`
      UPDATE agent_runs SET started_at = NOW() - INTERVAL '15 minutes',
                            liveness_checked_at = NULL
      WHERE id = ${runId}
    `)

    const r = await reconcileStrandedRuns()
    expect(r.queued).toBeGreaterThanOrEqual(1)

    // Pruefen dass continuation-Task in der Queue ist
    const tasks = (await db.execute(sql`
      SELECT id FROM task_queue
      WHERE type='agent_continuation' AND reference_id=${runId} AND status='pending'
    `)) as unknown as Array<{ id: string }>
    expect(tasks.length).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('handleContinuation Pfad 3 (replan_missing) queued agent_replan-Task', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Continuation' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Alle Steps des Runs auf succeeded setzen, kein Replan-Task
    await db.execute(sql`UPDATE agent_steps SET status='succeeded', finished_at=NOW(), updated_at=NOW() WHERE run_id=${runId}`)
    await db.execute(sql`DELETE FROM task_queue WHERE reference_id=${runId} AND type='agent_replan'`)

    const r = await handleContinuation(runId)
    expect(r.path).toBe('replan_missing')

    const replans = (await db.execute(sql`
      SELECT id FROM task_queue
      WHERE type='agent_replan' AND reference_id=${runId} AND status='pending'
    `)) as unknown as Array<{ id: string }>
    expect(replans.length).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('Boot-Recovery findet stranded Run + queued continuation', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Boot' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Force-stale: alle Steps + Run auf >5 min alt
    await db.execute(sql`UPDATE agent_runs SET started_at = NOW() - INTERVAL '10 minutes' WHERE id=${runId}`)
    await db.execute(sql`UPDATE agent_steps SET updated_at = NOW() - INTERVAL '10 minutes' WHERE run_id=${runId}`)

    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBeGreaterThanOrEqual(1)
  }, 30_000)
})

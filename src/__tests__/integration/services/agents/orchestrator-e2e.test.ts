import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('Orchestrator E2E (Mock-LLM)', () => {
  let tmpRoot: string
  let goalId: string
  const aiCompleteMock = vi.fn()

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-e2e-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
    vi.doMock('@/lib/services/ai', async (importOriginal) => {
      const orig = (await importOriginal()) as Record<string, unknown>
      return {
        ...orig,
        AIService: { complete: aiCompleteMock },
      }
    })
  }, 60_000)

  afterAll(async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, agentCostEvents, taskQueue } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    if (goalId) {
      await db.delete(taskQueue).where(eq(taskQueue.referenceId, goalId))
      await db.delete(agentCostEvents).where(eq(agentCostEvents.goalId, goalId))
      await db.delete(agentSteps).where(eq(agentSteps.goalId, goalId))
      await db.delete(agentRuns).where(eq(agentRuns.goalId, goalId))
      await db.delete(agentGoals).where(eq(agentGoals.id, goalId))
    }
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
    vi.doUnmock('@/lib/services/ai')
  })

  it('plan() ruft Mock-LLM und legt Run + Steps + Task an', async () => {
    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({
        reasoning: 'Plan: ein einziger memory:write-Step.',
        steps: [
          {
            stepKey: 'write-summary',
            workerType: 'memory:write',
            config: { scope: 'projects/e2e-test', body: '# E2E Test\nVom Mock-Orchestrator.' },
            contextRefs: [],
            dependsOnStepKeys: [],
          },
        ],
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    })

    const { GoalService } = await import('@/lib/services/agents')
    const created = await GoalService.create({ title: 'E2E-Test', description: 'Schreib einen Memory-Eintrag', executionMode: 'cron' })
    goalId = created.id
    const started = await GoalService.start(goalId)
    expect(started.runId).toBeTruthy()

    const { db } = await import('@/lib/db')
    const { agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, started.runId)).limit(1)
    expect(run.status).toBe('executing')
    const stepsRows = await db.select().from(agentSteps).where(eq(agentSteps.runId, started.runId))
    expect(stepsRows).toHaveLength(1)
    expect(stepsRows[0].stepKey).toBe('write-summary')
    const tasksRows = await db.select().from(taskQueue).where(eq(taskQueue.referenceId, stepsRows[0].id))
    expect(tasksRows).toHaveLength(1)
    expect(tasksRows[0].type).toBe('agent_step_run')
  }, 30_000)

  it('replan() nach completed step setzt goal=done', async () => {
    // Setze step manuell auf succeeded (simuliert Worker-Abschluss)
    const { db } = await import('@/lib/db')
    const { agentRuns, agentSteps, agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')
    const allSteps = await db.select().from(agentSteps).where(eq(agentSteps.goalId, goalId))
    const stepId = allSteps[0].id
    await db.update(agentSteps).set({ status: 'succeeded', resultSummary: 'OK', finishedAt: sql`now()` }).where(eq(agentSteps.id, stepId))

    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({ action: 'goal_complete', reasoning: 'Step war erfolgreich.', newSteps: [] }),
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
    })

    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.goalId, goalId)).limit(1)
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const decision = await OrchestratorService.replan(run.id)
    expect(decision.action).toBe('goal_complete')

    const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    expect(goal.status).toBe('done')
    expect(goal.completedAt).not.toBeNull()
  }, 30_000)
})

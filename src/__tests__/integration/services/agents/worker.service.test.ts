import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('WorkerService Integration', () => {
  let tmpRoot: string
  let goalId: string
  let runId: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-worker-test-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')

    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns } = await import('@/lib/db/schema')
    const [goal] = await db
      .insert(agentGoals)
      .values({ title: 'Worker-Test', status: 'running' })
      .returning({ id: agentGoals.id })
    goalId = goal.id
    const [run] = await db
      .insert(agentRuns)
      .values({ goalId, status: 'executing' })
      .returning({ id: agentRuns.id })
    runId = run.id
  }, 60_000)

  afterAll(async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, agentCostEvents } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(agentCostEvents).where(eq(agentCostEvents.goalId, goalId))
    await db.delete(agentSteps).where(eq(agentSteps.goalId, goalId))
    await db.delete(agentRuns).where(eq(agentRuns.id, runId))
    await db.delete(agentGoals).where(eq(agentGoals.id, goalId))
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('executeStep memory:write erstellt File und setzt step status=succeeded', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'write-test',
        workerType: 'memory:write',
        config: { scope: 'projects/worker-test', body: '# Worker-Test\nIntegrationsbody' },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('succeeded')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('succeeded')
    expect(row.resultSummary).toBeTruthy()
    expect(row.finishedAt).not.toBeNull()
  })

  it('executeStep mit unbekanntem Tool setzt status=failed', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'fail-test',
        workerType: 'memory:nonexistent',
        config: {},
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('failed')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('failed')
    expect(row.error).toMatch(/unbekanntes Memory-Tool/)
  })

  it('executeStep memory:list lieferte Items zurueck', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'list-test',
        workerType: 'memory:list',
        config: { para: 'projects', limit: 10 },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('succeeded')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('succeeded')
    const resultJson = row.resultJson as { items: Array<{ scope: string }> } | null
    expect(resultJson?.items).toBeDefined()
    expect(resultJson?.items?.some((i) => i.scope === 'projects/worker-test')).toBe(true)
  })

  it('Budget-Exceed setzt step direkt auf failed ohne Tool-Invocation', async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    // Budget exhausted setzen
    await db
      .update(agentGoals)
      .set({ budgetCents: 1, spentCents: 100 })
      .where(eq(agentGoals.id, goalId))

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'budget-test',
        workerType: 'memory:list',
        config: { para: 'projects' },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/Budget exceeded/)

    // Budget reset fuer ggf. weitere Tests
    await db.update(agentGoals).set({ budgetCents: null, spentCents: 0 }).where(eq(agentGoals.id, goalId))
  })
})

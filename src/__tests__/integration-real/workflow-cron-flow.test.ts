import { describe, it, expect, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow scheduled trigger flow', () => {
  let workflowId: string | null = null

  afterAll(async () => {
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns, cronJobs } = await import('@/lib/db/schema')
      const { eq, and, sql } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(cronJobs).where(
        and(eq(cronJobs.actionType, 'workflow'),
            sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`)
      )
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('saving scheduled workflow creates managed cron_job; tick executes workflow', async () => {
    const db = createTestDb()
    const { workflows, workflowRuns, cronJobs } = await import('@/lib/db/schema')
    const { eq, and, sql } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `CronFlowTest-${Date.now()}`,
      trigger: '__scheduled__',
      isActive: true,
      schedule: { interval: '5min' },
      steps: [{ id: 'log', kind: 'action', action: 'log_activity', config: { subject: 'cron-test' } }],
    }).returning()
    workflowId = wf.id

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule(wf.id)

    const jobs = await db.select().from(cronJobs).where(
      and(eq(cronJobs.actionType, 'workflow'),
          sql`${cronJobs.actionConfig}->>'workflowId' = ${wf.id}`),
    )
    expect(jobs).toHaveLength(1)
    expect((jobs[0].actionConfig as any).direct).toBe(true)

    await db.update(cronJobs).set({ nextRunAt: new Date(Date.now() - 60_000) }).where(eq(cronJobs.id, jobs[0].id))

    const { CronService } = await import('@/lib/services/cron.service')
    await CronService.tick()
    await new Promise(r => setTimeout(r, 1000))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    expect(runs.length).toBeGreaterThan(0)
    expect(runs[0].trigger).toBe('__scheduled__')
  }, 15_000)
})

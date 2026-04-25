import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow branch flow', () => {
  let server: Server
  let port: number
  let httpStatusToReturn = 200
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        res.statusCode = httpStatusToReturn
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: httpStatusToReturn, echoed: body }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, () => resolve()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('branches based on webhook status', async () => {
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `BranchFlowTest-${Date.now()}`,
      trigger: 'test.branch_flow',
      isActive: true,
      steps: [
        {
          id: 'wh1', kind: 'action', action: 'webhook_call',
          config: { url: `http://localhost:${port}/`, method: 'POST', body: { x: 1 } },
        },
        {
          id: 'br1', kind: 'branch',
          ifCondition: 'steps.wh1.status >= 400',
          then: [{ id: 'fail_log', kind: 'action', action: 'log_activity', config: { type: 'note', content: 'failure' } }],
          else: [{ id: 'ok_log', kind: 'action', action: 'log_activity', config: { type: 'note', content: 'success' } }],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')

    // Case A: webhook returns 200 → else-branch ('ok_log') runs
    httpStatusToReturn = 200
    await WorkflowEngine.fire('test.branch_flow', {})
    await new Promise(r => setTimeout(r, 800))

    let runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    let lastRun = runs[runs.length - 1]
    let stepResults = lastRun.stepResults as Array<{ path: string; status: string; result?: any; action: string }>
    const okBranchTaken = stepResults.find(r => r.action === 'branch')?.result?.taken
    expect(okBranchTaken).toBe('else')
    expect(stepResults.find(r => r.path === '2.else.1')?.status).toBe('completed')

    // Case B: webhook returns 500 → then-branch ('fail_log') runs
    httpStatusToReturn = 500
    await WorkflowEngine.fire('test.branch_flow', {})
    await new Promise(r => setTimeout(r, 4000))  // 5xx triggers retry — wait longer

    runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    lastRun = runs[runs.length - 1]
    stepResults = lastRun.stepResults as any
    const failBranchTaken = stepResults.find(r => r.action === 'branch')?.result?.taken
    expect(failBranchTaken).toBe('then')
    expect(stepResults.find(r => r.path === '2.then.1')?.status).toBe('completed')
  }, 15_000)
})

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow parallel flow', () => {
  let server: Server
  let port: number
  let receivedAt: number[] = []
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      receivedAt.push(Date.now())
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        // 50ms artificial delay to make timestamps spreadable
        setTimeout(() => {
          res.statusCode = 200
          res.end('{"ok":true}')
        }, 50)
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

  it('runs 3 sub-steps in parallel within ~100ms', async () => {
    receivedAt = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `ParallelFlowTest-${Date.now()}`,
      trigger: 'test.parallel_flow',
      isActive: true,
      steps: [
        {
          id: 'p1', kind: 'parallel',
          steps: [
            { id: 's1', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/a`, method: 'POST' } },
            { id: 's2', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/b`, method: 'POST' } },
            { id: 's3', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/c`, method: 'POST' } },
          ],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.parallel_flow', {})
    await new Promise(r => setTimeout(r, 1500))

    expect(receivedAt.length).toBe(3)
    const spread = Math.max(...receivedAt) - Math.min(...receivedAt)
    expect(spread).toBeLessThan(200)  // alle 3 Requests starten innerhalb 200ms

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    const stepResults = runs[0].stepResults as Array<{ path: string; status: string }>
    const subSteps = stepResults.filter(r => r.path.startsWith('1.parallel.'))
    expect(subSteps).toHaveLength(3)
    expect(subSteps.every(s => s.status === 'completed')).toBe(true)
  }, 10_000)
})

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow for_each flow', () => {
  let server: Server
  let port: number
  let receivedUrls: string[] = []
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      receivedUrls.push(req.url ?? '/')
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, echo: body }))
      })
    })
    await new Promise<void>(r => server.listen(0, () => r()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()))
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('iterates webhook over data.<array>', async () => {
    receivedUrls = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `ForEachFlowTest-${Date.now()}`,
      trigger: 'test.foreach_flow',
      isActive: true,
      steps: [
        {
          id: 'loop1', kind: 'for_each',
          source: 'data.tags',
          steps: [
            {
              id: 'wh', kind: 'action', action: 'webhook_call',
              config: { url: `http://localhost:${port}/{{item}}`, method: 'GET' },
            },
          ],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.foreach_flow', { tags: ['a', 'b', 'c'] })
    await new Promise(r => setTimeout(r, 1500))

    const sortedUrls = [...receivedUrls].sort()
    expect(sortedUrls).toEqual(['/a', '/b', '/c'])

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    const stepResults = runs[0].stepResults as Array<{ path: string; status: string; result?: any }>
    const summary = stepResults.find(r => (r as any).kind === 'for_each')
    expect(summary?.result?.iterations).toBe(3)
    expect(summary?.result?.failedCount).toBe(0)
  }, 10_000)
})

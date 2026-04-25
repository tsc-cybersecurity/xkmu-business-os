import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow webhook flow', () => {
  let server: Server
  let port: number
  let receivedRequests: Array<{ method: string; url: string; body: string; headers: Record<string, string> }> = []
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        receivedRequests.push({
          method: req.method ?? 'GET',
          url: req.url ?? '/',
          body,
          headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, echo: body }))
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

  it('fires a webhook step and records HTTP 200 in step_results', async () => {
    receivedRequests = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `WebhookFlowTest-${Date.now()}`,
      trigger: 'test.webhook_flow',
      isActive: true,
      steps: [
        {
          id: 'wh1',
          action: 'webhook_call',
          config: {
            url: `http://localhost:${port}/test`,
            method: 'POST',
            body: { name: '{{data.name}}' },
          },
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.webhook_flow', { name: 'Acme' })

    // Fire is fire-and-forget — wait for engine completion
    await new Promise(r => setTimeout(r, 500))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    expect(runs.length).toBeGreaterThan(0)
    const stepResults = runs[0].stepResults as Array<{ status: string; result?: { status: number; body: unknown } }>
    expect(stepResults[0].status).toBe('completed')
    expect(stepResults[0].result?.status).toBe(200)

    expect(receivedRequests.length).toBeGreaterThan(0)
    expect(receivedRequests[0].method).toBe('POST')
    expect(JSON.parse(receivedRequests[0].body).name).toBe('Acme')
  })
})

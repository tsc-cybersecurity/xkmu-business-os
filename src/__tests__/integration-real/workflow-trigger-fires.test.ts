import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow trigger fires', () => {
  let companyId: string
  let workflowId: string

  beforeAll(async () => {
    const db = createTestDb()
    const { companies, workflows } = await import('@/lib/db/schema')
    const [c] = await db.insert(companies).values({ name: `WfTrig-${Date.now()}` }).returning()
    companyId = c.id

    const [wf] = await db.insert(workflows).values({
      name: 'TriggerFiresSmoke',
      trigger: 'order.created',
      isActive: true,
      steps: [{ id: 'log1', action: 'log_activity', config: { type: 'note', content: 'order seen' } }],
    }).returning()
    workflowId = wf.id
  })

  afterAll(async () => {
    const db = createTestDb()
    const { workflows, workflowRuns, companies, orders, activities } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    try { await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId)) } catch {}
    try { await db.delete(workflows).where(eq(workflows.id, workflowId)) } catch {}
    try { await db.delete(activities).where(eq(activities.companyId, companyId)) } catch {}
    try { await db.delete(orders).where(eq(orders.companyId, companyId)) } catch {}
    try { await db.delete(companies).where(eq(companies.id, companyId)) } catch {}
  })

  it('OrderService.create fires order.created and creates a workflow run', async () => {
    const db = createTestDb()
    const { workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { OrderService } = await import('@/lib/services/order.service')

    // CreateOrderInput requires: companyId, requestedBy, title, description, priority
    const created = await OrderService.create({
      companyId,
      requestedBy: 'test-user-workflow-trigger',
      title: 'Workflow-Trigger-Test',
      description: 'Integration test order to verify workflow trigger fires',
      priority: 'mittel',
    })

    // Wait for fire-and-forget workflow to complete
    await new Promise(r => setTimeout(r, 500))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
    expect(runs.length).toBeGreaterThan(0)
    const triggerData = runs[0].triggerData as Record<string, unknown>
    expect(triggerData.orderId).toBe(created.id)
    expect(triggerData.companyId).toBe(companyId)
  })
})

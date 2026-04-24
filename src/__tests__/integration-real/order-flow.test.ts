/**
 * ## Manual E2E (after deploy)
 *
 * 1. Intern → CMS → E-Mail-Vorlagen → "Standard-Templates laden" (für portal_order_* Templates)
 * 2. Portal-User einloggen → /portal/orders → "Neuen Auftrag einreichen"
 * 3. Kategorie wählen, Titel, Beschreibung, Priorität, optional Vertrag/Projekt → Einreichen
 * 4. Liste zeigt Auftrag "Offen"
 * 5. Admin-Login → Sidebar "Aufträge" → Queue zeigt den Auftrag
 * 6. Detail öffnen → "Annehmen" → Toast → Status="Angenommen"
 * 7. "Bearbeitung starten" → Status="In Bearbeitung"
 * 8. "Abschließen" → Status="Abgeschlossen"
 * 9. Portal-User sieht Status-Änderungen unter /portal/orders/[id] in der Timeline
 * 10. Zweiten Auftrag einreichen → Admin "Ablehnen..." mit Grund → Portal sieht "Abgelehnt" + Grund
 * 11. Dritten Auftrag (pending) → Portal-User stornieren → Status="Storniert"
 * 12. Task-Queue-Mails: 1× admin_created + je 1× status_changed pro Transition
 * 13. DB-Check: SELECT action, entity_type FROM audit_logs WHERE action LIKE '%order%' ORDER BY created_at DESC LIMIT 20;
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Order lifecycle + cross-company isolation — real DB', () => {
  let db: TestDb
  let companyAId: string
  let companyBId: string
  let portalUserId: string
  let adminUserId: string
  let categoryId: string
  let createdOrderIds: string[] = []

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users, orderCategories } = await import('@/lib/db/schema')
    const { UserService } = await import('@/lib/services/user.service')
    const bcrypt = await import('bcryptjs')
    const { asc } = await import('drizzle-orm')

    // Companies
    const [a] = await db.insert(companies).values({
      name: `Order-Test-A ${Date.now()} ffff`,
    }).returning()
    companyAId = a.id

    const [b] = await db.insert(companies).values({
      name: `Order-Test-B ${Date.now()} ffff`,
    }).returning()
    companyBId = b.id

    // Portal user for A
    const pu = await UserService.createPortalUser({
      companyId: companyAId,
      firstName: 'Order',
      lastName: 'Tester',
      email: `order-test-${Date.now()}@test-ffff.invalid`,
      method: 'password',
      password: 'TestOrderPw12345',
    })
    portalUserId = pu.id

    // Admin user (direct insert)
    const [admin] = await db.insert(users).values({
      email: `order-admin-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('admin-pw-x', 10),
      firstName: 'Order',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    }).returning()
    adminUserId = admin.id

    // Pick first seeded category (migration seeds 7 on first boot)
    const cats = await db.select().from(orderCategories).orderBy(asc(orderCategories.sortOrder)).limit(1)
    categoryId = cats[0]?.id
  })

  afterAll(async () => {
    const { orders, users, companies } = await import('@/lib/db/schema')
    const { eq, inArray } = await import('drizzle-orm')
    try {
      if (createdOrderIds.length > 0) {
        await db.delete(orders).where(inArray(orders.id, createdOrderIds))
      }
    } catch { /* ignore */ }
    try {
      if (portalUserId) await db.delete(users).where(eq(users.id, portalUserId))
      if (adminUserId) await db.delete(users).where(eq(users.id, adminUserId))
    } catch { /* ignore */ }
    try {
      const cids = [companyAId, companyBId].filter(Boolean) as string[]
      if (cids.length > 0) await db.delete(companies).where(inArray(companies.id, cids))
    } catch { /* ignore */ }
  })

  it('completes happy lifecycle: create → accept → start → complete', async () => {
    const { OrderService } = await import('@/lib/services/order.service')

    const order = await OrderService.create({
      companyId: companyAId,
      requestedBy: portalUserId,
      categoryId,
      title: 'Lifecycle Test',
      description: 'Test description covering ten chars.',
      priority: 'mittel',
    })
    createdOrderIds.push(order.id)
    expect(order.status).toBe('pending')
    expect(order.acceptedAt).toBeNull()

    const accepted = await OrderService.transitionStatus(order.id, 'accept')
    expect(accepted.status).toBe('accepted')
    expect(accepted.acceptedAt).toBeTruthy()

    const started = await OrderService.transitionStatus(order.id, 'start')
    expect(started.status).toBe('in_progress')
    expect(started.startedAt).toBeTruthy()

    const done = await OrderService.transitionStatus(order.id, 'complete')
    expect(done.status).toBe('done')
    expect(done.completedAt).toBeTruthy()

    await expect(OrderService.transitionStatus(order.id, 'accept'))
      .rejects.toThrow(/INVALID_TRANSITION/)
  })

  it('rejects order with reason', async () => {
    const { OrderService } = await import('@/lib/services/order.service')

    const order = await OrderService.create({
      companyId: companyAId,
      requestedBy: portalUserId,
      categoryId,
      title: 'Reject Test',
      description: 'Another order to be rejected explicitly.',
      priority: 'hoch',
    })
    createdOrderIds.push(order.id)

    const rejected = await OrderService.transitionStatus(order.id, 'reject', 'Out of scope for current SLA.')
    expect(rejected.status).toBe('rejected')
    expect(rejected.rejectedAt).toBeTruthy()
    expect(rejected.rejectReason).toBe('Out of scope for current SLA.')
  })

  it('portal user cancels own pending order; double-cancel returns false', async () => {
    const { OrderService } = await import('@/lib/services/order.service')

    const order = await OrderService.create({
      companyId: companyAId,
      requestedBy: portalUserId,
      categoryId,
      title: 'Cancel Test',
      description: 'A pending order I want to cancel myself.',
      priority: 'niedrig',
    })
    createdOrderIds.push(order.id)

    const ok1 = await OrderService.cancel(order.id, portalUserId)
    expect(ok1).toBe(true)

    const cancelled = await OrderService.getById(order.id)
    expect(cancelled?.status).toBe('cancelled')

    const ok2 = await OrderService.cancel(order.id, portalUserId)
    expect(ok2).toBe(false)
  })

  it('admin assigns order to a user', async () => {
    const { OrderService } = await import('@/lib/services/order.service')

    const order = await OrderService.create({
      companyId: companyAId,
      requestedBy: portalUserId,
      categoryId,
      title: 'Assign Test',
      description: 'Order to be assigned to admin user.',
      priority: 'mittel',
    })
    createdOrderIds.push(order.id)

    const updated = await OrderService.assign(order.id, adminUserId)
    expect(updated.assignedTo).toBe(adminUserId)

    const unassigned = await OrderService.assign(order.id, null)
    expect(unassigned.assignedTo).toBeNull()
  })

  it('cross-company isolation: list(companyId=A) excludes orders of company B', async () => {
    const { OrderService } = await import('@/lib/services/order.service')

    // Create one order for B
    // Note: portalUserId belongs to A but the service doesn't enforce cross-company FK — only DB-level
    const orderB = await OrderService.create({
      companyId: companyBId,
      requestedBy: portalUserId,
      categoryId,
      title: 'B-Only Order',
      description: 'Belongs to company B only.',
      priority: 'mittel',
    })
    createdOrderIds.push(orderB.id)

    const aOrders = await OrderService.list({ companyId: companyAId })
    const aIds = aOrders.map((o) => o.id)
    expect(aIds).not.toContain(orderB.id)

    const bOrders = await OrderService.list({ companyId: companyBId })
    const bIds = bOrders.map((o) => o.id)
    expect(bIds).toContain(orderB.id)
  })
})

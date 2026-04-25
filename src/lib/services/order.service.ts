import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import type { Order } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export interface CreateOrderInput {
  companyId: string
  requestedBy: string
  categoryId?: string | null
  title: string
  description: string
  priority: 'hoch' | 'mittel' | 'niedrig' | 'kritisch'
  contractId?: string | null
  projectId?: string | null
}

export interface OrderListFilter {
  companyId?: string
  status?: string
  priority?: string
  categoryId?: string
  assignedTo?: string
  limit?: number
  offset?: number
}

export type OrderAction = 'accept' | 'start' | 'complete' | 'reject'

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:     ['accepted', 'rejected'],
  accepted:    ['in_progress', 'rejected'],
  in_progress: ['done', 'rejected'],
  done:        [],
  rejected:    [],
  cancelled:   [],
}

const ACTION_TO_STATUS: Record<OrderAction, string> = {
  accept: 'accepted',
  start: 'in_progress',
  complete: 'done',
  reject: 'rejected',
}

export const OrderService = {
  async create(input: CreateOrderInput): Promise<Order> {
    const [created] = await db.insert(orders).values({
      companyId: input.companyId,
      requestedBy: input.requestedBy,
      categoryId: input.categoryId ?? null,
      title: input.title,
      description: input.description,
      priority: input.priority,
      contractId: input.contractId ?? null,
      projectId: input.projectId ?? null,
    }).returning()

    import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
      WorkflowEngine.fire('order.created', {
        orderId: created.id,
        companyId: created.companyId,
        title: created.title,
      })
    ).catch(err => logger.error('Workflow fire (order.created) failed', err, { module: 'OrderService' }))

    return created
  },

  async list(filter: OrderListFilter = {}): Promise<Order[]> {
    const conditions = []
    if (filter.companyId) conditions.push(eq(orders.companyId, filter.companyId))
    if (filter.status) conditions.push(eq(orders.status, filter.status))
    if (filter.priority) conditions.push(eq(orders.priority, filter.priority))
    if (filter.categoryId) conditions.push(eq(orders.categoryId, filter.categoryId))
    if (filter.assignedTo) conditions.push(eq(orders.assignedTo, filter.assignedTo))

    return db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0)
  },

  async getById(id: string): Promise<Order | null> {
    const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
    return row ?? null
  },

  /**
   * Cancel own pending order. Returns true if a row was updated, else false
   * (wrong owner, wrong status, or not found).
   */
  async cancel(id: string, requestedBy: string): Promise<boolean> {
    const now = new Date()
    const result = await db
      .update(orders)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(and(
        eq(orders.id, id),
        eq(orders.requestedBy, requestedBy),
        eq(orders.status, 'pending'),
      ))
      .returning({ id: orders.id })
    return result.length > 0
  },

  /**
   * Apply a status-transition action with validation.
   * Throws 'INVALID_TRANSITION' if the current status doesn't allow this action.
   * Throws 'NOT_FOUND' if the order doesn't exist.
   */
  async transitionStatus(
    id: string,
    action: OrderAction,
    rejectReason?: string,
  ): Promise<Order> {
    const current = await this.getById(id)
    if (!current) throw new Error('NOT_FOUND')

    const newStatus = ACTION_TO_STATUS[action]
    const allowed = ALLOWED_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(newStatus)) throw new Error('INVALID_TRANSITION')

    const now = new Date()
    const patch: Partial<typeof orders.$inferInsert> = {
      status: newStatus,
      updatedAt: now,
    }
    if (action === 'accept')   patch.acceptedAt = now
    if (action === 'start')    patch.startedAt = now
    if (action === 'complete') patch.completedAt = now
    if (action === 'reject') {
      patch.rejectedAt = now
      if (rejectReason !== undefined) patch.rejectReason = rejectReason
    }

    const [updated] = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, id))
      .returning()

    import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
      WorkflowEngine.fire('order.status_changed', {
        orderId: id,
        companyId: updated.companyId,
        fromStatus: current.status,
        toStatus: updated.status,
      })
    ).catch(err => logger.error('Workflow fire (order.status_changed) failed', err, { module: 'OrderService' }))

    return updated
  },

  async assign(id: string, assignedTo: string | null): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    if (!updated) throw new Error('NOT_FOUND')
    return updated
  },
}

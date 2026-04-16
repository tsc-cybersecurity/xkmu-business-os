import { db } from '@/lib/db'
import { marketingTasks } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'
import type { MarketingTask, NewMarketingTask } from '@/lib/db/schema'

export interface TaskFilters {
  campaignId?: string
  status?: string
  type?: string
  page?: number
  limit?: number
}

export interface CreateTaskInput {
  campaignId: string
  type: string
  recipientEmail?: string
  recipientName?: string
  recipientCompany?: string
  personId?: string | null
  companyId?: string | null
  subject?: string
  content?: string
  scheduledAt?: string
  status?: string
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'campaignId'>>

export const MarketingTaskService = {
  async list(_tenantId: string, filters: TaskFilters = {}) {
    const { campaignId, status, type, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (campaignId) conditions.push(eq(marketingTasks.campaignId, campaignId))
    if (status) conditions.push(eq(marketingTasks.status, status))
    if (type) conditions.push(eq(marketingTasks.type, type))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(marketingTasks).where(whereClause).orderBy(desc(marketingTasks.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(marketingTasks).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async listByCampaign(_tenantId: string, campaignId: string) {
    return db
      .select()
      .from(marketingTasks)
      .where(eq(marketingTasks.campaignId, campaignId))
      .orderBy(desc(marketingTasks.createdAt))
  },

  async getById(_tenantId: string, id: string): Promise<MarketingTask | null> {
    const [task] = await db
      .select()
      .from(marketingTasks)
      .where(eq(marketingTasks.id, id))
      .limit(1)
    return task ?? null
  },

  async create(_tenantId: string, data: CreateTaskInput): Promise<MarketingTask> {
    const [task] = await db
      .insert(marketingTasks)
      .values({
        tenantId: TENANT_ID,
        campaignId: data.campaignId,
        type: data.type,
        recipientEmail: data.recipientEmail || null,
        recipientName: data.recipientName || null,
        recipientCompany: data.recipientCompany || null,
        personId: data.personId || undefined,
        companyId: data.companyId || undefined,
        subject: data.subject || null,
        content: data.content || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status || 'draft',
      })
      .returning()
    return task
  },

  async update(_tenantId: string, id: string, data: UpdateTaskInput): Promise<MarketingTask | null> {
    const updateData: Partial<NewMarketingTask> = { updatedAt: new Date() }
    if (data.type !== undefined) updateData.type = data.type
    if (data.recipientEmail !== undefined) updateData.recipientEmail = data.recipientEmail || null
    if (data.recipientName !== undefined) updateData.recipientName = data.recipientName || null
    if (data.recipientCompany !== undefined) updateData.recipientCompany = data.recipientCompany || null
    if (data.personId !== undefined) updateData.personId = data.personId || undefined
    if (data.companyId !== undefined) updateData.companyId = data.companyId || undefined
    if (data.subject !== undefined) updateData.subject = data.subject || null
    if (data.content !== undefined) updateData.content = data.content || null
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
    if (data.status !== undefined) updateData.status = data.status

    const [task] = await db
      .update(marketingTasks)
      .set(updateData)
      .where(eq(marketingTasks.id, id))
      .returning()
    return task ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(marketingTasks)
      .where(eq(marketingTasks.id, id))
      .returning({ id: marketingTasks.id })
    return result.length > 0
  },
}

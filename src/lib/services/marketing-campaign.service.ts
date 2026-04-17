import { db } from '@/lib/db'
import { marketingCampaigns } from '@/lib/db/schema'
import { eq, and, count, desc, ilike } from 'drizzle-orm'
import type { MarketingCampaign, NewMarketingCampaign } from '@/lib/db/schema'

export interface CampaignFilters {
  status?: string
  type?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateCampaignInput {
  name: string
  description?: string
  type: string
  status?: string
  targetAudience?: string
  startDate?: string
  endDate?: string
  settings?: Record<string, unknown>
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>

export const MarketingCampaignService = {
  async list(_tenantId: string, filters: CampaignFilters = {}) {
    const { status, type, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(marketingCampaigns.status, status))
    if (type) conditions.push(eq(marketingCampaigns.type, type))
    if (search) conditions.push(ilike(marketingCampaigns.name, `%${search}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(marketingCampaigns).where(whereClause).orderBy(desc(marketingCampaigns.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(marketingCampaigns).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(_tenantId: string, id: string): Promise<MarketingCampaign | null> {
    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, id))
      .limit(1)
    return campaign ?? null
  },

  async create(_tenantId: string, data: CreateCampaignInput, createdBy?: string): Promise<MarketingCampaign> {
    const [campaign] = await db
      .insert(marketingCampaigns)
      .values({
        name: data.name,
        description: data.description || null,
        type: data.type,
        status: data.status || 'draft',
        targetAudience: data.targetAudience || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        settings: data.settings || {},
        createdBy: createdBy || undefined,
      })
      .returning()
    return campaign
  },

  async update(_tenantId: string, id: string, data: UpdateCampaignInput): Promise<MarketingCampaign | null> {
    const updateData: Partial<NewMarketingCampaign> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience || null
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
    if (data.settings !== undefined) updateData.settings = data.settings

    const [campaign] = await db
      .update(marketingCampaigns)
      .set(updateData)
      .where(eq(marketingCampaigns.id, id))
      .returning()
    return campaign ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(marketingCampaigns)
      .where(eq(marketingCampaigns.id, id))
      .returning({ id: marketingCampaigns.id })
    return result.length > 0
  },
}

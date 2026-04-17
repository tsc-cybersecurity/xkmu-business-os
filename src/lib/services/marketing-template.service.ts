import { db } from '@/lib/db'
import { marketingTemplates } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import type { MarketingTemplate, NewMarketingTemplate } from '@/lib/db/schema'

export interface TemplateFilters {
  type?: string
  page?: number
  limit?: number
}

export interface CreateTemplateInput {
  name: string
  type: string
  subject?: string
  content: string
  isDefault?: boolean
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>

export const MarketingTemplateService = {
  async list(_tenantId: string, filters: TemplateFilters = {}) {
    const { type, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (type) conditions.push(eq(marketingTemplates.type, type))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(marketingTemplates).where(whereClause).orderBy(desc(marketingTemplates.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(marketingTemplates).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(_tenantId: string, id: string): Promise<MarketingTemplate | null> {
    const [template] = await db
      .select()
      .from(marketingTemplates)
      .where(eq(marketingTemplates.id, id))
      .limit(1)
    return template ?? null
  },

  async getDefault(_tenantId: string, type: string): Promise<MarketingTemplate | null> {
    const [template] = await db
      .select()
      .from(marketingTemplates)
      .where(and(
        eq(marketingTemplates.type, type),
        eq(marketingTemplates.isDefault, true)
      ))
      .limit(1)
    return template ?? null
  },

  async create(_tenantId: string, data: CreateTemplateInput): Promise<MarketingTemplate> {
    const [template] = await db
      .insert(marketingTemplates)
      .values({
        name: data.name,
        type: data.type,
        subject: data.subject || null,
        content: data.content,
        isDefault: data.isDefault || false,
      })
      .returning()
    return template
  },

  async update(_tenantId: string, id: string, data: UpdateTemplateInput): Promise<MarketingTemplate | null> {
    const updateData: Partial<NewMarketingTemplate> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.subject !== undefined) updateData.subject = data.subject || null
    if (data.content !== undefined) updateData.content = data.content
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const [template] = await db
      .update(marketingTemplates)
      .set(updateData)
      .where(eq(marketingTemplates.id, id))
      .returning()
    return template ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(marketingTemplates)
      .where(eq(marketingTemplates.id, id))
      .returning({ id: marketingTemplates.id })
    return result.length > 0
  },
}

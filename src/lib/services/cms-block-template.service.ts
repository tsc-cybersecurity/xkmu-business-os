import { db } from '@/lib/db'
import { cmsBlockTemplates, cmsBlocks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { CmsBlockTemplate } from '@/lib/db/schema'

export interface CreateCmsBlockTemplateInput {
  name: string
  blockType: string
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isSystem?: boolean
}

export const CmsBlockTemplateService = {
  async list(tenantId: string, blockType?: string): Promise<CmsBlockTemplate[]> {
    const conditions = [eq(cmsBlockTemplates.tenantId, tenantId)]
    if (blockType) conditions.push(eq(cmsBlockTemplates.blockType, blockType))

    return db
      .select()
      .from(cmsBlockTemplates)
      .where(and(...conditions))
  },

  async create(tenantId: string, data: CreateCmsBlockTemplateInput): Promise<CmsBlockTemplate> {
    const [template] = await db
      .insert(cmsBlockTemplates)
      .values({
        tenantId,
        name: data.name,
        blockType: data.blockType,
        content: data.content ?? {},
        settings: data.settings ?? {},
        isSystem: data.isSystem ?? false,
      })
      .returning()
    return template
  },

  async getById(tenantId: string, templateId: string): Promise<CmsBlockTemplate | null> {
    const [template] = await db
      .select()
      .from(cmsBlockTemplates)
      .where(
        and(
          eq(cmsBlockTemplates.tenantId, tenantId),
          eq(cmsBlockTemplates.id, templateId)
        )
      )
      .limit(1)
    return template ?? null
  },

  async update(tenantId: string, templateId: string, data: Partial<CreateCmsBlockTemplateInput>): Promise<CmsBlockTemplate | null> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.blockType !== undefined) updateData.blockType = data.blockType
    if (data.content !== undefined) updateData.content = data.content
    if (data.settings !== undefined) updateData.settings = data.settings

    const [template] = await db
      .update(cmsBlockTemplates)
      .set(updateData)
      .where(
        and(
          eq(cmsBlockTemplates.tenantId, tenantId),
          eq(cmsBlockTemplates.id, templateId)
        )
      )
      .returning()
    return template ?? null
  },

  async delete(tenantId: string, templateId: string): Promise<boolean> {
    const result = await db
      .delete(cmsBlockTemplates)
      .where(
        and(
          eq(cmsBlockTemplates.tenantId, tenantId),
          eq(cmsBlockTemplates.id, templateId),
          eq(cmsBlockTemplates.isSystem, false)
        )
      )
      .returning({ id: cmsBlockTemplates.id })
    return result.length > 0
  },

  async createFromBlock(tenantId: string, blockId: string, name: string): Promise<CmsBlockTemplate | null> {
    const [block] = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.tenantId, tenantId), eq(cmsBlocks.id, blockId)))
      .limit(1)
    if (!block) return null

    const [template] = await db
      .insert(cmsBlockTemplates)
      .values({
        tenantId,
        name,
        blockType: block.blockType,
        content: block.content,
        settings: block.settings,
      })
      .returning()
    return template
  },
}

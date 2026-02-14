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

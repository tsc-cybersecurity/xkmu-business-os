import { db } from '@/lib/db'
import { cmsBlocks, cmsPages } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { CmsBlock, NewCmsBlock } from '@/lib/db/schema'

export interface CreateCmsBlockInput {
  blockType: string
  sortOrder?: number
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isVisible?: boolean
}

export interface UpdateCmsBlockInput {
  blockType?: string
  sortOrder?: number
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isVisible?: boolean
}

// CMS ist global — kein tenantId-Filter bei Queries.
// tenantId wird nur bei INSERT verwendet (DB-Spalte NOT NULL), von der Page übernommen.

async function markPageDraftChanges(pageId: string) {
  await db
    .update(cmsPages)
    .set({ hasDraftChanges: true, updatedAt: new Date() })
    .where(and(eq(cmsPages.id, pageId), eq(cmsPages.status, 'published')))
}

async function getPageTenantId(pageId: string): Promise<string | null> {
  const [page] = await db.select({ tenantId: cmsPages.tenantId }).from(cmsPages).where(eq(cmsPages.id, pageId)).limit(1)
  return page?.tenantId ?? null
}

export const CmsBlockService = {
  async listByPage(pageId: string): Promise<CmsBlock[]> {
    return db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))
      .orderBy(asc(cmsBlocks.sortOrder))
  },

  async create(pageId: string, data: CreateCmsBlockInput): Promise<CmsBlock> {
    const tenantId = await getPageTenantId(pageId)
    const [block] = await db
      .insert(cmsBlocks)
      .values({
        tenantId: tenantId!,
        pageId,
        blockType: data.blockType,
        sortOrder: data.sortOrder ?? 0,
        content: data.content ?? {},
        settings: data.settings ?? {},
        isVisible: data.isVisible ?? true,
      })
      .returning()

    await markPageDraftChanges(pageId)
    return block
  },

  async update(blockId: string, data: UpdateCmsBlockInput): Promise<CmsBlock | null> {
    const updateData: Partial<NewCmsBlock> = { updatedAt: new Date() }
    if (data.blockType !== undefined) updateData.blockType = data.blockType
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.content !== undefined) updateData.content = data.content
    if (data.settings !== undefined) updateData.settings = data.settings
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible

    const [block] = await db
      .update(cmsBlocks)
      .set(updateData)
      .where(eq(cmsBlocks.id, blockId))
      .returning()

    if (block) {
      await markPageDraftChanges(block.pageId)
    }

    return block ?? null
  },

  async delete(blockId: string): Promise<boolean> {
    const [existing] = await db
      .select({ pageId: cmsBlocks.pageId })
      .from(cmsBlocks)
      .where(eq(cmsBlocks.id, blockId))
      .limit(1)

    const result = await db
      .delete(cmsBlocks)
      .where(eq(cmsBlocks.id, blockId))
      .returning({ id: cmsBlocks.id })

    if (result.length > 0 && existing) {
      await markPageDraftChanges(existing.pageId)
    }

    return result.length > 0
  },

  async reorder(pageId: string, blockIds: string[]): Promise<boolean> {
    for (let i = 0; i < blockIds.length; i++) {
      await db
        .update(cmsBlocks)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(cmsBlocks.pageId, pageId), eq(cmsBlocks.id, blockIds[i])))
    }

    await markPageDraftChanges(pageId)
    return true
  },

  async duplicate(blockId: string): Promise<CmsBlock | null> {
    const [original] = await db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.id, blockId))
      .limit(1)
    if (!original) return null

    const [block] = await db
      .insert(cmsBlocks)
      .values({
        tenantId: original.tenantId,
        pageId: original.pageId,
        blockType: original.blockType,
        sortOrder: (original.sortOrder ?? 0) + 1,
        content: original.content,
        settings: original.settings,
        isVisible: original.isVisible,
      })
      .returning()

    await markPageDraftChanges(original.pageId)
    return block
  },
}

import { db } from '@/lib/db'
import { cmsNavigationItems } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { CmsNavigationItem, NewCmsNavigationItem } from '@/lib/db/schema'

export interface CreateNavigationItemInput {
  location: string
  label: string
  href: string
  pageId?: string | null
  sortOrder?: number
  openInNewTab?: boolean
  isVisible?: boolean
}

export type UpdateNavigationItemInput = Partial<CreateNavigationItemInput>

export const CmsNavigationService = {
  async list(tenantId: string, location?: string): Promise<CmsNavigationItem[]> {
    const conditions = [eq(cmsNavigationItems.tenantId, tenantId)]
    if (location) conditions.push(eq(cmsNavigationItems.location, location))

    return db
      .select()
      .from(cmsNavigationItems)
      .where(and(...conditions))
      .orderBy(asc(cmsNavigationItems.sortOrder))
  },

  async listPublic(location: string): Promise<CmsNavigationItem[]> {
    return db
      .select()
      .from(cmsNavigationItems)
      .where(
        and(
          eq(cmsNavigationItems.location, location),
          eq(cmsNavigationItems.isVisible, true),
        )
      )
      .orderBy(asc(cmsNavigationItems.sortOrder))
  },

  async create(tenantId: string, data: CreateNavigationItemInput): Promise<CmsNavigationItem> {
    const [item] = await db
      .insert(cmsNavigationItems)
      .values({
        tenantId,
        location: data.location,
        label: data.label,
        href: data.href,
        pageId: data.pageId || null,
        sortOrder: data.sortOrder ?? 0,
        openInNewTab: data.openInNewTab ?? false,
        isVisible: data.isVisible ?? true,
      })
      .returning()
    return item
  },

  async update(tenantId: string, id: string, data: UpdateNavigationItemInput): Promise<CmsNavigationItem | null> {
    const updateData: Partial<NewCmsNavigationItem> = { updatedAt: new Date() }
    if (data.location !== undefined) updateData.location = data.location
    if (data.label !== undefined) updateData.label = data.label
    if (data.href !== undefined) updateData.href = data.href
    if (data.pageId !== undefined) updateData.pageId = data.pageId || null
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.openInNewTab !== undefined) updateData.openInNewTab = data.openInNewTab
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible

    const [item] = await db
      .update(cmsNavigationItems)
      .set(updateData)
      .where(and(eq(cmsNavigationItems.tenantId, tenantId), eq(cmsNavigationItems.id, id)))
      .returning()
    return item ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(cmsNavigationItems)
      .where(and(eq(cmsNavigationItems.tenantId, tenantId), eq(cmsNavigationItems.id, id)))
      .returning({ id: cmsNavigationItems.id })
    return result.length > 0
  },

  async reorder(tenantId: string, itemIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx
          .update(cmsNavigationItems)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(cmsNavigationItems.tenantId, tenantId), eq(cmsNavigationItems.id, itemIds[i])))
      }
    })
  },
}

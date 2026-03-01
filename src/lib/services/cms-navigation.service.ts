import { db } from '@/lib/db'
import { cmsNavigationItems } from '@/lib/db/schema'
import { eq, and, asc, count } from 'drizzle-orm'
import type { CmsNavigationItem, NewCmsNavigationItem } from '@/lib/db/schema'

const DEFAULT_HEADER_ITEMS = [
  { label: 'Cyber Security', href: '/cyber-security', sortOrder: 0 },
  { label: 'KI & Automation', href: '/ki-automation', sortOrder: 1 },
  { label: 'IT Consulting', href: '/it-consulting', sortOrder: 2 },
  { label: 'IT-News', href: '/it-news', sortOrder: 3 },
]

const DEFAULT_FOOTER_ITEMS = [
  { label: 'Kostenlos starten', href: '/intern/register', sortOrder: 0 },
  { label: 'API-Dokumentation', href: '/api-docs', sortOrder: 1 },
  { label: 'Impressum', href: '/impressum', sortOrder: 2 },
  { label: 'Kontakt', href: '/kontakt', sortOrder: 3 },
  { label: 'AGB', href: '/agb', sortOrder: 4 },
  { label: 'Datenschutz', href: '/datenschutz', sortOrder: 5 },
]

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

  async listPublic(tenantId: string, location: string): Promise<CmsNavigationItem[]> {
    return db
      .select()
      .from(cmsNavigationItems)
      .where(
        and(
          eq(cmsNavigationItems.tenantId, tenantId),
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

  async seedDefaults(tenantId: string): Promise<{ seeded: boolean; count: number }> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(cmsNavigationItems)
      .where(eq(cmsNavigationItems.tenantId, tenantId))

    if (Number(total) > 0) {
      return { seeded: false, count: 0 }
    }

    const allItems = [
      ...DEFAULT_HEADER_ITEMS.map((item) => ({
        tenantId,
        location: 'header' as const,
        label: item.label,
        href: item.href,
        sortOrder: item.sortOrder,
        openInNewTab: false,
        isVisible: true,
      })),
      ...DEFAULT_FOOTER_ITEMS.map((item) => ({
        tenantId,
        location: 'footer' as const,
        label: item.label,
        href: item.href,
        sortOrder: item.sortOrder,
        openInNewTab: false,
        isVisible: true,
      })),
    ]

    await db.insert(cmsNavigationItems).values(allItems)
    return { seeded: true, count: allItems.length }
  },
}

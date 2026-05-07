import { db } from '@/lib/db'
import { cmsPages, cmsBlocks } from '@/lib/db/schema'
import { eq, and, count, asc } from 'drizzle-orm'
import type { CmsPage, NewCmsPage, CmsBlock } from '@/lib/db/schema'

export interface CmsPageFilters {
  status?: string
  page?: number
  limit?: number
}

export interface CreateCmsPageInput {
  slug: string
  title: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  ogImage?: string
  status?: string
  inSitemap?: boolean
}

export type UpdateCmsPageInput = Partial<CreateCmsPageInput>

export interface CmsPageWithBlocks extends CmsPage {
  blocks: CmsBlock[]
}

// CMS ist global (nicht mandantenspezifisch) — jeder mit Designer-Recht kann alle Seiten bearbeiten.

export const CmsPageService = {
  async create(data: CreateCmsPageInput, createdBy?: string): Promise<CmsPage> {
    const [page] = await db
      .insert(cmsPages)
      .values({
        slug: data.slug,
        title: data.title,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        ogImage: data.ogImage || null,
        status: data.status || 'draft',
        inSitemap: data.inSitemap ?? true,
        createdBy: createdBy || undefined,
      })
      .returning()
    return page
  },

  async getById(pageId: string): Promise<CmsPageWithBlocks | null> {
    const [page] = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.id, pageId))
      .limit(1)
    if (!page) return null

    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))
      .orderBy(asc(cmsBlocks.sortOrder))

    return { ...page, blocks }
  },

  async getBySlug(slug: string): Promise<CmsPageWithBlocks | null> {
    const [page] = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.slug, slug))
      .limit(1)
    if (!page) return null

    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, page.id))
      .orderBy(asc(cmsBlocks.sortOrder))

    return { ...page, blocks }
  },

  async getBySlugPublic(slug: string): Promise<CmsPageWithBlocks | null> {
    const [page] = await db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'published')))
      .limit(1)
    if (!page) return null

    // Use published snapshot if available
    if (page.publishedBlocks) {
      const snapshotBlocks = page.publishedBlocks as Array<{
        id: string
        blockType: string
        sortOrder: number
        content: Record<string, unknown>
        settings: Record<string, unknown>
        isVisible: boolean
      }>
      const blocks = snapshotBlocks.map((b) => ({
        id: b.id,
        pageId: page.id,
        blockType: b.blockType,
        sortOrder: b.sortOrder,
        content: b.content,
        settings: b.settings,
        isVisible: b.isVisible,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })) as CmsBlock[]
      const publicPage = {
        ...page,
        title: page.publishedTitle || page.title,
        seoTitle: page.publishedSeoTitle ?? page.seoTitle,
        seoDescription: page.publishedSeoDescription ?? page.seoDescription,
        seoKeywords: page.publishedSeoKeywords ?? page.seoKeywords,
        blocks,
      }
      return publicPage
    }

    // Fallback: load live blocks (for pages published before versioning)
    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.pageId, page.id), eq(cmsBlocks.isVisible, true)))
      .orderBy(asc(cmsBlocks.sortOrder))

    return { ...page, blocks }
  },

  async update(pageId: string, data: UpdateCmsPageInput): Promise<CmsPage | null> {
    const [existing] = await db
      .select({ status: cmsPages.status })
      .from(cmsPages)
      .where(eq(cmsPages.id, pageId))
      .limit(1)

    const updateData: Partial<NewCmsPage> = { updatedAt: new Date() }
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.title !== undefined) updateData.title = data.title
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle || null
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription || null
    if (data.seoKeywords !== undefined) updateData.seoKeywords = data.seoKeywords || null
    if (data.ogImage !== undefined) updateData.ogImage = data.ogImage || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.inSitemap !== undefined) updateData.inSitemap = data.inSitemap

    if (existing?.status === 'published' && data.status === undefined) {
      updateData.hasDraftChanges = true
    }

    const [page] = await db
      .update(cmsPages)
      .set(updateData)
      .where(eq(cmsPages.id, pageId))
      .returning()
    return page ?? null
  },

  async delete(pageId: string): Promise<boolean> {
    const result = await db
      .delete(cmsPages)
      .where(eq(cmsPages.id, pageId))
      .returning({ id: cmsPages.id })
    return result.length > 0
  },

  async publish(pageId: string): Promise<CmsPage | null> {
    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.pageId, pageId), eq(cmsBlocks.isVisible, true)))
      .orderBy(asc(cmsBlocks.sortOrder))

    const [currentPage] = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.id, pageId))
      .limit(1)
    if (!currentPage) return null

    const blockSnapshot = blocks.map((b) => ({
      id: b.id,
      blockType: b.blockType,
      sortOrder: b.sortOrder,
      content: b.content,
      settings: b.settings,
      isVisible: b.isVisible,
    }))

    const [page] = await db
      .update(cmsPages)
      .set({
        status: 'published',
        publishedAt: new Date(),
        publishedBlocks: blockSnapshot,
        publishedTitle: currentPage.title,
        publishedSeoTitle: currentPage.seoTitle,
        publishedSeoDescription: currentPage.seoDescription,
        publishedSeoKeywords: currentPage.seoKeywords,
        hasDraftChanges: false,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, pageId))
      .returning()
    return page ?? null
  },

  async unpublish(pageId: string): Promise<CmsPage | null> {
    const [page] = await db
      .update(cmsPages)
      .set({
        status: 'draft',
        publishedAt: null,
        publishedBlocks: null,
        publishedTitle: null,
        publishedSeoTitle: null,
        publishedSeoDescription: null,
        publishedSeoKeywords: null,
        hasDraftChanges: false,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, pageId))
      .returning()
    return page ?? null
  },

  async markDraftChanges(pageId: string): Promise<void> {
    await db
      .update(cmsPages)
      .set({ hasDraftChanges: true, updatedAt: new Date() })
      .where(and(eq(cmsPages.id, pageId), eq(cmsPages.status, 'published')))
  },

  async list(filters: CmsPageFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = status ? [eq(cmsPages.status, status)] : []
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(cmsPages).where(whereClause).orderBy(asc(cmsPages.slug)).limit(limit).offset(offset),
      db.select({ total: count() }).from(cmsPages).where(whereClause),
    ])

    return {
      items,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },
}

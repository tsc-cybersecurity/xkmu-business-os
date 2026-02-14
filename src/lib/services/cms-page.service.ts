import { db } from '@/lib/db'
import { cmsPages, cmsBlocks } from '@/lib/db/schema'
import { eq, and, count, desc, asc } from 'drizzle-orm'
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
}

export type UpdateCmsPageInput = Partial<CreateCmsPageInput>

export interface CmsPageWithBlocks extends CmsPage {
  blocks: CmsBlock[]
}

export const CmsPageService = {
  async create(tenantId: string, data: CreateCmsPageInput, createdBy?: string): Promise<CmsPage> {
    const [page] = await db
      .insert(cmsPages)
      .values({
        tenantId,
        slug: data.slug,
        title: data.title,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        ogImage: data.ogImage || null,
        status: data.status || 'draft',
        createdBy: createdBy || undefined,
      })
      .returning()
    return page
  },

  async getById(tenantId: string, pageId: string): Promise<CmsPageWithBlocks | null> {
    const [page] = await db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.id, pageId)))
      .limit(1)
    if (!page) return null

    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.pageId, pageId), eq(cmsBlocks.tenantId, tenantId)))
      .orderBy(asc(cmsBlocks.sortOrder))

    return { ...page, blocks }
  },

  async getBySlug(tenantId: string, slug: string): Promise<CmsPageWithBlocks | null> {
    const [page] = await db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.slug, slug)))
      .limit(1)
    if (!page) return null

    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.pageId, page.id), eq(cmsBlocks.tenantId, tenantId)))
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

    const blocks = await db
      .select()
      .from(cmsBlocks)
      .where(and(eq(cmsBlocks.pageId, page.id), eq(cmsBlocks.isVisible, true)))
      .orderBy(asc(cmsBlocks.sortOrder))

    return { ...page, blocks }
  },

  async update(tenantId: string, pageId: string, data: UpdateCmsPageInput): Promise<CmsPage | null> {
    const updateData: Partial<NewCmsPage> = { updatedAt: new Date() }
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.title !== undefined) updateData.title = data.title
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle || null
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription || null
    if (data.seoKeywords !== undefined) updateData.seoKeywords = data.seoKeywords || null
    if (data.ogImage !== undefined) updateData.ogImage = data.ogImage || null
    if (data.status !== undefined) updateData.status = data.status

    const [page] = await db
      .update(cmsPages)
      .set(updateData)
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.id, pageId)))
      .returning()
    return page ?? null
  },

  async delete(tenantId: string, pageId: string): Promise<boolean> {
    const result = await db
      .delete(cmsPages)
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.id, pageId)))
      .returning({ id: cmsPages.id })
    return result.length > 0
  },

  async publish(tenantId: string, pageId: string): Promise<CmsPage | null> {
    const [page] = await db
      .update(cmsPages)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.id, pageId)))
      .returning()
    return page ?? null
  },

  async unpublish(tenantId: string, pageId: string): Promise<CmsPage | null> {
    const [page] = await db
      .update(cmsPages)
      .set({ status: 'draft', publishedAt: null, updatedAt: new Date() })
      .where(and(eq(cmsPages.tenantId, tenantId), eq(cmsPages.id, pageId)))
      .returning()
    return page ?? null
  },

  async list(tenantId: string, filters: CmsPageFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(cmsPages.tenantId, tenantId)]
    if (status) conditions.push(eq(cmsPages.status, status))

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select().from(cmsPages).where(whereClause!).orderBy(asc(cmsPages.slug)).limit(limit).offset(offset),
      db.select({ total: count() }).from(cmsPages).where(whereClause!),
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

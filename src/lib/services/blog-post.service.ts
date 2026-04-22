import { db } from '@/lib/db'
import { blogPosts } from '@/lib/db/schema'
import { eq, and, count, desc, ilike, inArray } from 'drizzle-orm'
import type { BlogPost, NewBlogPost } from '@/lib/db/schema'

export interface BlogPostFilters {
  status?: string
  category?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateBlogPostInput {
  title: string
  slug?: string
  excerpt?: string
  content?: string
  featuredImage?: string
  featuredImageAlt?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  tags?: string[]
  category?: string
  status?: string
  source?: string
  aiMetadata?: Record<string, unknown>
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>

// Blog ist global (nicht mandantenspezifisch) — wie CMS.

export const BlogPostService = {
  async create(data: CreateBlogPostInput, authorId?: string): Promise<BlogPost> {
    const slug = data.slug || await this.generateSlug(data.title)
    const [post] = await db
      .insert(blogPosts)
      .values({
        title: data.title,
        slug,
        excerpt: data.excerpt || null,
        content: data.content || null,
        featuredImage: data.featuredImage || null,
        featuredImageAlt: data.featuredImageAlt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        tags: data.tags || [],
        category: data.category || null,
        status: data.status || 'draft',
        source: data.source || 'manual',
        aiMetadata: data.aiMetadata || null,
        authorId: authorId || undefined,
      })
      .returning()
    return post
  },

  async getById(postId: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .limit(1)
    return post ?? null
  },

  async getBySlug(slug: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)
    return post ?? null
  },

  async getBySlugPublic(slug: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
      .limit(1)
    return post ?? null
  },

  async update(postId: string, data: UpdateBlogPostInput): Promise<BlogPost | null> {
    const updateData: Partial<NewBlogPost> = { updatedAt: new Date() }
    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt || null
    if (data.content !== undefined) updateData.content = data.content || null
    if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage || null
    if (data.featuredImageAlt !== undefined) updateData.featuredImageAlt = data.featuredImageAlt || null
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle || null
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription || null
    if (data.seoKeywords !== undefined) updateData.seoKeywords = data.seoKeywords || null
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.category !== undefined) updateData.category = data.category || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.source !== undefined) updateData.source = data.source
    if (data.aiMetadata !== undefined) updateData.aiMetadata = data.aiMetadata

    const [post] = await db
      .update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, postId))
      .returning()
    return post ?? null
  },

  async delete(postId: string): Promise<boolean> {
    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, postId))
      .returning({ id: blogPosts.id })
    return result.length > 0
  },

  async publish(postId: string): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(blogPosts.id, postId))
      .returning()
    return post ?? null
  },

  async unpublish(postId: string): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ status: 'draft', publishedAt: null, updatedAt: new Date() })
      .where(eq(blogPosts.id, postId))
      .returning()
    return post ?? null
  },

  async list(filters: BlogPostFilters = {}) {
    const { status, category, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(blogPosts.status, status))
    if (category) conditions.push(eq(blogPosts.category, category))
    if (search) conditions.push(ilike(blogPosts.title, `%${search}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(blogPosts).where(whereClause).orderBy(desc(blogPosts.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(blogPosts).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async listPublished(filters: { category?: string; categories?: string[]; page?: number; limit?: number } = {}) {
    const { category, categories, page = 1, limit = 12 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(blogPosts.status, 'published')]
    if (categories && categories.length > 0) {
      conditions.push(inArray(blogPosts.category, categories))
    } else if (category) {
      conditions.push(eq(blogPosts.category, category))
    }

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select().from(blogPosts).where(whereClause!).orderBy(desc(blogPosts.publishedAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(blogPosts).where(whereClause!),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async generateSlug(title: string): Promise<string> {
    let slug = title
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const existing = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(ilike(blogPosts.slug, `${slug}%`))

    if (existing.length === 0) return slug

    const existingSlugs = new Set(existing.map((e) => e.slug))
    let counter = 2
    while (existingSlugs.has(`${slug}-${counter}`)) counter++
    return `${slug}-${counter}`
  },
}

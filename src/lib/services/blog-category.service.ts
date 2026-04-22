import { db } from '@/lib/db'
import { blogCategories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BlogCategory, NewBlogCategory } from '@/lib/db/schema'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface CreateBlogCategoryInput {
  name: string
  slug?: string
  description?: string | null
  color?: string | null
  sortOrder?: number
  isActive?: boolean
}

export const BlogCategoryService = {
  async list(opts: { activeOnly?: boolean } = {}): Promise<BlogCategory[]> {
    if (opts.activeOnly) {
      return db
        .select()
        .from(blogCategories)
        .where(eq(blogCategories.isActive, true))
        .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name))
    }
    return db
      .select()
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name))
  },

  async getById(id: string): Promise<BlogCategory | null> {
    const [row] = await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1)
    return row ?? null
  },

  async getBySlug(slug: string): Promise<BlogCategory | null> {
    const [row] = await db.select().from(blogCategories).where(eq(blogCategories.slug, slug)).limit(1)
    return row ?? null
  },

  async create(data: CreateBlogCategoryInput): Promise<BlogCategory> {
    const values: NewBlogCategory = {
      name: data.name,
      slug: data.slug?.trim() || slugify(data.name),
      description: data.description ?? null,
      color: data.color ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    }
    const [row] = await db.insert(blogCategories).values(values).returning()
    return row
  },

  async update(id: string, data: Partial<CreateBlogCategoryInput>): Promise<BlogCategory | null> {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) updates.name = data.name
    if (data.slug !== undefined) updates.slug = data.slug || slugify(data.name ?? '')
    if (data.description !== undefined) updates.description = data.description
    if (data.color !== undefined) updates.color = data.color
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
    if (data.isActive !== undefined) updates.isActive = data.isActive

    const [row] = await db.update(blogCategories).set(updates).where(eq(blogCategories.id, id)).returning()
    return row ?? null
  },

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(blogCategories).where(eq(blogCategories.id, id)).returning({ id: blogCategories.id })
    return !!row
  },
}

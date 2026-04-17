import { db } from '@/lib/db'
import { productCategories } from '@/lib/db/schema'
import { eq, and, count, isNull } from 'drizzle-orm'
import type { ProductCategory, NewProductCategory } from '@/lib/db/schema'

export interface CreateCategoryInput {
  name: string
  description?: string
  parentId?: string | null
  sortOrder?: number
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const ProductCategoryService = {
  async create(data: CreateCategoryInput
  ): Promise<ProductCategory> {
    const [category] = await db
      .insert(productCategories)
      .values({
        name: data.name,
        slug: generateSlug(data.name),
        description: emptyToNull(data.description),
        parentId: emptyToNull(data.parentId),
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()

    return category
  },

  async getById(categoryId: string): Promise<ProductCategory | null> {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, categoryId))
      .limit(1)

    return category ?? null
  },

  async update(categoryId: string,
    data: UpdateCategoryInput
  ): Promise<ProductCategory | null> {
    const updateData: Partial<NewProductCategory> = {
      updatedAt: new Date(),
    }

    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.slug = generateSlug(data.name)
    }
    if ('description' in data) updateData.description = emptyToNull(data.description)
    if ('parentId' in data) updateData.parentId = emptyToNull(data.parentId)
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const [category] = await db
      .update(productCategories)
      .set(updateData)
      .where(eq(productCategories.id, categoryId))
      .returning()

    return category ?? null
  },

  async delete(categoryId: string): Promise<boolean> {
    const result = await db
      .delete(productCategories)
      .where(eq(productCategories.id, categoryId))
      .returning({ id: productCategories.id })

    return result.length > 0
  },

  async list(): Promise<ProductCategory[]> {
    const items = await db
      .select()
      .from(productCategories)
      .orderBy(productCategories.sortOrder, productCategories.name)

    return items
  },

  async getTree(): Promise<(ProductCategory & { level: number })[]> {
    const allCategories = await this.list()

    // Build tree structure
    const result: (ProductCategory & { level: number })[] = []

    function addChildren(parentId: string | null, level: number) {
      const children = allCategories
        .filter(c => c.parentId === parentId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

      for (const child of children) {
        result.push({ ...child, level })
        addChildren(child.id, level + 1)
      }
    }

    addChildren(null, 0)
    return result
  },

  async hasProducts(categoryId: string): Promise<boolean> {
    const { products } = await import('@/lib/db/schema')
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.categoryId, categoryId))

    return Number(total) > 0
  },

  async hasChildren(categoryId: string): Promise<boolean> {
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(productCategories)
      .where(eq(productCategories.parentId, categoryId))

    return Number(total) > 0
  },
}

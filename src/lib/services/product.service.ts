import { db } from '@/lib/db'
import { products, productCategories } from '@/lib/db/schema'
import { eq, and, ilike, count, arrayContains, sql, or, getTableColumns } from 'drizzle-orm'
import type { Product, NewProduct } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

export interface ProductWithCategory extends Product {
  category: { id: string; name: string } | null
}

export interface ProductFilters {
  type?: string
  status?: string | string[]
  categoryId?: string
  tags?: string[]
  search?: string
  page?: number
  limit?: number
}

export interface CreateProductInput {
  type: string
  name: string
  description?: string
  sku?: string
  categoryId?: string | null
  priceNet?: number | null
  vatRate?: number
  unit?: string
  status?: string
  tags?: string[]
  notes?: string
  customFields?: Record<string, unknown>
}

export type UpdateProductInput = Partial<CreateProductInput>

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const ProductService = {
  async create(
    tenantId: string,
    data: CreateProductInput,
    createdBy?: string
  ): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        tenantId,
        type: data.type,
        name: data.name,
        description: emptyToNull(data.description),
        sku: emptyToNull(data.sku),
        categoryId: emptyToNull(data.categoryId),
        priceNet: data.priceNet?.toString() ?? null,
        vatRate: (data.vatRate ?? 19).toString(),
        unit: data.unit || 'Stück',
        status: data.status || 'active',
        tags: data.tags || [],
        notes: emptyToNull(data.notes),
        customFields: data.customFields || {},
        createdBy,
      })
      .returning()

    return product
  },

  async getById(tenantId: string, productId: string): Promise<ProductWithCategory | null> {
    const [row] = await db
      .select({
        ...getTableColumns(products),
        category: {
          id: productCategories.id,
          name: productCategories.name,
        },
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .limit(1)

    if (!row) return null

    return {
      ...row,
      category: row.category?.id ? row.category : null,
    }
  },

  async update(
    tenantId: string,
    productId: string,
    data: UpdateProductInput
  ): Promise<Product | null> {
    const { priceNet, vatRate, ...rest } = data
    const updateData: Partial<NewProduct> = {
      ...rest,
      updatedAt: new Date(),
    }

    if ('categoryId' in data) {
      updateData.categoryId = emptyToNull(data.categoryId)
    }

    if (priceNet !== undefined) {
      updateData.priceNet = priceNet?.toString() ?? null
    }

    if (vatRate !== undefined) {
      updateData.vatRate = vatRate.toString()
    }

    const [product] = await db
      .update(products)
      .set(updateData)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .returning()

    return product ?? null
  },

  async delete(tenantId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .returning({ id: products.id })

    return result.length > 0
  },

  async list(
    tenantId: string,
    filters: ProductFilters = {}
  ): Promise<PaginatedResult<ProductWithCategory>> {
    const { type, status, categoryId, tags, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(products.tenantId, tenantId)]

    if (type) {
      conditions.push(eq(products.type, type))
    }

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(sql`${products.status} = ANY(${status})`)
      } else {
        conditions.push(eq(products.status, status))
      }
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId))
    }

    if (tags && tags.length > 0) {
      conditions.push(arrayContains(products.tags, tags))
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )!
      )
    }

    const whereClause = and(...conditions)

    const [rows, [{ count: total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(products),
          category: {
            id: productCategories.id,
            name: productCategories.name,
          },
        })
        .from(products)
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(whereClause)
        .orderBy(products.name)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(products).where(whereClause),
    ])

    const items: ProductWithCategory[] = rows.map((row) => ({
      ...row,
      category: row.category?.id ? row.category : null,
    }))

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

  async search(tenantId: string, query: string, limit = 10): Promise<Product[]> {
    if (!query.trim()) return []

    const items = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.sku, `%${query}%`)
          )
        )
      )
      .limit(limit)

    return items
  },

  async addTag(
    tenantId: string,
    productId: string,
    tag: string
  ): Promise<Product | null> {
    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!product) return null
    const currentTags = product.tags || []
    if (currentTags.includes(tag)) return product

    return this.update(tenantId, productId, { tags: [...currentTags, tag] })
  },

  async removeTag(
    tenantId: string,
    productId: string,
    tag: string
  ): Promise<Product | null> {
    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!product) return null
    const currentTags = product.tags || []

    return this.update(tenantId, productId, { tags: currentTags.filter(t => t !== tag) })
  },
}

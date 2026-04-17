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
  // Web & SEO
  isPublic?: boolean
  isHighlight?: boolean
  shortDescription?: string
  slug?: string
  seoTitle?: string
  seoDescription?: string
  // Media
  images?: Array<{ url: string; alt?: string; sortOrder?: number }>
  // Logistics
  weight?: number | null
  dimensions?: { length?: number; width?: number; height?: number; unit?: string } | null
  manufacturer?: string
  ean?: string
  minOrderQuantity?: number
  deliveryTime?: string
}

export type UpdateProductInput = Partial<CreateProductInput>

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const ProductService = {
  async create(
    _tenantId: string,
    data: CreateProductInput,
    createdBy?: string
  ): Promise<Product> {
    const slug = emptyToNull(data.slug)
      || await this.generateSlug(data.name, _tenantId)

    const [product] = await db
      .insert(products)
      .values({
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
        // Web & SEO
        isPublic: data.isPublic ?? false,
        isHighlight: data.isHighlight ?? false,
        shortDescription: emptyToNull(data.shortDescription),
        slug,
        seoTitle: emptyToNull(data.seoTitle),
        seoDescription: emptyToNull(data.seoDescription),
        // Media
        images: data.images || [],
        // Logistics
        weight: data.weight?.toString() ?? null,
        dimensions: data.dimensions ?? null,
        manufacturer: emptyToNull(data.manufacturer),
        ean: emptyToNull(data.ean),
        minOrderQuantity: data.minOrderQuantity ?? 1,
        deliveryTime: emptyToNull(data.deliveryTime),
        createdBy,
      })
      .returning()

    return product
  },

  async getById(_tenantId: string, productId: string): Promise<ProductWithCategory | null> {
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
      .where(eq(products.id, productId))
      .limit(1)

    if (!row) return null

    return {
      ...row,
      category: row.category?.id ? row.category : null,
    }
  },

  async update(
    _tenantId: string,
    productId: string,
    data: UpdateProductInput
  ): Promise<Product | null> {
    const { priceNet, vatRate, weight, dimensions, images, ...rest } = data
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

    if (weight !== undefined) {
      updateData.weight = weight?.toString() ?? null
    }

    if (dimensions !== undefined) {
      updateData.dimensions = dimensions ?? null
    }

    if (images !== undefined) {
      updateData.images = images
    }

    // Handle empty-to-null for string fields
    for (const field of ['shortDescription', 'slug', 'seoTitle', 'seoDescription', 'manufacturer', 'ean', 'deliveryTime'] as const) {
      if (field in data) {
        (updateData as Record<string, unknown>)[field] = emptyToNull((data as Record<string, unknown>)[field] as string | undefined)
      }
    }

    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning()

    return product ?? null
  },

  async delete(_tenantId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning({ id: products.id })

    return result.length > 0
  },

  async list(
    _tenantId: string,
    filters: ProductFilters = {}
  ): Promise<PaginatedResult<ProductWithCategory>> {
    const { type, status, categoryId, tags, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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

  async generateSlug(name: string, _tenantId: string): Promise<string> {
    let base = name
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = base
    let counter = 1

    while (true) {
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1)

      if (existing.length === 0) return slug
      slug = `${base}-${++counter}`
    }
  },

  async listPublic(
    _tenantId: string,
    filters: { categoryId?: string; search?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<ProductWithCategory>> {
    const { categoryId, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [
      eq(products.isPublic, true),
      eq(products.status, 'active'),
    ]

    if (categoryId) conditions.push(eq(products.categoryId, categoryId))
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
          category: { id: productCategories.id, name: productCategories.name },
        })
        .from(products)
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(whereClause)
        .orderBy(products.name)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(products).where(whereClause),
    ])

    return {
      items: rows.map((row) => ({
        ...row,
        category: row.category?.id ? row.category : null,
      })),
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async search(_tenantId: string, query: string, limit = 10): Promise<Product[]> {
    if (!query.trim()) return []

    const items = await db
      .select()
      .from(products)
      .where(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.sku, `%${query}%`)
        )
      )
      .limit(limit)

    return items
  },

  async addTag(
    _tenantId: string,
    productId: string,
    tag: string
  ): Promise<Product | null> {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!product) return null
    const currentTags = product.tags || []
    if (currentTags.includes(tag)) return product

    return this.update(_productId, { tags: [...currentTags, tag] })
  },

  async removeTag(
    _tenantId: string,
    productId: string,
    tag: string
  ): Promise<Product | null> {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!product) return null
    const currentTags = product.tags || []

    return this.update(_productId, { tags: currentTags.filter(t => t !== tag) })
  },
}

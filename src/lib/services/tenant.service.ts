import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq, ilike, count } from 'drizzle-orm'
import type { Tenant, NewTenant } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

export interface TenantFilters {
  status?: string
  search?: string
  page?: number
  limit?: number
}

export const TenantService = {
  async create(data: Omit<NewTenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values(data)
      .returning()

    return tenant
  },

  async getById(id: string): Promise<Tenant | null> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1)

    return tenant ?? null
  },

  async getBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)

    return tenant ?? null
  },

  async update(
    id: string,
    data: Partial<Omit<NewTenant, 'id' | 'createdAt'>>
  ): Promise<Tenant | null> {
    const [tenant] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning()

    return tenant ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id })

    return result.length > 0
  },

  async list(filters: TenantFilters = {}): Promise<PaginatedResult<Tenant>> {
    const { status, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    let query = db.select().from(tenants).$dynamic()
    let countQuery = db.select({ count: count() }).from(tenants).$dynamic()

    if (status) {
      query = query.where(eq(tenants.status, status))
      countQuery = countQuery.where(eq(tenants.status, status))
    }

    if (search) {
      query = query.where(ilike(tenants.name, `%${search}%`))
      countQuery = countQuery.where(ilike(tenants.name, `%${search}%`))
    }

    const [items, [{ count: total }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
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

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    let query = db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .$dynamic()

    const results = await query.limit(1)

    if (results.length === 0) return false
    if (excludeId && results[0].id === excludeId) return false
    return true
  },
}

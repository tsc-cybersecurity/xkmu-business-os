import { db } from '@/lib/db'
import { dinGrants } from '@/lib/db/schema'
import { eq, and, gte, lte, asc, or, count } from 'drizzle-orm'
import type { DinGrant, NewDinGrant } from '@/lib/db/schema'

export interface GrantFilters {
  region?: string
  employeeCount?: number
  page?: number
  limit?: number
}

export interface GrantInput {
  name: string
  provider: string
  purpose?: string | null
  url?: string | null
  region: string
  minEmployees?: number | null
  maxEmployees?: number | null
}

export const DinGrantService = {
  async list(filters: GrantFilters = {}) {
    const { page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit
    const conditions = []

    if (filters.region) {
      conditions.push(
        or(
          eq(dinGrants.region, filters.region),
          eq(dinGrants.region, 'Bundesweit')
        )!
      )
    }

    if (filters.employeeCount !== undefined) {
      conditions.push(
        or(
          // No min constraint or meets min
          and(
            or(eq(dinGrants.minEmployees, 0), lte(dinGrants.minEmployees, filters.employeeCount))!,
            or(eq(dinGrants.maxEmployees, 0), gte(dinGrants.maxEmployees, filters.employeeCount))!
          )!,
          // Null min/max (no constraint)
          and(
            eq(dinGrants.minEmployees, 0),
            eq(dinGrants.maxEmployees, 0)
          )!
        )!
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(dinGrants)
        .where(whereClause)
        .orderBy(asc(dinGrants.region), asc(dinGrants.name))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(dinGrants).where(whereClause),
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

  async getById(id: string): Promise<DinGrant | null> {
    const [grant] = await db
      .select()
      .from(dinGrants)
      .where(eq(dinGrants.id, id))
      .limit(1)
    return grant ?? null
  },

  async getRegions(): Promise<string[]> {
    const results = await db
      .select({ region: dinGrants.region })
      .from(dinGrants)
      .groupBy(dinGrants.region)
      .orderBy(asc(dinGrants.region))
    return results.map((r) => r.region)
  },

  async create(data: GrantInput): Promise<DinGrant> {
    const [grant] = await db
      .insert(dinGrants)
      .values({
        name: data.name,
        provider: data.provider,
        purpose: data.purpose || null,
        url: data.url || null,
        region: data.region,
        minEmployees: data.minEmployees ?? null,
        maxEmployees: data.maxEmployees ?? null,
      })
      .returning()
    return grant
  },

  async update(id: string, data: Partial<GrantInput>): Promise<DinGrant | null> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.provider !== undefined) updateData.provider = data.provider
    if (data.purpose !== undefined) updateData.purpose = data.purpose || null
    if (data.url !== undefined) updateData.url = data.url || null
    if (data.region !== undefined) updateData.region = data.region
    if (data.minEmployees !== undefined) updateData.minEmployees = data.minEmployees ?? null
    if (data.maxEmployees !== undefined) updateData.maxEmployees = data.maxEmployees ?? null

    const [grant] = await db
      .update(dinGrants)
      .set(updateData)
      .where(eq(dinGrants.id, id))
      .returning()
    return grant ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(dinGrants)
      .where(eq(dinGrants.id, id))
      .returning({ id: dinGrants.id })
    return result.length > 0
  },
}

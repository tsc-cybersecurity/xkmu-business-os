import { db } from '@/lib/db'
import { cockpitSystems } from '@/lib/db/schema'
import { eq, and, ilike, count, sql } from 'drizzle-orm'
import type { CockpitSystem, NewCockpitSystem } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

export interface CockpitSystemFilters {
  category?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateCockpitSystemInput {
  name: string
  hostname?: string
  url?: string
  username?: string
  password?: string
  category?: string
  function?: string
  description?: string
  ipAddress?: string
  port?: number | null
  protocol?: string
  status?: string
  tags?: string[]
  notes?: string
}

export type UpdateCockpitSystemInput = Partial<CreateCockpitSystemInput>

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const CockpitService = {
  async create(
    tenantId: string,
    data: CreateCockpitSystemInput,
    userId?: string
  ): Promise<CockpitSystem> {
    const [system] = await db
      .insert(cockpitSystems)
      .values({
        tenantId,
        name: data.name,
        hostname: emptyToNull(data.hostname),
        url: emptyToNull(data.url),
        username: emptyToNull(data.username),
        password: emptyToNull(data.password),
        category: emptyToNull(data.category),
        function: emptyToNull(data.function),
        description: emptyToNull(data.description),
        ipAddress: emptyToNull(data.ipAddress),
        port: data.port ?? null,
        protocol: emptyToNull(data.protocol),
        status: data.status || 'active',
        tags: data.tags || [],
        notes: emptyToNull(data.notes),
        createdBy: userId || null,
      })
      .returning()

    return system
  },

  async getById(tenantId: string, id: string): Promise<CockpitSystem | null> {
    const [system] = await db
      .select()
      .from(cockpitSystems)
      .where(and(eq(cockpitSystems.tenantId, tenantId), eq(cockpitSystems.id, id)))
      .limit(1)

    return system ?? null
  },

  async update(
    tenantId: string,
    id: string,
    data: UpdateCockpitSystemInput
  ): Promise<CockpitSystem | null> {
    const updateData: Partial<NewCockpitSystem> = {
      ...data,
      updatedAt: new Date(),
    }

    const [system] = await db
      .update(cockpitSystems)
      .set(updateData)
      .where(and(eq(cockpitSystems.tenantId, tenantId), eq(cockpitSystems.id, id)))
      .returning()

    return system ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(cockpitSystems)
      .where(and(eq(cockpitSystems.tenantId, tenantId), eq(cockpitSystems.id, id)))
      .returning({ id: cockpitSystems.id })

    return result.length > 0
  },

  async list(
    tenantId: string,
    filters: CockpitSystemFilters = {}
  ): Promise<PaginatedResult<CockpitSystem>> {
    const { category, status, search, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(cockpitSystems.tenantId, tenantId)]

    if (category) {
      conditions.push(eq(cockpitSystems.category, category))
    }

    if (status) {
      conditions.push(eq(cockpitSystems.status, status))
    }

    if (search) {
      conditions.push(
        sql`(${ilike(cockpitSystems.name, `%${search}%`)} OR ${ilike(cockpitSystems.hostname, `%${search}%`)} OR ${ilike(cockpitSystems.url, `%${search}%`)} OR ${ilike(cockpitSystems.ipAddress, `%${search}%`)})`
      )
    }

    const whereClause = and(...conditions)

    const [items, [{ count: total }]] = await Promise.all([
      db
        .select()
        .from(cockpitSystems)
        .where(whereClause)
        .orderBy(cockpitSystems.category, cockpitSystems.name)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(cockpitSystems).where(whereClause),
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

  async getCategories(tenantId: string): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: cockpitSystems.category })
      .from(cockpitSystems)
      .where(
        and(
          eq(cockpitSystems.tenantId, tenantId),
          sql`${cockpitSystems.category} IS NOT NULL AND ${cockpitSystems.category} != ''`
        )
      )
      .orderBy(cockpitSystems.category)

    return result.map((r) => r.category!).filter(Boolean)
  },

  async getStats(tenantId: string): Promise<{
    total: number
    byStatus: Record<string, number>
    byCategory: Record<string, number>
  }> {
    const [statusCounts, categoryCounts] = await Promise.all([
      db
        .select({
          status: cockpitSystems.status,
          count: count(),
        })
        .from(cockpitSystems)
        .where(eq(cockpitSystems.tenantId, tenantId))
        .groupBy(cockpitSystems.status),
      db
        .select({
          category: cockpitSystems.category,
          count: count(),
        })
        .from(cockpitSystems)
        .where(eq(cockpitSystems.tenantId, tenantId))
        .groupBy(cockpitSystems.category),
    ])

    const byStatus: Record<string, number> = {}
    let total = 0
    for (const row of statusCounts) {
      const key = row.status || 'unknown'
      byStatus[key] = Number(row.count)
      total += Number(row.count)
    }

    const byCategory: Record<string, number> = {}
    for (const row of categoryCounts) {
      const key = row.category || 'Sonstiges'
      byCategory[key] = Number(row.count)
    }

    return { total, byStatus, byCategory }
  },
}

import { db } from '@/lib/db'
import { cockpitSystems, cockpitCredentials } from '@/lib/db/schema'
import { eq, and, ilike, count, sql } from 'drizzle-orm'
import type { CockpitSystem, NewCockpitSystem, CockpitCredential } from '@/lib/db/schema'
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

export interface CreateCredentialInput {
  type: string
  label: string
  username?: string
  password?: string
  notes?: string
}

export type UpdateCredentialInput = Partial<CreateCredentialInput>

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const CockpitService = {
  async create(data: CreateCockpitSystemInput,
    userId?: string
  ): Promise<CockpitSystem> {
    const [system] = await db
      .insert(cockpitSystems)
      .values({
        name: data.name,
        hostname: emptyToNull(data.hostname),
        url: emptyToNull(data.url),
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

  async getById(id: string): Promise<(CockpitSystem & { credentials: CockpitCredential[] }) | null> {
    const [system] = await db
      .select()
      .from(cockpitSystems)
      .where(eq(cockpitSystems.id, id))
      .limit(1)

    if (!system) return null

    const credentials = await db
      .select()
      .from(cockpitCredentials)
      .where(eq(cockpitCredentials.systemId, id))
      .orderBy(cockpitCredentials.label)

    return { ...system, credentials }
  },

  async update(id: string,
    data: UpdateCockpitSystemInput
  ): Promise<CockpitSystem | null> {
    const updateData: Partial<NewCockpitSystem> = {
      ...data,
      updatedAt: new Date(),
    }

    const [system] = await db
      .update(cockpitSystems)
      .set(updateData)
      .where(eq(cockpitSystems.id, id))
      .returning()

    return system ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(cockpitSystems)
      .where(eq(cockpitSystems.id, id))
      .returning({ id: cockpitSystems.id })

    return result.length > 0
  },

  async list(filters: CockpitSystemFilters = {}
  ): Promise<PaginatedResult<CockpitSystem & { credentialCount: number }>> {
    const { category, status, search, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const credentialCountSq = db
      .select({
        systemId: cockpitCredentials.systemId,
        count: count().as('credential_count'),
      })
      .from(cockpitCredentials)
      .groupBy(cockpitCredentials.systemId)
      .as('cc')

    const [items, [{ count: total }]] = await Promise.all([
      db
        .select({
          id: cockpitSystems.id,
          name: cockpitSystems.name,
          hostname: cockpitSystems.hostname,
          url: cockpitSystems.url,
          category: cockpitSystems.category,
          function: cockpitSystems.function,
          description: cockpitSystems.description,
          ipAddress: cockpitSystems.ipAddress,
          port: cockpitSystems.port,
          protocol: cockpitSystems.protocol,
          status: cockpitSystems.status,
          tags: cockpitSystems.tags,
          notes: cockpitSystems.notes,
          createdBy: cockpitSystems.createdBy,
          createdAt: cockpitSystems.createdAt,
          updatedAt: cockpitSystems.updatedAt,
          credentialCount: sql<number>`coalesce(${credentialCountSq.count}, 0)`.as('credentialCount'),
        })
        .from(cockpitSystems)
        .leftJoin(credentialCountSq, eq(cockpitSystems.id, credentialCountSq.systemId))
        .where(whereClause)
        .orderBy(cockpitSystems.category, cockpitSystems.name)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(cockpitSystems).where(whereClause),
    ])

    return {
      items: items.map(item => ({
        ...item,
        credentialCount: Number(item.credentialCount),
      })),
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async getCategories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: cockpitSystems.category })
      .from(cockpitSystems)
      .where(
        sql`${cockpitSystems.category} IS NOT NULL AND ${cockpitSystems.category} != ''`
      )
      .orderBy(cockpitSystems.category)

    return result.map((r) => r.category!).filter(Boolean)
  },

  async getStats(): Promise<{
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
        .groupBy(cockpitSystems.status),
      db
        .select({
          category: cockpitSystems.category,
          count: count(),
        })
        .from(cockpitSystems)
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

  // ============================================
  // Credential Methods
  // ============================================

  async getCredentials(systemId: string): Promise<CockpitCredential[]> {
    return db
      .select()
      .from(cockpitCredentials)
      .where(eq(cockpitCredentials.systemId, systemId))
      .orderBy(cockpitCredentials.label)
  },

  async addCredential(systemId: string, data: CreateCredentialInput): Promise<CockpitCredential> {
    const [credential] = await db
      .insert(cockpitCredentials)
      .values({
        systemId,
        type: data.type,
        label: data.label,
        username: emptyToNull(data.username),
        password: emptyToNull(data.password),
        notes: emptyToNull(data.notes),
      })
      .returning()

    return credential
  },

  async updateCredential(credentialId: string, data: UpdateCredentialInput): Promise<CockpitCredential | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    if (data.type !== undefined) updateData.type = data.type
    if (data.label !== undefined) updateData.label = data.label
    if (data.username !== undefined) updateData.username = emptyToNull(data.username)
    if (data.password !== undefined) updateData.password = emptyToNull(data.password)
    if (data.notes !== undefined) updateData.notes = emptyToNull(data.notes)

    const [credential] = await db
      .update(cockpitCredentials)
      .set(updateData)
      .where(eq(cockpitCredentials.id, credentialId))
      .returning()

    return credential ?? null
  },

  async deleteCredential(credentialId: string): Promise<boolean> {
    const result = await db
      .delete(cockpitCredentials)
      .where(eq(cockpitCredentials.id, credentialId))
      .returning({ id: cockpitCredentials.id })

    return result.length > 0
  },

  /** Verify a credential belongs to a system owned by the tenant */
  async verifyCredentialOwnership(systemId: string, credentialId: string): Promise<boolean> {
    const rows = await db
      .select({ id: cockpitCredentials.id })
      .from(cockpitCredentials)
      .innerJoin(cockpitSystems, eq(cockpitCredentials.systemId, cockpitSystems.id))
      .where(
        and(
          eq(cockpitCredentials.id, credentialId),
          eq(cockpitCredentials.systemId, systemId))
      )
      .limit(1)

    return rows.length > 0
  },
}

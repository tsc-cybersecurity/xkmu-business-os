import { db } from '@/lib/db'
import { aiProviders, aiLogs } from '@/lib/db/schema'
import { eq, and, desc, asc, sql, count, like, or, ne } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

// ============================================
// AI Provider Service - DB-basierte Verwaltung
// ============================================

export interface AiProviderData {
  providerType: string
  name: string
  apiKey?: string | null
  baseUrl?: string | null
  model: string
  maxTokens?: number
  temperature?: number
  priority?: number
  isActive?: boolean
  isDefault?: boolean
}

export interface AiLogFilters {
  providerType?: string
  status?: string
  feature?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface AiLogData {
  tenantId: string
  providerId?: string | null
  userId?: string | null
  providerType: string
  model: string
  prompt: string
  response?: string | null
  status: string
  errorMessage?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  durationMs?: number | null
  feature?: string | null
  entityType?: string | null
  entityId?: string | null
}

export const AiProviderService = {
  // ============================================
  // Provider CRUD
  // ============================================

  async list(_tenantId: string) {
    return db
      .select()
      .from(aiProviders)
      .orderBy(asc(aiProviders.priority), asc(aiProviders.name))
  },

  async getById(_tenantId: string, id: string) {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1)
    return provider || null
  },

  async getActiveProviders(_tenantId: string) {
    return db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.isActive, true),
          ne(aiProviders.providerType, 'firecrawl'),
          ne(aiProviders.providerType, 'kie'),
          ne(aiProviders.providerType, 'serpapi')
        )
      )
      .orderBy(asc(aiProviders.priority))
  },

  async getDefaultProvider(_tenantId: string) {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.isDefault, true),
          eq(aiProviders.isActive, true)
        )
      )
      .limit(1)
    return provider || null
  },

  async create(_tenantId: string, data: AiProviderData) {
    // Wenn neuer Provider als Default gesetzt wird, alte Defaults aufheben
    if (data.isDefault) {
      await db
        .update(aiProviders)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(aiProviders.isDefault, true))
    }

    const [provider] = await db
      .insert(aiProviders)
      .values({
        providerType: data.providerType,
        name: data.name,
        apiKey: data.apiKey || null,
        baseUrl: data.baseUrl || null,
        model: data.model,
        maxTokens: data.maxTokens ?? 1000,
        temperature: String(data.temperature ?? 0.7),
        priority: data.priority ?? 0,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
      })
      .returning()

    return provider
  },

  async update(_tenantId: string, id: string, data: Partial<AiProviderData>) {
    // Wenn auf Default gesetzt, alte Defaults aufheben
    if (data.isDefault) {
      await db
        .update(aiProviders)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(aiProviders.isDefault, true))
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.providerType !== undefined) updateData.providerType = data.providerType
    if (data.name !== undefined) updateData.name = data.name
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey || null
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl || null
    if (data.model !== undefined) updateData.model = data.model
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens
    if (data.temperature !== undefined) updateData.temperature = String(data.temperature)
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const [provider] = await db
      .update(aiProviders)
      .set(updateData)
      .where(eq(aiProviders.id, id))
      .returning()

    return provider || null
  },

  async delete(_tenantId: string, id: string) {
    const [deleted] = await db
      .delete(aiProviders)
      .where(eq(aiProviders.id, id))
      .returning({ id: aiProviders.id })

    return !!deleted
  },

  // ============================================
  // AI Logging
  // ============================================

  async createLog(data: AiLogData) {
    const [log] = await db
      .insert(aiLogs)
      .values({
        tenantId: data.tenantId,
        providerId: data.providerId || null,
        userId: data.userId || null,
        providerType: data.providerType,
        model: data.model,
        prompt: data.prompt,
        response: data.response || null,
        status: data.status,
        errorMessage: data.errorMessage || null,
        promptTokens: data.promptTokens || null,
        completionTokens: data.completionTokens || null,
        totalTokens: data.totalTokens || null,
        durationMs: data.durationMs || null,
        feature: data.feature || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
      })
      .returning()

    return log
  },

  async listLogs(_tenantId: string, filters: AiLogFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit

    const conditions = []

    if (filters.providerType) {
      conditions.push(eq(aiLogs.providerType, filters.providerType))
    }
    if (filters.status) {
      conditions.push(eq(aiLogs.status, filters.status))
    }
    if (filters.feature) {
      conditions.push(eq(aiLogs.feature, filters.feature))
    }
    if (filters.search) {
      conditions.push(
        or(
          like(aiLogs.prompt, `%${filters.search}%`),
          like(aiLogs.model, `%${filters.search}%`)
        )!
      )
    }
    if (filters.dateFrom) {
      conditions.push(sql`${aiLogs.createdAt} >= ${filters.dateFrom}::timestamptz`)
    }
    if (filters.dateTo) {
      conditions.push(sql`${aiLogs.createdAt} <= ${filters.dateTo}::timestamptz`)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(aiLogs)
        .where(whereClause)
        .orderBy(desc(aiLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(aiLogs)
        .where(whereClause),
    ])

    const total = totalResult[0]?.count || 0

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  async getLogById(_tenantId: string, id: string) {
    const [log] = await db
      .select()
      .from(aiLogs)
      .where(eq(aiLogs.id, id))
      .limit(1)
    return log || null
  },

  async getLogStats(_tenantId: string) {
    const [stats] = await db
      .select({
        totalLogs: count(),
        totalTokens: sql<number>`COALESCE(SUM(${aiLogs.totalTokens}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${aiLogs.durationMs}), 0)`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE ${aiLogs.status} = 'error')`,
      })
      .from(aiLogs)

    return stats || { totalLogs: 0, totalTokens: 0, avgDuration: 0, errorCount: 0 }
  },
}

import { db } from '@/lib/db'
import { executionLogs } from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'
import { eq, and, desc, count, avg } from 'drizzle-orm'

export const ExecutionLogService = {
  // ── Create ───────────────────────────────────────────────────────────
  async create(_tenantId: string, data: Record<string, unknown>) {
    const [log] = await db.insert(executionLogs).values({
      entityType: data.entityType as string,
      entityId: data.entityId as string,
      entityVersion: (data.entityVersion as string) || null,
      startedAt: data.startedAt ? new Date(data.startedAt as string) : new Date(),
      completedAt: data.completedAt ? new Date(data.completedAt as string) : null,
      executedBy: data.executedBy as string,
      status: data.status as string,
      abortReason: (data.abortReason as string) || null,
      qualityScore: (data.qualityScore as number) ?? null,
      durationMinutes: (data.durationMinutes as number) ?? null,
      costEstimateUsd: (data.costEstimateUsd as number) ?? null,
      flags: (data.flags as string[]) || [],
      linkedClientId: (data.linkedClientId as string) || null,
      linkedProjectId: (data.linkedProjectId as string) || null,
      humanApproved: (data.humanApproved as boolean) ?? false,
      humanApprovedBy: (data.humanApprovedBy as string) || null,
      humanApprovedAt: data.humanApprovedAt ? new Date(data.humanApprovedAt as string) : null,
    }).returning()
    return log
  },

  // ── List by entity ────────────────────────────────────────────────────
  async listByEntity(
    _tenantId: string,
    entityType: string,
    entityId: string,
    opts?: { limit?: number; offset?: number }
  ) {
    const limit = opts?.limit ?? 20
    const offset = opts?.offset ?? 0
    return db.select().from(executionLogs)
      .where(
        and(
          eq(executionLogs.entityType, entityType),
          eq(executionLogs.entityId, entityId))
      )
      .orderBy(desc(executionLogs.startedAt))
      .limit(limit)
      .offset(offset)
  },

  // ── List all ──────────────────────────────────────────────────────────
  async list(
    _tenantId: string,
    filters?: { entityType?: string; entityId?: string; status?: string },
    opts?: { limit?: number; offset?: number }
  ) {
    const conditions: ReturnType<typeof eq>[] = []
    if (filters?.entityType) conditions.push(eq(executionLogs.entityType, filters.entityType))
    if (filters?.entityId) conditions.push(eq(executionLogs.entityId, filters.entityId))
    if (filters?.status) conditions.push(eq(executionLogs.status, filters.status))

    const limit = opts?.limit ?? 20
    const offset = opts?.offset ?? 0

    return db.select().from(executionLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(executionLogs.startedAt))
      .limit(limit)
      .offset(offset)
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  async getStats(_tenantId: string, entityType?: string, entityId?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (entityType) conditions.push(eq(executionLogs.entityType, entityType))
    if (entityId) conditions.push(eq(executionLogs.entityId, entityId))

    const [result] = await db.select({
      total: count(),
      avgQualityScore: avg(executionLogs.qualityScore),
      avgDurationMinutes: avg(executionLogs.durationMinutes),
    }).from(executionLogs).where(conditions.length ? and(...conditions) : undefined)

    return {
      total: Number(result?.total ?? 0),
      avgQualityScore: result?.avgQualityScore != null ? Number(result.avgQualityScore) : null,
      avgDurationMinutes: result?.avgDurationMinutes != null ? Number(result.avgDurationMinutes) : null,
    }
  },
}

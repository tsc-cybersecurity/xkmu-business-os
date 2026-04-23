import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import type { AuditLog } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export interface AuditLogInput {
  userId?: string | null
  userRole?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  payload?: Record<string, unknown>
  request?: NextRequest
}

function extractIp(req: NextRequest | undefined): string | null {
  if (!req) return null
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (fwd) return fwd
  return req.headers.get('x-real-ip') || null
}

export const AuditLogService = {
  /**
   * Persist an audit-log entry. Throws on DB failure — callers are responsible for
   * deciding whether to propagate (fail the action) or swallow (e.g. login flows where
   * audit outage must not block authentication).
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: input.userId ?? null,
        userRole: input.userRole ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        payload: input.payload ?? {},
        ipAddress: extractIp(input.request),
        userAgent: input.request?.headers.get('user-agent') ?? null,
      })
    } catch (error) {
      logger.error('AuditLog write failed', error, { module: 'AuditLogService', action: input.action })
      throw error
    }
  },

  async list(filter: {
    userId?: string
    entityType?: string
    entityId?: string
    action?: string
    limit?: number
    offset?: number
  } = {}): Promise<AuditLog[]> {
    const conditions = []
    if (filter.userId) conditions.push(eq(auditLogs.userId, filter.userId))
    if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType))
    if (filter.entityId) conditions.push(eq(auditLogs.entityId, filter.entityId))
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    return db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0)
  },
}

import { db } from '@/lib/db'
import { dinAuditSessions, dinAnswers, companies, users } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import type { DinAuditSession, DinAnswer, NewDinAuditSession } from '@/lib/db/schema'

export interface DinAuditFilters {
  status?: string
  page?: number
  limit?: number
}

export interface CreateAuditInput {
  clientCompanyId: string
  reviewerId?: string
}

export interface SaveAnswerInput {
  requirementId: number
  status: 'fulfilled' | 'not_fulfilled' | 'irrelevant'
  justification?: string
}

export const DinAuditService = {
  async create(tenantId: string, consultantId: string, data: CreateAuditInput): Promise<DinAuditSession> {
    const [session] = await db
      .insert(dinAuditSessions)
      .values({
        tenantId,
        clientCompanyId: data.clientCompanyId,
        consultantId,
        reviewerId: data.reviewerId || undefined,
        status: 'draft',
      })
      .returning()
    return session
  },

  async getById(tenantId: string, sessionId: string) {
    const [session] = await db
      .select()
      .from(dinAuditSessions)
      .where(and(eq(dinAuditSessions.tenantId, tenantId), eq(dinAuditSessions.id, sessionId)))
      .limit(1)
    if (!session) return null

    // Load related data
    const [company] = session.clientCompanyId
      ? await db.select().from(companies).where(eq(companies.id, session.clientCompanyId)).limit(1)
      : [null]

    const [consultant] = session.consultantId
      ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users).where(eq(users.id, session.consultantId)).limit(1)
      : [null]

    const answers = await db
      .select()
      .from(dinAnswers)
      .where(eq(dinAnswers.sessionId, sessionId))

    return { ...session, clientCompany: company, consultant, answers }
  },

  async update(tenantId: string, sessionId: string, data: Partial<NewDinAuditSession>): Promise<DinAuditSession | null> {
    const [session] = await db
      .update(dinAuditSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(dinAuditSessions.tenantId, tenantId), eq(dinAuditSessions.id, sessionId)))
      .returning()
    return session ?? null
  },

  async delete(tenantId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .delete(dinAuditSessions)
      .where(and(eq(dinAuditSessions.tenantId, tenantId), eq(dinAuditSessions.id, sessionId)))
      .returning({ id: dinAuditSessions.id })
    return result.length > 0
  },

  async list(tenantId: string, filters: DinAuditFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(dinAuditSessions.tenantId, tenantId)]
    if (status) conditions.push(eq(dinAuditSessions.status, status))

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: dinAuditSessions.id,
          tenantId: dinAuditSessions.tenantId,
          clientCompanyId: dinAuditSessions.clientCompanyId,
          consultantId: dinAuditSessions.consultantId,
          reviewerId: dinAuditSessions.reviewerId,
          status: dinAuditSessions.status,
          startedAt: dinAuditSessions.startedAt,
          completedAt: dinAuditSessions.completedAt,
          createdAt: dinAuditSessions.createdAt,
          updatedAt: dinAuditSessions.updatedAt,
          companyName: companies.name,
        })
        .from(dinAuditSessions)
        .leftJoin(companies, eq(dinAuditSessions.clientCompanyId, companies.id))
        .where(whereClause!)
        .orderBy(desc(dinAuditSessions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(dinAuditSessions).where(whereClause!),
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

  async saveAnswer(tenantId: string, sessionId: string, data: SaveAnswerInput): Promise<DinAnswer> {
    // Check if answer already exists for this session+requirement
    const [existing] = await db
      .select()
      .from(dinAnswers)
      .where(
        and(
          eq(dinAnswers.sessionId, sessionId),
          eq(dinAnswers.requirementId, data.requirementId)
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(dinAnswers)
        .set({
          status: data.status,
          justification: data.justification,
          answeredAt: new Date(),
        })
        .where(eq(dinAnswers.id, existing.id))
        .returning()
      return updated
    }

    const [answer] = await db
      .insert(dinAnswers)
      .values({
        tenantId,
        sessionId,
        requirementId: data.requirementId,
        status: data.status,
        justification: data.justification,
      })
      .returning()
    return answer
  },

  async saveBulkAnswers(tenantId: string, sessionId: string, answers: SaveAnswerInput[]): Promise<DinAnswer[]> {
    const results: DinAnswer[] = []
    for (const answer of answers) {
      const saved = await this.saveAnswer(tenantId, sessionId, answer)
      results.push(saved)
    }
    return results
  },

  async getAnswers(tenantId: string, sessionId: string): Promise<DinAnswer[]> {
    return db
      .select()
      .from(dinAnswers)
      .where(and(eq(dinAnswers.tenantId, tenantId), eq(dinAnswers.sessionId, sessionId)))
  },
}

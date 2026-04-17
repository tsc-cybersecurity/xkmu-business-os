import { db } from '@/lib/db'
import { dinAuditSessions, dinAnswers, dinRequirements, companies, users } from '@/lib/db/schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'
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
  async create(_tenantId: string, consultantId: string, data: CreateAuditInput): Promise<DinAuditSession> {
    const [session] = await db
      .insert(dinAuditSessions)
      .values({
        clientCompanyId: data.clientCompanyId,
        consultantId,
        reviewerId: data.reviewerId || undefined,
        status: 'draft',
      })
      .returning()
    return session
  },

  async getById(_tenantId: string, sessionId: string) {
    const [session] = await db
      .select()
      .from(dinAuditSessions)
      .where(eq(dinAuditSessions.id, sessionId))
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

  async update(_tenantId: string, sessionId: string, data: Partial<NewDinAuditSession>): Promise<DinAuditSession | null> {
    const [session] = await db
      .update(dinAuditSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dinAuditSessions.id, sessionId))
      .returning()
    return session ?? null
  },

  async delete(_tenantId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .delete(dinAuditSessions)
      .where(eq(dinAuditSessions.id, sessionId))
      .returning({ id: dinAuditSessions.id })
    return result.length > 0
  },

  async list(_tenantId: string, filters: DinAuditFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(dinAuditSessions.status, status))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: dinAuditSessions.id,
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
        .where(whereClause)
        .orderBy(desc(dinAuditSessions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(dinAuditSessions).where(whereClause),
    ])

    // Get answer counts per session
    const sessionIds = items.map((i) => i.id)
    let answerStats: Array<{ sessionId: string; answered: number; fulfilled: number; notFulfilled: number; irrelevant: number }> = []

    if (sessionIds.length > 0) {
      answerStats = await db
        .select({
          sessionId: dinAnswers.sessionId,
          answered: count(dinAnswers.id),
          fulfilled: sql<number>`count(*) filter (where ${dinAnswers.status} = 'fulfilled')`,
          notFulfilled: sql<number>`count(*) filter (where ${dinAnswers.status} = 'not_fulfilled')`,
          irrelevant: sql<number>`count(*) filter (where ${dinAnswers.status} = 'irrelevant')`,
        })
        .from(dinAnswers)
        .where(sql`${dinAnswers.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(dinAnswers.sessionId)
    }

    // Get total requirements count (excluding status questions)
    const [{ totalReqs }] = await db
      .select({ totalReqs: count() })
      .from(dinRequirements)
      .where(sql`${dinRequirements.componentNumber} != 0`)

    const statsMap = new Map(answerStats.map((s) => [s.sessionId, s]))

    const enrichedItems = items.map((item) => {
      const stats = statsMap.get(item.id)
      return {
        ...item,
        answeredCount: stats ? Number(stats.answered) : 0,
        fulfilledCount: stats ? Number(stats.fulfilled) : 0,
        notFulfilledCount: stats ? Number(stats.notFulfilled) : 0,
        irrelevantCount: stats ? Number(stats.irrelevant) : 0,
        totalRequirements: Number(totalReqs),
      }
    })

    return {
      items: enrichedItems,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async saveAnswer(_tenantId: string, sessionId: string, data: SaveAnswerInput): Promise<DinAnswer> {
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
        sessionId,
        requirementId: data.requirementId,
        status: data.status,
        justification: data.justification,
      })
      .returning()
    return answer
  },

  async saveBulkAnswers(_tenantId: string, sessionId: string, answers: SaveAnswerInput[]): Promise<DinAnswer[]> {
    return Promise.all(answers.map(a => this.saveAnswer(_sessionId, a)))
  },

  async getAnswers(_tenantId: string, sessionId: string): Promise<DinAnswer[]> {
    return db
      .select()
      .from(dinAnswers)
      .where(eq(dinAnswers.sessionId, sessionId))
  },
}

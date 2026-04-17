import { db } from '@/lib/db'
import { wibaAuditSessions, wibaAnswers, wibaRequirements, companies, users } from '@/lib/db/schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'
import type { WibaAuditSession, WibaAnswer, NewWibaAuditSession } from '@/lib/db/schema'

export interface WibaAuditFilters {
  status?: string
  page?: number
  limit?: number
}

export interface CreateAuditInput {
  clientCompanyId: string
}

export interface SaveAnswerInput {
  requirementId: number
  status: 'ja' | 'nein' | 'nicht_relevant'
  notes?: string
}

export const WibaAuditService = {
  async create(_tenantId: string, consultantId: string, data: CreateAuditInput): Promise<WibaAuditSession> {
    const [session] = await db
      .insert(wibaAuditSessions)
      .values({
        clientCompanyId: data.clientCompanyId,
        consultantId,
        status: 'draft',
      })
      .returning()
    return session
  },

  async getById(_tenantId: string, sessionId: string) {
    const [session] = await db
      .select()
      .from(wibaAuditSessions)
      .where(eq(wibaAuditSessions.id, sessionId))
      .limit(1)
    if (!session) return null

    const [company] = session.clientCompanyId
      ? await db.select({
          id: companies.id,
          name: companies.name,
          legalForm: companies.legalForm,
          street: companies.street,
          houseNumber: companies.houseNumber,
          postalCode: companies.postalCode,
          city: companies.city,
          country: companies.country,
          phone: companies.phone,
          email: companies.email,
          website: companies.website,
          industry: companies.industry,
          employeeCount: companies.employeeCount,
        }).from(companies).where(eq(companies.id, session.clientCompanyId)).limit(1)
      : [null]

    const [consultant] = session.consultantId
      ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users).where(eq(users.id, session.consultantId)).limit(1)
      : [null]

    const answers = await db
      .select()
      .from(wibaAnswers)
      .where(eq(wibaAnswers.sessionId, sessionId))

    return { ...session, clientCompany: company, consultant, answers }
  },

  async update(_tenantId: string, sessionId: string, data: Partial<NewWibaAuditSession>): Promise<WibaAuditSession | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.status !== undefined) updateData.status = data.status
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt as unknown as string) : null
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt as unknown as string) : null

    const [session] = await db
      .update(wibaAuditSessions)
      .set(updateData)
      .where(eq(wibaAuditSessions.id, sessionId))
      .returning()
    return session ?? null
  },

  async delete(_tenantId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .delete(wibaAuditSessions)
      .where(eq(wibaAuditSessions.id, sessionId))
      .returning({ id: wibaAuditSessions.id })
    return result.length > 0
  },

  async list(_tenantId: string, filters: WibaAuditFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(wibaAuditSessions.status, status))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: wibaAuditSessions.id,
          clientCompanyId: wibaAuditSessions.clientCompanyId,
          consultantId: wibaAuditSessions.consultantId,
          status: wibaAuditSessions.status,
          startedAt: wibaAuditSessions.startedAt,
          completedAt: wibaAuditSessions.completedAt,
          createdAt: wibaAuditSessions.createdAt,
          updatedAt: wibaAuditSessions.updatedAt,
          companyName: companies.name,
        })
        .from(wibaAuditSessions)
        .leftJoin(companies, eq(wibaAuditSessions.clientCompanyId, companies.id))
        .where(whereClause)
        .orderBy(desc(wibaAuditSessions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(wibaAuditSessions).where(whereClause),
    ])

    const sessionIds = items.map((i) => i.id)
    let answerStats: Array<{ sessionId: string; answered: number; ja: number; nein: number; nichtRelevant: number }> = []

    if (sessionIds.length > 0) {
      answerStats = await db
        .select({
          sessionId: wibaAnswers.sessionId,
          answered: count(wibaAnswers.id),
          ja: sql<number>`count(*) filter (where ${wibaAnswers.status} = 'ja')`,
          nein: sql<number>`count(*) filter (where ${wibaAnswers.status} = 'nein')`,
          nichtRelevant: sql<number>`count(*) filter (where ${wibaAnswers.status} = 'nicht_relevant')`,
        })
        .from(wibaAnswers)
        .where(sql`${wibaAnswers.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(wibaAnswers.sessionId)
    }

    const [{ totalReqs }] = await db
      .select({ totalReqs: count() })
      .from(wibaRequirements)

    const statsMap = new Map(answerStats.map((s) => [s.sessionId, s]))

    const enrichedItems = items.map((item) => {
      const stats = statsMap.get(item.id)
      return {
        ...item,
        answeredCount: stats ? Number(stats.answered) : 0,
        jaCount: stats ? Number(stats.ja) : 0,
        neinCount: stats ? Number(stats.nein) : 0,
        nichtRelevantCount: stats ? Number(stats.nichtRelevant) : 0,
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

  async saveAnswer(_tenantId: string, sessionId: string, data: SaveAnswerInput): Promise<WibaAnswer> {
    const [existing] = await db
      .select()
      .from(wibaAnswers)
      .where(
        and(
          eq(wibaAnswers.sessionId, sessionId),
          eq(wibaAnswers.requirementId, data.requirementId)
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(wibaAnswers)
        .set({
          status: data.status,
          notes: data.notes,
          answeredAt: new Date(),
        })
        .where(eq(wibaAnswers.id, existing.id))
        .returning()
      return updated
    }

    const [answer] = await db
      .insert(wibaAnswers)
      .values({
        sessionId,
        requirementId: data.requirementId,
        status: data.status,
        notes: data.notes,
      })
      .returning()
    return answer
  },

  async saveBulkAnswers(_tenantId: string, sessionId: string, answers: SaveAnswerInput[]): Promise<WibaAnswer[]> {
    const results: WibaAnswer[] = []
    for (const answer of answers) {
      const saved = await this.saveAnswer(_sessionId, answer)
      results.push(saved)
    }
    return results
  },

  async getAnswers(_tenantId: string, sessionId: string): Promise<WibaAnswer[]> {
    return db
      .select()
      .from(wibaAnswers)
      .where(eq(wibaAnswers.sessionId, sessionId))
  },
}

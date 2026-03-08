import { db } from '@/lib/db'
import { wibaChecklists, wibaPrueffragen, wibaAssessments, wibaAnswers, companies } from '@/lib/db/schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'
import type { WibaAssessment, WibaAnswer } from '@/lib/db/schema'

export interface WibaAssessmentFilters {
  status?: string
  page?: number
  limit?: number
}

export interface CreateAssessmentInput {
  name: string
  description?: string
  clientCompanyId: string
}

export interface SaveAnswerInput {
  prueffrageId: number
  answer: 'ja' | 'nein' | 'nicht_relevant'
  notizen?: string
}

export interface ChecklistProgress {
  checklistId: number
  name: string
  slug: string
  priority: number
  sortOrder: number
  total: number
  answered: number
  ja: number
  nein: number
  nichtRelevant: number
  completionPercent: number
}

export interface AssessmentProgress {
  totalQuestions: number
  answeredJa: number
  answeredNein: number
  answeredNichtRelevant: number
  unanswered: number
  completionPercent: number
  implementationPercent: number
  checklistProgress: ChecklistProgress[]
  priorityProgress: Record<number, {
    total: number
    answered: number
    ja: number
    nein: number
    completionPercent: number
  }>
}

export const WibaService = {
  // === Checklisten & Prueffragen (read-only) ===

  async listChecklists() {
    return db
      .select()
      .from(wibaChecklists)
      .orderBy(wibaChecklists.sortOrder)
  },

  async getChecklistById(id: number) {
    const [checklist] = await db
      .select()
      .from(wibaChecklists)
      .where(eq(wibaChecklists.id, id))
      .limit(1)
    if (!checklist) return null

    const prueffragen = await db
      .select()
      .from(wibaPrueffragen)
      .where(eq(wibaPrueffragen.checklistId, id))
      .orderBy(wibaPrueffragen.questionNumber)

    return { ...checklist, prueffragen }
  },

  // === Assessments (CRUD, tenant-scoped) ===

  async createAssessment(tenantId: string, userId: string, data: CreateAssessmentInput): Promise<WibaAssessment> {
    const [assessment] = await db
      .insert(wibaAssessments)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        clientCompanyId: data.clientCompanyId,
        coordinatorId: userId,
        status: 'draft',
      })
      .returning()
    return assessment
  },

  async getAssessmentById(tenantId: string, id: string) {
    const [result] = await db
      .select({
        id: wibaAssessments.id,
        tenantId: wibaAssessments.tenantId,
        name: wibaAssessments.name,
        description: wibaAssessments.description,
        clientCompanyId: wibaAssessments.clientCompanyId,
        coordinatorId: wibaAssessments.coordinatorId,
        status: wibaAssessments.status,
        startedAt: wibaAssessments.startedAt,
        completedAt: wibaAssessments.completedAt,
        createdAt: wibaAssessments.createdAt,
        updatedAt: wibaAssessments.updatedAt,
        companyName: companies.name,
      })
      .from(wibaAssessments)
      .leftJoin(companies, eq(wibaAssessments.clientCompanyId, companies.id))
      .where(and(eq(wibaAssessments.tenantId, tenantId), eq(wibaAssessments.id, id)))
      .limit(1)
    return result ?? null
  },

  async listAssessments(tenantId: string, filters: WibaAssessmentFilters = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(wibaAssessments.tenantId, tenantId)]
    if (status) conditions.push(eq(wibaAssessments.status, status))

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: wibaAssessments.id,
          tenantId: wibaAssessments.tenantId,
          name: wibaAssessments.name,
          description: wibaAssessments.description,
          clientCompanyId: wibaAssessments.clientCompanyId,
          coordinatorId: wibaAssessments.coordinatorId,
          status: wibaAssessments.status,
          startedAt: wibaAssessments.startedAt,
          completedAt: wibaAssessments.completedAt,
          createdAt: wibaAssessments.createdAt,
          updatedAt: wibaAssessments.updatedAt,
          companyName: companies.name,
        })
        .from(wibaAssessments)
        .leftJoin(companies, eq(wibaAssessments.clientCompanyId, companies.id))
        .where(whereClause!)
        .orderBy(desc(wibaAssessments.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(wibaAssessments).where(whereClause!),
    ])

    // Get answer counts per assessment
    const assessmentIds = items.map((i) => i.id)
    let answerStats: Array<{ assessmentId: string; answered: number; ja: number; nein: number; nichtRelevant: number }> = []

    if (assessmentIds.length > 0) {
      answerStats = await db
        .select({
          assessmentId: wibaAnswers.assessmentId,
          answered: count(wibaAnswers.id),
          ja: sql<number>`count(*) filter (where ${wibaAnswers.answer} = 'ja')`,
          nein: sql<number>`count(*) filter (where ${wibaAnswers.answer} = 'nein')`,
          nichtRelevant: sql<number>`count(*) filter (where ${wibaAnswers.answer} = 'nicht_relevant')`,
        })
        .from(wibaAnswers)
        .where(sql`${wibaAnswers.assessmentId} IN (${sql.join(assessmentIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(wibaAnswers.assessmentId)
    }

    // Get total question count
    const [{ totalQs }] = await db
      .select({ totalQs: count() })
      .from(wibaPrueffragen)

    const statsMap = new Map(answerStats.map((s) => [s.assessmentId, s]))

    const enrichedItems = items.map((item) => {
      const stats = statsMap.get(item.id)
      return {
        ...item,
        answeredCount: stats ? Number(stats.answered) : 0,
        jaCount: stats ? Number(stats.ja) : 0,
        neinCount: stats ? Number(stats.nein) : 0,
        nichtRelevantCount: stats ? Number(stats.nichtRelevant) : 0,
        totalQuestions: Number(totalQs),
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

  async updateAssessment(tenantId: string, id: string, data: Partial<{ name: string; description: string; status: string; completedAt: Date }>): Promise<WibaAssessment | null> {
    const [assessment] = await db
      .update(wibaAssessments)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(wibaAssessments.tenantId, tenantId), eq(wibaAssessments.id, id)))
      .returning()
    return assessment ?? null
  },

  async deleteAssessment(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(wibaAssessments)
      .where(and(eq(wibaAssessments.tenantId, tenantId), eq(wibaAssessments.id, id)))
      .returning({ id: wibaAssessments.id })
    return result.length > 0
  },

  // === Antworten ===

  async saveAnswer(tenantId: string, assessmentId: string, userId: string, data: SaveAnswerInput): Promise<WibaAnswer> {
    // Upsert: check if answer already exists
    const [existing] = await db
      .select()
      .from(wibaAnswers)
      .where(
        and(
          eq(wibaAnswers.assessmentId, assessmentId),
          eq(wibaAnswers.prueffrageId, data.prueffrageId)
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(wibaAnswers)
        .set({
          answer: data.answer,
          notizen: data.notizen ?? null,
          answeredBy: userId,
          answeredAt: new Date(),
        })
        .where(eq(wibaAnswers.id, existing.id))
        .returning()
      return updated
    }

    const [answer] = await db
      .insert(wibaAnswers)
      .values({
        tenantId,
        assessmentId,
        prueffrageId: data.prueffrageId,
        answer: data.answer,
        notizen: data.notizen ?? null,
        answeredBy: userId,
      })
      .returning()
    return answer
  },

  async saveBulkAnswers(tenantId: string, assessmentId: string, userId: string, answers: SaveAnswerInput[]): Promise<WibaAnswer[]> {
    const results: WibaAnswer[] = []
    for (const answer of answers) {
      const saved = await this.saveAnswer(tenantId, assessmentId, userId, answer)
      results.push(saved)
    }
    return results
  },

  async getAnswers(tenantId: string, assessmentId: string): Promise<WibaAnswer[]> {
    return db
      .select()
      .from(wibaAnswers)
      .where(and(eq(wibaAnswers.tenantId, tenantId), eq(wibaAnswers.assessmentId, assessmentId)))
  },

  async getAnswersByChecklist(tenantId: string, assessmentId: string, checklistId: number): Promise<WibaAnswer[]> {
    // Get prueffrage IDs for this checklist
    const prueffragen = await db
      .select({ id: wibaPrueffragen.id })
      .from(wibaPrueffragen)
      .where(eq(wibaPrueffragen.checklistId, checklistId))

    if (prueffragen.length === 0) return []

    const prueffrageIds = prueffragen.map((p) => p.id)

    return db
      .select()
      .from(wibaAnswers)
      .where(
        and(
          eq(wibaAnswers.tenantId, tenantId),
          eq(wibaAnswers.assessmentId, assessmentId),
          sql`${wibaAnswers.prueffrageId} IN (${sql.join(prueffrageIds.map(id => sql`${id}`), sql`, `)})`
        )
      )
  },

  // === Fortschritt & Statistik ===

  async getProgress(tenantId: string, assessmentId: string): Promise<AssessmentProgress> {
    // Get all checklists with their question counts
    const checklists = await db
      .select()
      .from(wibaChecklists)
      .orderBy(wibaChecklists.sortOrder)

    // Get all prueffragen grouped by checklist
    const allPrueffragen = await db
      .select({ id: wibaPrueffragen.id, checklistId: wibaPrueffragen.checklistId })
      .from(wibaPrueffragen)

    // Get all answers for this assessment
    const answers = await db
      .select()
      .from(wibaAnswers)
      .where(and(eq(wibaAnswers.tenantId, tenantId), eq(wibaAnswers.assessmentId, assessmentId)))

    // Build answer map: prueffrageId -> answer
    const answerMap = new Map(answers.map((a) => [a.prueffrageId, a.answer]))

    // Build checklist progress
    const checklistProgress: ChecklistProgress[] = checklists.map((cl) => {
      const clPrueffragen = allPrueffragen.filter((p) => p.checklistId === cl.id)
      const clAnswers = clPrueffragen.map((p) => answerMap.get(p.id)).filter(Boolean)
      const ja = clAnswers.filter((a) => a === 'ja').length
      const nein = clAnswers.filter((a) => a === 'nein').length
      const nichtRelevant = clAnswers.filter((a) => a === 'nicht_relevant').length

      return {
        checklistId: cl.id,
        name: cl.name,
        slug: cl.slug,
        priority: cl.priority,
        sortOrder: cl.sortOrder,
        total: clPrueffragen.length,
        answered: clAnswers.length,
        ja,
        nein,
        nichtRelevant,
        completionPercent: clPrueffragen.length > 0 ? Math.round((clAnswers.length / clPrueffragen.length) * 100) : 0,
      }
    })

    // Calculate totals
    const totalQuestions = allPrueffragen.length
    const answeredJa = answers.filter((a) => a.answer === 'ja').length
    const answeredNein = answers.filter((a) => a.answer === 'nein').length
    const answeredNichtRelevant = answers.filter((a) => a.answer === 'nicht_relevant').length
    const unanswered = totalQuestions - answers.length

    const completionPercent = totalQuestions > 0 ? Math.round((answers.length / totalQuestions) * 100) : 0
    const jaAndNein = answeredJa + answeredNein
    const implementationPercent = jaAndNein > 0 ? Math.round((answeredJa / jaAndNein) * 100) : 0

    // Build priority progress
    const priorityProgress: AssessmentProgress['priorityProgress'] = {}
    for (let p = 1; p <= 4; p++) {
      const pChecklists = checklistProgress.filter((c) => c.priority === p)
      const pTotal = pChecklists.reduce((sum, c) => sum + c.total, 0)
      const pAnswered = pChecklists.reduce((sum, c) => sum + c.answered, 0)
      const pJa = pChecklists.reduce((sum, c) => sum + c.ja, 0)
      const pNein = pChecklists.reduce((sum, c) => sum + c.nein, 0)
      priorityProgress[p] = {
        total: pTotal,
        answered: pAnswered,
        ja: pJa,
        nein: pNein,
        completionPercent: pTotal > 0 ? Math.round((pAnswered / pTotal) * 100) : 0,
      }
    }

    return {
      totalQuestions,
      answeredJa,
      answeredNein,
      answeredNichtRelevant,
      unanswered,
      completionPercent,
      implementationPercent,
      checklistProgress,
      priorityProgress,
    }
  },
}

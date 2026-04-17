/**
 * Grundschutz++ Audit Service
 * OSCAL-basierte Audits: Sessions erstellen, Controls bewerten, Scoring berechnen.
 */

import { db } from '@/lib/db'
import { grundschutzAuditSessions, grundschutzAnswers,
  grundschutzControls, grundschutzGroups,
  companies, users,
} from '@/lib/db/schema'
import type { GrundschutzAuditSession, GrundschutzAnswer } from '@/lib/db/schema'
import { eq, and, asc, desc, count, sql } from 'drizzle-orm'

export interface CreateAuditInput {
  title?: string
  clientCompanyId: string
  // Optional: Nur bestimmte Gruppen oder SecLevels pruefen
  filterGroups?: string[]
  filterSecLevel?: string
}

export interface SaveAnswerInput {
  controlId: string
  status: 'erfuellt' | 'teilweise' | 'nicht_erfuellt' | 'nicht_relevant' | 'offen'
  notes?: string
}

export interface AuditScoring {
  total: number
  erfuellt: number
  teilweise: number
  nichtErfuellt: number
  nichtRelevant: number
  offen: number
  erfuellungsgrad: number // Prozent (ohne nicht_relevant und offen)
  byGroup: Array<{
    groupId: string
    groupTitle: string
    total: number
    erfuellt: number
    erfuellungsgrad: number
  }>
}

export const GrundschutzAuditService = {
  /** Audit-Session erstellen */
  async create(consultantId: string, data: CreateAuditInput): Promise<GrundschutzAuditSession> {
    const [session] = await db.insert(grundschutzAuditSessions).values({
      consultantId,
      clientCompanyId: data.clientCompanyId,
      title: data.title || 'Grundschutz++ Audit',
      status: 'draft',
    }).returning()

    // Answers fuer alle relevanten Controls vorab anlegen (status=offen)
    let controlsQuery = db.select({ id: grundschutzControls.id }).from(grundschutzControls)

    const allControls = await controlsQuery.orderBy(asc(grundschutzControls.sortOrder))

    // Filter nach Gruppen wenn angegeben
    let filteredControls = allControls
    if (data.filterGroups && data.filterGroups.length > 0) {
      // Auch Untergruppen einschliessen
      const subGroups = await db.select({ id: grundschutzGroups.id, parentId: grundschutzGroups.parentId })
        .from(grundschutzGroups)
      const allGroupIds = new Set<string>()
      for (const gid of data.filterGroups) {
        allGroupIds.add(gid)
        for (const sg of subGroups) {
          if (sg.parentId === gid) allGroupIds.add(sg.id)
        }
      }
      const fullControls = await db.select({ id: grundschutzControls.id, groupId: grundschutzControls.groupId })
        .from(grundschutzControls).orderBy(asc(grundschutzControls.sortOrder))
      filteredControls = fullControls.filter(c => allGroupIds.has(c.groupId))
    }

    // Filter nach SecLevel wenn angegeben
    if (data.filterSecLevel) {
      const withLevel = await db.select({ id: grundschutzControls.id, secLevel: grundschutzControls.secLevel })
        .from(grundschutzControls)
      const levelSet = new Set(withLevel.filter(c => c.secLevel === data.filterSecLevel).map(c => c.id))
      filteredControls = filteredControls.filter(c => levelSet.has(c.id))
    }

    // Batch-Insert der Answers
    if (filteredControls.length > 0) {
      const answerRows = filteredControls.map(c => ({
        sessionId: session.id,
        controlId: c.id,
        status: 'offen' as const,
      }))
      for (let i = 0; i < answerRows.length; i += 100) {
        await db.insert(grundschutzAnswers).values(answerRows.slice(i, i + 100))
      }
    }

    return session
  },

  /** Session abrufen mit Statistiken */
  async getById(sessionId: string) {
    const [session] = await db.select({
      session: grundschutzAuditSessions,
      companyName: companies.name,
      consultantEmail: users.email,
      consultantFirstName: users.firstName,
    })
      .from(grundschutzAuditSessions)
      .leftJoin(companies, eq(grundschutzAuditSessions.clientCompanyId, companies.id))
      .leftJoin(users, eq(grundschutzAuditSessions.consultantId, users.id))
      .where(eq(grundschutzAuditSessions.id, sessionId))
      .limit(1)

    if (!session) return null

    // Antwort-Statistiken
    const stats = await db.select({
      status: grundschutzAnswers.status,
      count: count(),
    }).from(grundschutzAnswers)
      .where(eq(grundschutzAnswers.sessionId, sessionId))
      .groupBy(grundschutzAnswers.status)

    const statMap: Record<string, number> = {}
    for (const s of stats) statMap[s.status || 'offen'] = Number(s.count)

    return {
      ...session.session,
      companyName: session.companyName,
      consultantName: session.consultantFirstName ? `${session.consultantFirstName}` : session.consultantEmail,
      stats: statMap,
    }
  },

  /** Alle Sessions */
  async list() {
    const sessions = await db.select({
      session: grundschutzAuditSessions,
      companyName: companies.name,
    })
      .from(grundschutzAuditSessions)
      .leftJoin(companies, eq(grundschutzAuditSessions.clientCompanyId, companies.id))
      .orderBy(desc(grundschutzAuditSessions.createdAt))

    // Counts pro Session
    const answerCounts = await db.select({
      sessionId: grundschutzAnswers.sessionId,
      total: count(),
      erfuellt: sql<number>`count(*) filter (where ${grundschutzAnswers.status} = 'erfuellt')`,
      offen: sql<number>`count(*) filter (where ${grundschutzAnswers.status} = 'offen')`,
    }).from(grundschutzAnswers)
      .groupBy(grundschutzAnswers.sessionId)

    const countMap = new Map(answerCounts.map(c => [c.sessionId, c]))

    return sessions.map(s => {
      const c = countMap.get(s.session.id)
      return {
        ...s.session,
        companyName: s.companyName,
        totalControls: Number(c?.total || 0),
        erfuellt: Number(c?.erfuellt || 0),
        offen: Number(c?.offen || 0),
      }
    })
  },

  /** Session loeschen */
  async delete(sessionId: string): Promise<boolean> {
    const result = await db.delete(grundschutzAuditSessions)
      .where(eq(grundschutzAuditSessions.id, sessionId))
      .returning({ id: grundschutzAuditSessions.id })
    return result.length > 0
  },

  /** Session-Status aktualisieren */
  async updateStatus(sessionId: string, status: string): Promise<GrundschutzAuditSession | null> {
    const updates: Record<string, unknown> = { status, updatedAt: new Date() }
    if (status === 'in_progress' && !updates.startedAt) updates.startedAt = new Date()
    if (status === 'completed') updates.completedAt = new Date()

    const [session] = await db.update(grundschutzAuditSessions).set(updates)
      .where(eq(grundschutzAuditSessions.id, sessionId))
      .returning()
    return session || null
  },

  /** Answers einer Session abrufen (mit Control-Details) */
  async getAnswers(sessionId: string, groupId?: string) {
    const answers = await db.select({
      answer: grundschutzAnswers,
      controlTitle: grundschutzControls.title,
      controlStatement: grundschutzControls.statement,
      controlGuidance: grundschutzControls.guidance,
      controlModalVerb: grundschutzControls.modalVerb,
      controlActionWord: grundschutzControls.actionWord,
      controlResult: grundschutzControls.result,
      controlSecLevel: grundschutzControls.secLevel,
      controlEffortLevel: grundschutzControls.effortLevel,
      controlGroupId: grundschutzControls.groupId,
      controlSortOrder: grundschutzControls.sortOrder,
    })
      .from(grundschutzAnswers)
      .leftJoin(grundschutzControls, eq(grundschutzAnswers.controlId, grundschutzControls.id))
      .where(eq(grundschutzAnswers.sessionId, sessionId))
      .orderBy(asc(grundschutzControls.sortOrder))

    if (groupId) {
      // Auch Untergruppen
      const subs = await db.select({ id: grundschutzGroups.id }).from(grundschutzGroups)
        .where(eq(grundschutzGroups.parentId, groupId))
      const ids = new Set([groupId, ...subs.map(s => s.id)])
      return answers.filter(a => a.controlGroupId && ids.has(a.controlGroupId))
    }

    return answers
  },

  /** Einzelne Antwort speichern */
  async saveAnswer(sessionId: string, data: SaveAnswerInput): Promise<GrundschutzAnswer> {
    // Prüfe ob Answer existiert
    const [existing] = await db.select().from(grundschutzAnswers)
      .where(and(
        eq(grundschutzAnswers.sessionId, sessionId),
        eq(grundschutzAnswers.controlId, data.controlId))).limit(1)

    if (existing) {
      const [updated] = await db.update(grundschutzAnswers).set({
        status: data.status,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        answeredAt: data.status !== 'offen' ? new Date() : null,
      }).where(eq(grundschutzAnswers.id, existing.id)).returning()
      return updated
    }

    // Neu anlegen
    const [answer] = await db.insert(grundschutzAnswers).values({
      sessionId,
      controlId: data.controlId,
      status: data.status,
      notes: data.notes || null,
      answeredAt: data.status !== 'offen' ? new Date() : null,
    }).returning()
    return answer
  },

  /** Batch-Answers speichern */
  async saveAnswersBatch(sessionId: string, answers: SaveAnswerInput[]): Promise<number> {
    let saved = 0
    for (const a of answers) {
      await this.saveAnswer(sessionId, a)
      saved++
    }
    return saved
  },

  /** Scoring berechnen */
  async getScoring(sessionId: string): Promise<AuditScoring> {
    const answers = await db.select({
      status: grundschutzAnswers.status,
      groupId: grundschutzControls.groupId,
    })
      .from(grundschutzAnswers)
      .leftJoin(grundschutzControls, eq(grundschutzAnswers.controlId, grundschutzControls.id))
      .where(eq(grundschutzAnswers.sessionId, sessionId))

    const groups = await db.select().from(grundschutzGroups).where(eq(grundschutzGroups.parentId, sql`NULL`)).orderBy(asc(grundschutzGroups.sortOrder))
    // Fallback: alle Gruppen ohne Parent
    const topGroups = groups.length > 0 ? groups : await db.select().from(grundschutzGroups).orderBy(asc(grundschutzGroups.sortOrder))

    // Untergruppen-Map
    const allGroups = await db.select().from(grundschutzGroups)
    const parentMap = new Map<string, string>()
    for (const g of allGroups) {
      if (g.parentId) parentMap.set(g.id, g.parentId)
    }

    const getTopGroup = (gid: string): string => parentMap.get(gid) || gid

    // Gesamt
    let erfuellt = 0, teilweise = 0, nichtErfuellt = 0, nichtRelevant = 0, offen = 0
    const byGroupMap = new Map<string, { total: number; erfuellt: number }>()

    for (const a of answers) {
      const status = a.status || 'offen'
      if (status === 'erfuellt') erfuellt++
      else if (status === 'teilweise') teilweise++
      else if (status === 'nicht_erfuellt') nichtErfuellt++
      else if (status === 'nicht_relevant') nichtRelevant++
      else offen++

      const topGid = a.groupId ? getTopGroup(a.groupId) : 'unknown'
      if (!byGroupMap.has(topGid)) byGroupMap.set(topGid, { total: 0, erfuellt: 0 })
      const g = byGroupMap.get(topGid)!
      g.total++
      if (status === 'erfuellt') g.erfuellt++
    }

    const total = answers.length
    const bewertbar = erfuellt + teilweise + nichtErfuellt
    const erfuellungsgrad = bewertbar > 0 ? Math.round((erfuellt / bewertbar) * 100) : 0

    const groupTitleMap = new Map(topGroups.map(g => [g.id, g.title]))

    const byGroup = Array.from(byGroupMap.entries())
      .filter(([gid]) => groupTitleMap.has(gid))
      .map(([gid, data]) => ({
        groupId: gid,
        groupTitle: groupTitleMap.get(gid) || gid,
        total: data.total,
        erfuellt: data.erfuellt,
        erfuellungsgrad: data.total > 0 ? Math.round((data.erfuellt / data.total) * 100) : 0,
      }))

    return { total, erfuellt, teilweise, nichtErfuellt, nichtRelevant, offen, erfuellungsgrad, byGroup }
  },
}

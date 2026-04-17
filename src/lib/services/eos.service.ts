import { db } from '@/lib/db'
import {
  vto, rocks, rockMilestones, scorecardMetrics, scorecardEntries,
  eosIssues, meetingSessions,
} from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'
import { eq, and, desc, asc } from 'drizzle-orm'

export const EosService = {
  // ── VTO ──────────────────────────────────────────────────────────────
  async getVTO(_tenantId: string) {
    const [row] = await db.select().from(vto)
      .where(eq(vto.isActive, true))
      .limit(1)
    return row ?? null
  },

  async upsertVTO(_tenantId: string, data: Record<string, unknown>, userId?: string) {
    const existing = await this.getVTO(_tenantId)
    if (existing) {
      const [updated] = await db.update(vto).set({
        ...data, updatedBy: userId || null, updatedAt: new Date(),
      }).where(eq(vto.id, existing.id)).returning()
      return updated
    }
    const [created] = await db.insert(vto).values({
      tenantId: TENANT_ID, ...data, updatedBy: userId || null,
    }).returning()
    return created
  },

  // ── Rocks ────────────────────────────────────────────────────────────
  async listRocks(_tenantId: string, quarter?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (quarter) conditions.push(eq(rocks.quarter, quarter))
    const rows = await db.select().from(rocks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(rocks.createdAt))
    return rows
  },

  async getRock(_tenantId: string, id: string) {
    const [rock] = await db.select().from(rocks)
      .where(eq(rocks.id, id))
    if (!rock) return null
    const milestones = await db.select().from(rockMilestones)
      .where(eq(rockMilestones.rockId, id)).orderBy(asc(rockMilestones.sequence))
    return { ...rock, milestones }
  },

  async createRock(_tenantId: string, data: Record<string, unknown>) {
    const [rock] = await db.insert(rocks).values({
      title: data.title as string,
      description: (data.description as string) || null,
      ownerId: (data.ownerId as string) || null,
      quarter: data.quarter as string,
      dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
      status: (data.status as string) || 'on-track',
    }).returning()
    return rock
  },

  async updateRock(_tenantId: string, id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.ownerId !== undefined) updates.ownerId = data.ownerId
    if (data.status !== undefined) updates.status = data.status
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate ? new Date(data.dueDate as string) : null
    const [rock] = await db.update(rocks).set(updates)
      .where(eq(rocks.id, id)).returning()
    return rock ?? null
  },

  async deleteRock(_tenantId: string, id: string) {
    await db.delete(rockMilestones).where(eq(rockMilestones.rockId, id))
    const result = await db.delete(rocks)
      .where(eq(rocks.id, id)).returning({ id: rocks.id })
    return result.length > 0
  },

  async addMilestone(rockId: string, data: Record<string, unknown>) {
    const [ms] = await db.insert(rockMilestones).values({
      rockId,
      title: data.title as string,
      dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
      sequence: (data.sequence as number) || 0,
    }).returning()
    return ms
  },

  async toggleMilestone(milestoneId: string) {
    const [ms] = await db.select().from(rockMilestones).where(eq(rockMilestones.id, milestoneId))
    if (!ms) return null
    const [updated] = await db.update(rockMilestones)
      .set({ completed: !ms.completed }).where(eq(rockMilestones.id, milestoneId)).returning()
    return updated
  },

  // ── Scorecard ────────────────────────────────────────────────────────
  async listMetrics(_tenantId: string) {
    return db.select().from(scorecardMetrics)
      .where(eq(scorecardMetrics.isActive, true))
      .orderBy(asc(scorecardMetrics.sequence))
  },

  async createMetric(_tenantId: string, data: Record<string, unknown>) {
    const [metric] = await db.insert(scorecardMetrics).values({
      name: data.name as string,
      ownerId: (data.ownerId as string) || null,
      goal: data.goal != null ? String(data.goal) : null,
      unit: (data.unit as string) || 'Stk',
    }).returning()
    return metric
  },

  async updateMetric(_tenantId: string, id: string, data: Record<string, unknown>) {
    const [metric] = await db.update(scorecardMetrics).set(data)
      .where(eq(scorecardMetrics.id, id)).returning()
    return metric ?? null
  },

  async deleteMetric(_tenantId: string, id: string) {
    await db.delete(scorecardEntries).where(eq(scorecardEntries.metricId, id))
    const r = await db.delete(scorecardMetrics)
      .where(eq(scorecardMetrics.id, id)).returning({ id: scorecardMetrics.id })
    return r.length > 0
  },

  async getEntries(metricId: string, limit = 13) {
    return db.select().from(scorecardEntries)
      .where(eq(scorecardEntries.metricId, metricId))
      .orderBy(desc(scorecardEntries.week)).limit(limit)
  },

  async upsertEntry(metricId: string, week: string, actual: number, note?: string) {
    const [existing] = await db.select().from(scorecardEntries)
      .where(and(eq(scorecardEntries.metricId, metricId), eq(scorecardEntries.week, week)))
    if (existing) {
      const [updated] = await db.update(scorecardEntries)
        .set({ actual: String(actual), note: note || null })
        .where(eq(scorecardEntries.id, existing.id)).returning()
      return updated
    }
    const [created] = await db.insert(scorecardEntries).values({
      metricId, week, actual: String(actual), note: note || null,
    }).returning()
    return created
  },

  // ── Issues (IDS) ─────────────────────────────────────────────────────
  async listIssues(_tenantId: string, status?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (status) conditions.push(eq(eosIssues.status, status))
    return db.select().from(eosIssues)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(eosIssues.createdAt))
  },

  async createIssue(_tenantId: string, data: Record<string, unknown>) {
    const [issue] = await db.insert(eosIssues).values({
      title: data.title as string,
      description: (data.description as string) || null,
      priority: (data.priority as string) || 'medium',
      createdBy: (data.createdBy as string) || null,
    }).returning()
    return issue
  },

  async updateIssue(_tenantId: string, id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.status !== undefined) updates.status = data.status
    if (data.solution !== undefined) updates.solution = data.solution
    if (data.status === 'solved') updates.solvedAt = new Date()
    const [issue] = await db.update(eosIssues).set(updates)
      .where(eq(eosIssues.id, id)).returning()
    return issue ?? null
  },

  async deleteIssue(_tenantId: string, id: string) {
    const r = await db.delete(eosIssues)
      .where(eq(eosIssues.id, id)).returning({ id: eosIssues.id })
    return r.length > 0
  },

  // ── Meeting Sessions (L10) ───────────────────────────────────────────
  async listMeetings(_tenantId: string) {
    return db.select().from(meetingSessions)
      .orderBy(desc(meetingSessions.meetingDate))
  },

  async createMeeting(_tenantId: string, data: Record<string, unknown>) {
    const [meeting] = await db.insert(meetingSessions).values({
      title: (data.title as string) || 'L10 Meeting',
      attendees: (data.attendees as string[]) || [],
    }).returning()
    return meeting
  },

  async updateMeeting(_tenantId: string, id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = {}
    if (data.title !== undefined) updates.title = data.title
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.agenda !== undefined) updates.agenda = data.agenda
    if (data.todoItems !== undefined) updates.todoItems = data.todoItems
    if (data.issuesDiscussed !== undefined) updates.issuesDiscussed = data.issuesDiscussed
    if (data.status === 'closed') { updates.status = 'closed'; updates.closedAt = new Date() }
    const [meeting] = await db.update(meetingSessions).set(updates)
      .where(eq(meetingSessions.id, id)).returning()
    return meeting ?? null
  },
}

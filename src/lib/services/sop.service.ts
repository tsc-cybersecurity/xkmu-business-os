import { db } from '@/lib/db'
import { sopDocuments, sopSteps, sopVersions } from '@/lib/db/schema'
import { eq, and, desc, asc, ilike, or, isNull } from 'drizzle-orm'

export const SopService = {
  // ── Documents ────────────────────────────────────────────────────────
  async list(tenantId: string, filters?: { category?: string; status?: string; search?: string }) {
    const conditions = [eq(sopDocuments.tenantId, tenantId), isNull(sopDocuments.deletedAt)]
    if (filters?.category) conditions.push(eq(sopDocuments.category, filters.category))
    if (filters?.status) conditions.push(eq(sopDocuments.status, filters.status))
    if (filters?.search) {
      conditions.push(
        or(
          ilike(sopDocuments.title, `%${filters.search}%`),
          ilike(sopDocuments.purpose, `%${filters.search}%`),
        )!
      )
    }
    return db.select().from(sopDocuments)
      .where(and(...conditions)).orderBy(desc(sopDocuments.updatedAt))
  },

  async getById(tenantId: string, id: string) {
    const [doc] = await db.select().from(sopDocuments)
      .where(and(eq(sopDocuments.tenantId, tenantId), eq(sopDocuments.id, id), isNull(sopDocuments.deletedAt)))
    if (!doc) return null
    const steps = await db.select().from(sopSteps)
      .where(eq(sopSteps.sopId, id)).orderBy(asc(sopSteps.sequence))
    const versions = await db.select().from(sopVersions)
      .where(eq(sopVersions.sopId, id)).orderBy(desc(sopVersions.createdAt))
    return { ...doc, steps, versions }
  },

  async create(tenantId: string, data: Record<string, unknown>) {
    const [doc] = await db.insert(sopDocuments).values({
      tenantId,
      title: data.title as string,
      category: data.category as string,
      version: (data.version as string) || '1.0.0',
      status: (data.status as string) || 'draft',
      ownerId: (data.ownerId as string) || null,
      purpose: (data.purpose as string) || null,
      scope: (data.scope as string) || null,
      tools: (data.tools as string[]) || [],
      tags: (data.tags as string[]) || [],
      reviewDate: data.reviewDate ? new Date(data.reviewDate as string) : null,
    }).returning()
    return doc
  },

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.category !== undefined) updates.category = data.category
    if (data.status !== undefined) updates.status = data.status
    if (data.purpose !== undefined) updates.purpose = data.purpose
    if (data.scope !== undefined) updates.scope = data.scope
    if (data.tools !== undefined) updates.tools = data.tools
    if (data.tags !== undefined) updates.tags = data.tags
    if (data.ownerId !== undefined) updates.ownerId = data.ownerId
    if (data.reviewDate !== undefined) updates.reviewDate = data.reviewDate ? new Date(data.reviewDate as string) : null
    const [doc] = await db.update(sopDocuments).set(updates)
      .where(and(eq(sopDocuments.tenantId, tenantId), eq(sopDocuments.id, id))).returning()
    return doc ?? null
  },

  async delete(tenantId: string, id: string) {
    const [doc] = await db.update(sopDocuments).set({ deletedAt: new Date() })
      .where(and(eq(sopDocuments.tenantId, tenantId), eq(sopDocuments.id, id))).returning()
    return !!doc
  },

  async publish(tenantId: string, id: string, userId?: string) {
    // Snapshot current state as version
    const current = await this.getById(tenantId, id)
    if (!current) return null
    const nextVersion = incrementVersion(current.version || '1.0.0')
    await db.insert(sopVersions).values({
      sopId: id,
      version: current.version || '1.0.0',
      changeNote: `Freigabe Version ${current.version}`,
      snapshot: { title: current.title, steps: current.steps },
      createdBy: userId || null,
    })
    const [doc] = await db.update(sopDocuments).set({
      status: 'approved',
      version: nextVersion,
      approvedAt: new Date(),
      approvedBy: userId || null,
      updatedAt: new Date(),
    }).where(eq(sopDocuments.id, id)).returning()
    return doc
  },

  // ── Steps ────────────────────────────────────────────────────────────
  async setSteps(sopId: string, steps: Array<Record<string, unknown>>) {
    await db.delete(sopSteps).where(eq(sopSteps.sopId, sopId))
    if (steps.length === 0) return []
    const values = steps.map((s, i) => ({
      sopId,
      sequence: (s.sequence as number) ?? i + 1,
      title: s.title as string,
      description: (s.description as string) || null,
      responsible: (s.responsible as string) || null,
      estimatedMinutes: (s.estimatedMinutes as number) || null,
      checklistItems: (s.checklistItems as string[]) || [],
      warnings: (s.warnings as string[]) || [],
    }))
    return db.insert(sopSteps).values(values).returning()
  },

  async addStep(sopId: string, data: Record<string, unknown>) {
    const existing = await db.select({ seq: sopSteps.sequence }).from(sopSteps)
      .where(eq(sopSteps.sopId, sopId)).orderBy(desc(sopSteps.sequence)).limit(1)
    const nextSeq = (existing[0]?.seq || 0) + 1
    const [step] = await db.insert(sopSteps).values({
      sopId,
      sequence: (data.sequence as number) ?? nextSeq,
      title: data.title as string,
      description: (data.description as string) || null,
      responsible: (data.responsible as string) || null,
      estimatedMinutes: (data.estimatedMinutes as number) || null,
      checklistItems: (data.checklistItems as string[]) || [],
      warnings: (data.warnings as string[]) || [],
    }).returning()
    return step
  },

  async updateStep(stepId: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = {}
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.responsible !== undefined) updates.responsible = data.responsible
    if (data.sequence !== undefined) updates.sequence = data.sequence
    if (data.estimatedMinutes !== undefined) updates.estimatedMinutes = data.estimatedMinutes
    if (data.checklistItems !== undefined) updates.checklistItems = data.checklistItems
    if (data.warnings !== undefined) updates.warnings = data.warnings
    const [step] = await db.update(sopSteps).set(updates)
      .where(eq(sopSteps.id, stepId)).returning()
    return step ?? null
  },

  async deleteStep(stepId: string) {
    const r = await db.delete(sopSteps).where(eq(sopSteps.id, stepId)).returning({ id: sopSteps.id })
    return r.length > 0
  },

  // ── Versions ─────────────────────────────────────────────────────────
  async listVersions(sopId: string) {
    return db.select().from(sopVersions)
      .where(eq(sopVersions.sopId, sopId)).orderBy(desc(sopVersions.createdAt))
  },

  // ── Categories ───────────────────────────────────────────────────────
  getCategories() {
    return [
      'Vertrieb', 'Marketing', 'Projektmanagement', 'IT & Cybersicherheit',
      'Finanzen & Buchhaltung', 'HR & Onboarding', 'Kundenservice', 'Compliance & DSGVO',
    ]
  },
}

function incrementVersion(v: string): string {
  const parts = v.split('.').map(Number)
  parts[2] = (parts[2] || 0) + 1
  return parts.join('.')
}

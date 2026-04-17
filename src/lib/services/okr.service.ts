import { db } from '@/lib/db'
import { okrCycles, okrObjectives, okrKeyResults, okrCheckins } from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'

export const OkrService = {
  // ── Cycles ───────────────────────────────────────────────────────────
  async listCycles() {
    return db.select().from(okrCycles)
      .orderBy(desc(okrCycles.startDate))
  },

  async getActiveCycle() {
    const [cycle] = await db.select().from(okrCycles)
      .where(eq(okrCycles.isActive, true))
      .limit(1)
    return cycle ?? null
  },

  async createCycle(data: Record<string, unknown>) {
    const [cycle] = await db.insert(okrCycles).values({
      name: data.name as string,
      type: (data.type as string) || 'quarterly',
      startDate: new Date(data.startDate as string),
      endDate: new Date(data.endDate as string),
      isActive: (data.isActive as boolean) ?? false,
    }).returning()
    return cycle
  },

  async updateCycle(id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.isActive !== undefined) updates.isActive = data.isActive
    if (data.startDate !== undefined) updates.startDate = new Date(data.startDate as string)
    if (data.endDate !== undefined) updates.endDate = new Date(data.endDate as string)
    // Deactivate other cycles when activating one (single-org: deactivate all)
    if (data.isActive === true) {
      await db.update(okrCycles).set({ isActive: false })
    }
    const [cycle] = await db.update(okrCycles).set(updates)
      .where(eq(okrCycles.id, id)).returning()
    return cycle ?? null
  },

  async deleteCycle(id: string) {
    const r = await db.delete(okrCycles)
      .where(eq(okrCycles.id, id)).returning({ id: okrCycles.id })
    return r.length > 0
  },

  // ── Objectives ───────────────────────────────────────────────────────
  async listObjectives(cycleId?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (cycleId) conditions.push(eq(okrObjectives.cycleId, cycleId))
    const objectives = await db.select().from(okrObjectives)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(okrObjectives.createdAt))

    const result = await Promise.all(objectives.map(async (obj) => {
      const krs = await db.select().from(okrKeyResults)
        .where(eq(okrKeyResults.objectiveId, obj.id)).orderBy(asc(okrKeyResults.sequence))
      const progress = krs.length > 0
        ? Math.round(krs.reduce((sum, kr) => {
            const start = Number(kr.startValue) || 0
            const target = Number(kr.targetValue) || 1
            const current = Number(kr.currentValue) || 0
            const range = target - start
            return sum + (range > 0 ? Math.min(100, ((current - start) / range) * 100) : 0)
          }, 0) / krs.length)
        : 0
      return { ...obj, keyResults: krs, progress }
    }))
    return result
  },

  async createObjective(data: Record<string, unknown>) {
    const [obj] = await db.insert(okrObjectives).values({
      cycleId: data.cycleId as string,
      title: data.title as string,
      description: (data.description as string) || null,
      ownerId: (data.ownerId as string) || null,
      status: (data.status as string) || 'active',
    }).returning()
    return obj
  },

  async updateObjective(id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.ownerId !== undefined) updates.ownerId = data.ownerId
    if (data.status !== undefined) updates.status = data.status
    const [obj] = await db.update(okrObjectives).set(updates)
      .where(eq(okrObjectives.id, id)).returning()
    return obj ?? null
  },

  async deleteObjective(id: string) {
    const r = await db.delete(okrObjectives)
      .where(eq(okrObjectives.id, id)).returning({ id: okrObjectives.id })
    return r.length > 0
  },

  // ── Key Results ──────────────────────────────────────────────────────
  async addKeyResult(objectiveId: string, data: Record<string, unknown>) {
    const [kr] = await db.insert(okrKeyResults).values({
      objectiveId,
      title: data.title as string,
      startValue: String(data.startValue ?? 0),
      targetValue: String(data.targetValue as number),
      currentValue: String(data.currentValue ?? 0),
      unit: (data.unit as string) || '%',
      confidence: (data.confidence as number) ?? 1,
    }).returning()
    return kr
  },

  async updateKeyResult(id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.targetValue !== undefined) updates.targetValue = String(data.targetValue)
    if (data.currentValue !== undefined) updates.currentValue = String(data.currentValue)
    if (data.confidence !== undefined) updates.confidence = data.confidence
    if (data.unit !== undefined) updates.unit = data.unit
    const [kr] = await db.update(okrKeyResults).set(updates)
      .where(eq(okrKeyResults.id, id)).returning()
    return kr ?? null
  },

  async deleteKeyResult(id: string) {
    await db.delete(okrCheckins).where(eq(okrCheckins.keyResultId, id))
    const r = await db.delete(okrKeyResults).where(eq(okrKeyResults.id, id)).returning({ id: okrKeyResults.id })
    return r.length > 0
  },

  // ── Check-ins ────────────────────────────────────────────────────────
  async addCheckin(keyResultId: string, data: Record<string, unknown>) {
    const [checkin] = await db.insert(okrCheckins).values({
      keyResultId,
      value: String(data.value as number),
      confidence: (data.confidence as number) ?? null,
      note: (data.note as string) || null,
      createdBy: (data.createdBy as string) || null,
    }).returning()
    // Update current value on key result
    await db.update(okrKeyResults).set({
      currentValue: String(data.value),
      confidence: (data.confidence as number) ?? undefined,
      updatedAt: new Date(),
    }).where(eq(okrKeyResults.id, keyResultId))
    return checkin
  },

  async listCheckins(keyResultId: string) {
    return db.select().from(okrCheckins)
      .where(eq(okrCheckins.keyResultId, keyResultId))
      .orderBy(desc(okrCheckins.createdAt))
  },

  // ── Dashboard ────────────────────────────────────────────────────────
  async getDashboard() {
    const activeCycle = await this.getActiveCycle()
    if (!activeCycle) return { cycle: null, objectives: [], overallProgress: 0 }
    const objectives = await this.listObjectives(activeCycle.id)
    const overallProgress = objectives.length > 0
      ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
      : 0
    return { cycle: activeCycle, objectives, overallProgress }
  },
}

import { db } from '@/lib/db'
import { deliverables, deliverableModules, sopDocuments } from '@/lib/db/schema'
import { eq, and, desc, sql, isNull } from 'drizzle-orm'

export const DeliverableService = {
  async list(filters?: { moduleId?: string; categoryCode?: string; status?: string }
  ) {
    const conditions: ReturnType<typeof eq>[] = []
    if (filters?.moduleId) conditions.push(eq(deliverables.moduleId, filters.moduleId))
    if (filters?.categoryCode) conditions.push(eq(deliverables.categoryCode, filters.categoryCode))
    if (filters?.status) conditions.push(eq(deliverables.status, filters.status))
    const rows = await db.select({
      id: deliverables.id,
      moduleId: deliverables.moduleId,
      name: deliverables.name,
      description: deliverables.description,
      format: deliverables.format,
      umfang: deliverables.umfang,
      trigger: deliverables.trigger,
      category: deliverables.category,
      categoryCode: deliverables.categoryCode,
      status: deliverables.status,
      version: deliverables.version,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
      moduleCode: deliverableModules.code,
      moduleName: deliverableModules.name,
    }).from(deliverables)
      .leftJoin(deliverableModules, eq(deliverables.moduleId, deliverableModules.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(deliverableModules.code, deliverables.name)
    return rows.map(r => ({
      ...r,
      module: r.moduleCode ? { code: r.moduleCode, name: r.moduleName } : null,
    }))
  },

  async getById(id: string) {
    const [deliverable] = await db.select().from(deliverables)
      .where(eq(deliverables.id, id))
    if (!deliverable) return null

    const [module] = deliverable.moduleId
      ? await db.select().from(deliverableModules)
          .where(eq(deliverableModules.id, deliverable.moduleId))
      : []

    const producingSops = await db.select({
      id: sopDocuments.id,
      title: sopDocuments.title,
      category: sopDocuments.category,
      status: sopDocuments.status,
      automationLevel: sopDocuments.automationLevel,
      maturityLevel: sopDocuments.maturityLevel,
      sourceTaskId: sopDocuments.sourceTaskId,
    }).from(sopDocuments).where(
      and(
        eq(sopDocuments.producesDeliverableId, id),
        isNull(sopDocuments.deletedAt))
    ).orderBy(sopDocuments.title)

    return { ...deliverable, module: module ?? null, producingSops }
  },

  async create(data: Record<string, unknown>) {
    const [doc] = await db.insert(deliverables).values({
      name: data.name as string,
      description: (data.description as string) || null,
      format: (data.format as string) || null,
      umfang: (data.umfang as string) || null,
      trigger: (data.trigger as string) || null,
      category: (data.category as string) || null,
      categoryCode: (data.categoryCode as string) || null,
      moduleId: (data.moduleId as string) || null,
      status: (data.status as string) || 'draft',
      version: (data.version as string) || '1.0.0',
    }).returning()
    return doc
  },

  async update(id: string, data: Record<string, unknown>) {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.format !== undefined) updates.format = data.format
    if (data.umfang !== undefined) updates.umfang = data.umfang
    if (data.trigger !== undefined) updates.trigger = data.trigger
    if (data.category !== undefined) updates.category = data.category
    if (data.categoryCode !== undefined) updates.categoryCode = data.categoryCode
    if (data.moduleId !== undefined) updates.moduleId = data.moduleId
    if (data.status !== undefined) updates.status = data.status
    const [doc] = await db.update(deliverables).set(updates)
      .where(eq(deliverables.id, id))
      .returning()
    return doc ?? null
  },

  async delete(id: string): Promise<boolean> {
    const r = await db.delete(deliverables)
      .where(eq(deliverables.id, id))
      .returning({ id: deliverables.id })
    return r.length > 0
  },

  async getModulesWithCount() {
    const modules = await db.select().from(deliverableModules)
      .orderBy(deliverableModules.code)
    const counts = await db.select({
      moduleId: deliverables.moduleId,
      count: sql<number>`count(*)::int`,
    }).from(deliverables)
      .groupBy(deliverables.moduleId)
    const countMap = Object.fromEntries(counts.map((c) => [c.moduleId, c.count]))
    return modules.map((m) => ({ ...m, deliverableCount: countMap[m.id] ?? 0 }))
  },
}

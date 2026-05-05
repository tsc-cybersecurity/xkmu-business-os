import { db } from '@/lib/db'
import { sopDocuments, sopSteps, sopVersions, deliverables, processes, processTasks } from '@/lib/db/schema'
import { eq, and, desc, asc, ilike, or, isNull } from 'drizzle-orm'

// ── Consolidated row shape (SOPs + Process-Tasks ohne SOP) ───────────────
export type ConsolidatedRow = {
  kind: 'sop' | 'task-only'
  // Identitaet (genau eins von beiden gefuellt; sopId fehlt bei task-only)
  sopId: string | null
  taskId: string | null
  taskKey: string | null
  // Anzeige
  title: string
  category: string | null
  subprocess: string | null
  // Prozess-Kontext
  processKey: string | null
  processName: string | null
  // SOP-Felder (null bei task-only)
  status: string | null              // draft|review|approved|archived
  version: string | null
  automationLevel: string | null     // manual|semi|full
  aiCapable: boolean | null
  maturityLevel: number | null
  estimatedDurationMinutes: number | null
  // Process-Task-Felder (null wenn keine Task verknuepft)
  appStatus: string | null           // none|partial|full
  appModule: string | null
  appNotes: string | null
  devRequirementCount: number        // Laenge devRequirements[] (0 wenn keine)
  // Coverage-Klassifikation (vorberechnet fuer Filter + Stats)
  coverage: 'automated' | 'progress' | 'gap'
  // Sonstiges
  updatedAt: Date | null
}

export const SopService = {
  // ── Documents ────────────────────────────────────────────────────────
  async list(filters?: { category?: string; status?: string; search?: string }) {
    const conditions = [isNull(sopDocuments.deletedAt)]
    if (filters?.category) conditions.push(eq(sopDocuments.category, filters.category))
    if (filters?.status) conditions.push(eq(sopDocuments.status, filters.status))
    if (filters?.search) {
      conditions.push(
        or(
          ilike(sopDocuments.title, `%${filters.search}%`),
          ilike(sopDocuments.purpose, `%${filters.search}%`))!
      )
    }
    return db.select().from(sopDocuments)
      .where(and(...conditions)).orderBy(desc(sopDocuments.updatedAt))
  },

  async getById(id: string) {
    const [doc] = await db.select().from(sopDocuments)
      .where(and(eq(sopDocuments.id, id), isNull(sopDocuments.deletedAt)))
    if (!doc) return null
    const steps = await db.select().from(sopSteps)
      .where(eq(sopSteps.sopId, id)).orderBy(asc(sopSteps.sequence))
    const versions = await db.select().from(sopVersions)
      .where(eq(sopVersions.sopId, id)).orderBy(desc(sopVersions.createdAt))
    return { ...doc, steps, versions }
  },

  async getByIdWithDeliverable(id: string) {
    const [doc] = await db.select().from(sopDocuments)
      .where(and(eq(sopDocuments.id, id), isNull(sopDocuments.deletedAt)))
    if (!doc) return null
    const steps = await db.select().from(sopSteps)
      .where(eq(sopSteps.sopId, id)).orderBy(asc(sopSteps.sequence))
    const versions = await db.select().from(sopVersions)
      .where(eq(sopVersions.sopId, id)).orderBy(desc(sopVersions.createdAt))
    // Fetch linked deliverable if producesDeliverableId is set
    let producesDeliverable = null
    if (doc.producesDeliverableId) {
      const [del] = await db.select().from(deliverables)
        .where(eq(deliverables.id, doc.producesDeliverableId))
      producesDeliverable = del ?? null
    }
    // Fetch linked process task (for "Prozess-Kontext"-Block) if sourceTaskId is set
    let linkedTask: typeof processTasks.$inferSelect | null = null
    let linkedProcess: { key: string; name: string } | null = null
    if (doc.sourceTaskId) {
      const [taskRow] = await db
        .select({ task: processTasks, process: processes })
        .from(processTasks)
        .innerJoin(processes, eq(processes.id, processTasks.processId))
        .where(eq(processTasks.taskKey, doc.sourceTaskId))
      if (taskRow) {
        linkedTask = taskRow.task
        linkedProcess = { key: taskRow.process.key, name: taskRow.process.name }
      }
    }
    return { ...doc, steps, versions, producesDeliverable, linkedTask, linkedProcess }
  },

  async create(data: Record<string, unknown>) {
    const [doc] = await db.insert(sopDocuments).values({
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
      subprocess: (data.subprocess as string) || null,
      sourceTaskId: (data.sourceTaskId as string) || null,
    }).returning()
    return doc
  },

  async update(id: string, data: Record<string, unknown>) {
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
      .where(eq(sopDocuments.id, id)).returning()
    return doc ?? null
  },

  async delete(id: string) {
    const [doc] = await db.update(sopDocuments).set({ deletedAt: new Date() })
      .where(eq(sopDocuments.id, id)).returning()
    return !!doc
  },

  async publish(id: string, userId?: string) {
    // Snapshot current state as version
    const current = await this.getById(id)
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

  // ── Consolidated View (SOPs + Process-Tasks ohne SOP) ────────────────
  async listConsolidated(filters?: {
    category?: string
    status?: string
    search?: string
    automation?: 'all' | 'automated' | 'progress' | 'gap'
    processKey?: string
  }): Promise<ConsolidatedRow[]> {
    // 1) Alle SOPs + LEFT JOIN process_tasks (via source_task_id == task_key)
    //    + LEFT JOIN processes (via process_tasks.processId)
    const sopRows = await db
      .select({
        sop: sopDocuments,
        task: processTasks,
        process: processes,
      })
      .from(sopDocuments)
      .leftJoin(processTasks, eq(processTasks.taskKey, sopDocuments.sourceTaskId))
      .leftJoin(processes, eq(processes.id, processTasks.processId))
      .where(isNull(sopDocuments.deletedAt))

    // 2) Alle process_tasks ohne matching SOP → Task-only-Zeilen
    //    Set der bereits abgedeckten taskKeys aus Schritt 1 ermitteln
    const coveredKeys = new Set(
      sopRows
        .map((r) => r.sop.sourceTaskId)
        .filter((k): k is string => !!k),
    )
    const allTaskRows = await db
      .select({ task: processTasks, process: processes })
      .from(processTasks)
      .innerJoin(processes, eq(processes.id, processTasks.processId))
    const orphanTaskRows = allTaskRows.filter(
      (r) => !coveredKeys.has(r.task.taskKey),
    )

    // 3) Beide Listen in einheitliche Row-Shape mappen
    const fromSop = sopRows.map<ConsolidatedRow>(({ sop, task, process }) => {
      const devCount = Array.isArray(task?.devRequirements)
        ? (task!.devRequirements as unknown[]).length
        : 0
      return {
        kind: 'sop',
        sopId: sop.id,
        taskId: task?.id ?? null,
        taskKey: task?.taskKey ?? sop.sourceTaskId ?? null,
        title: sop.title,
        category: sop.category,
        subprocess: sop.subprocess ?? task?.subprocess ?? null,
        processKey: process?.key ?? null,
        processName: process?.name ?? null,
        status: sop.status,
        version: sop.version,
        automationLevel: sop.automationLevel,
        aiCapable: sop.aiCapable,
        maturityLevel: sop.maturityLevel,
        estimatedDurationMinutes: sop.estimatedDurationMinutes,
        appStatus: task?.appStatus ?? null,
        appModule: task?.appModule ?? null,
        appNotes: task?.appNotes ?? null,
        devRequirementCount: devCount,
        coverage: classifyCoverage({
          kind: 'sop',
          status: sop.status,
          automationLevel: sop.automationLevel,
          appStatus: task?.appStatus ?? null,
        }),
        updatedAt: sop.updatedAt,
      }
    })

    const fromTask = orphanTaskRows.map<ConsolidatedRow>(({ task, process }) => {
      const devCount = Array.isArray(task.devRequirements)
        ? (task.devRequirements as unknown[]).length
        : 0
      return {
        kind: 'task-only',
        sopId: null,
        taskId: task.id,
        taskKey: task.taskKey,
        title: task.title,
        category: null,
        subprocess: task.subprocess,
        processKey: process.key,
        processName: process.name,
        status: null,
        version: null,
        automationLevel: null,
        aiCapable: null,
        maturityLevel: null,
        estimatedDurationMinutes: null,
        appStatus: task.appStatus,
        appModule: task.appModule,
        appNotes: task.appNotes,
        devRequirementCount: devCount,
        coverage: classifyCoverage({
          kind: 'task-only',
          status: null,
          automationLevel: null,
          appStatus: task.appStatus,
        }),
        updatedAt: task.updatedAt,
      }
    })

    let rows = [...fromSop, ...fromTask]

    // 4) Filter (in JS, da der UNION ohnehin im Memory liegt — n=~150)
    if (filters?.category) rows = rows.filter((r) => r.category === filters.category)
    if (filters?.status) rows = rows.filter((r) => r.status === filters.status)
    if (filters?.processKey) rows = rows.filter((r) => r.processKey === filters.processKey)
    if (filters?.automation && filters.automation !== 'all') {
      rows = rows.filter((r) => r.coverage === filters.automation)
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.taskKey?.toLowerCase().includes(q) ?? false) ||
          (r.subprocess?.toLowerCase().includes(q) ?? false),
      )
    }

    // 5) Sortierung: Prozess (KP1, KP2, …, MP, UP, ohne) → taskKey → Titel
    rows.sort((a, b) => {
      const pa = a.processKey ?? 'zzz'
      const pb = b.processKey ?? 'zzz'
      if (pa !== pb) return pa.localeCompare(pb)
      const ka = a.taskKey ?? 'zzz'
      const kb = b.taskKey ?? 'zzz'
      if (ka !== kb) return ka.localeCompare(kb, undefined, { numeric: true })
      return a.title.localeCompare(b.title)
    })

    return rows
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

// Coverage-Klassifikation:
//   automated = SOP ist freigegeben + automatisiert (semi/full) + App deckt es voll ab
//   gap       = Task ohne SOP ODER (App=none UND SOP nicht freigegeben)
//   progress  = alles dazwischen
function classifyCoverage(input: {
  kind: 'sop' | 'task-only'
  status: string | null
  automationLevel: string | null
  appStatus: string | null
}): 'automated' | 'progress' | 'gap' {
  if (input.kind === 'task-only') return 'gap'
  const automated =
    input.status === 'approved' &&
    (input.automationLevel === 'semi' || input.automationLevel === 'full') &&
    input.appStatus === 'full'
  if (automated) return 'automated'
  const isGap = input.appStatus === 'none' && input.status !== 'approved'
  return isGap ? 'gap' : 'progress'
}

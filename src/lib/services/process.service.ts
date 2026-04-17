// ============================================
// Process Service (Prozesshandbuch)
// CRUD for processes and process tasks
// ============================================

import { db } from '@/lib/db'
import { processes, processTasks } from '@/lib/db/schema'
import type { Process, NewProcess, ProcessTask, NewProcessTask } from '@/lib/db/schema'
import { eq, and, asc, count } from 'drizzle-orm'

// ============================================
// Process CRUD
// ============================================

export const ProcessService = {
  // --- Processes ---

  async list(_tenantId: string): Promise<(Process & { taskCount: number })[]> {
    const items = await db
      .select()
      .from(processes)
      .orderBy(asc(processes.sortOrder), asc(processes.key))

    // Get task counts
    const counts = await db
      .select({
        processId: processTasks.processId,
        count: count(),
      })
      .from(processTasks)
      .groupBy(processTasks.processId)

    const countMap = new Map(counts.map(c => [c.processId, Number(c.count)]))

    return items.map(p => ({
      ...p,
      taskCount: countMap.get(p.id) || 0,
    }))
  },

  async getById(_tenantId: string, id: string): Promise<Process | null> {
    const [process] = await db
      .select()
      .from(processes)
      .where(eq(processes.id, id))
      .limit(1)
    return process ?? null
  },

  async getByKey(_tenantId: string, key: string): Promise<Process | null> {
    const [process] = await db
      .select()
      .from(processes)
      .where(eq(processes.key, key))
      .limit(1)
    return process ?? null
  },

  async create(_tenantId: string, data: {
    key: string
    name: string
    description?: string
    sortOrder?: number
  }): Promise<Process> {
    const [process] = await db
      .insert(processes)
      .values({
        key: data.key,
        name: data.name,
        description: data.description || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()
    return process
  },

  async update(_tenantId: string, id: string, data: Partial<{
    key: string
    name: string
    description: string
    sortOrder: number
  }>): Promise<Process | null> {
    const updateData: Partial<NewProcess> = { updatedAt: new Date() }
    if (data.key !== undefined) updateData.key = data.key
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const [process] = await db
      .update(processes)
      .set(updateData)
      .where(eq(processes.id, id))
      .returning()
    return process ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(processes)
      .where(eq(processes.id, id))
      .returning({ id: processes.id })
    return result.length > 0
  },

  // --- Dev Tasks (all tasks with devRequirements across processes) ---

  async listDevTasks(_tenantId: string): Promise<(ProcessTask & { processKey: string; processName: string })[]> {
    const rows = await db
      .select({
        task: processTasks,
        processKey: processes.key,
        processName: processes.name,
      })
      .from(processTasks)
      .innerJoin(processes, eq(processTasks.processId, processes.id))
      .orderBy(asc(processes.sortOrder), asc(processTasks.sortOrder), asc(processTasks.taskKey))

    return rows
      .filter(r => r.task.devRequirements && Array.isArray(r.task.devRequirements) && (r.task.devRequirements as unknown[]).length > 0)
      .map(r => ({
        ...r.task,
        processKey: r.processKey,
        processName: r.processName,
      }))
  },

  // --- Process Tasks ---

  async listTasks(_tenantId: string, processId: string): Promise<ProcessTask[]> {
    return db
      .select()
      .from(processTasks)
      .where(eq(processTasks.processId, processId))
      .orderBy(asc(processTasks.sortOrder), asc(processTasks.taskKey))
  },

  async getTaskById(_tenantId: string, taskId: string): Promise<ProcessTask | null> {
    const [task] = await db
      .select()
      .from(processTasks)
      .where(eq(processTasks.id, taskId))
      .limit(1)
    return task ?? null
  },

  async createTask(_tenantId: string, processId: string, data: {
    taskKey: string
    subprocess?: string
    title: string
    purpose?: string
    trigger?: string
    timeEstimate?: string
    automationPotential?: string
    tools?: unknown
    prerequisites?: unknown
    steps?: unknown
    checklist?: unknown
    expectedOutput?: string
    errorEscalation?: string
    solution?: string
    sortOrder?: number
  }): Promise<ProcessTask> {
    const [task] = await db
      .insert(processTasks)
      .values({
        processId,
        taskKey: data.taskKey,
        subprocess: data.subprocess || null,
        title: data.title,
        purpose: data.purpose || null,
        trigger: data.trigger || null,
        timeEstimate: data.timeEstimate || null,
        automationPotential: data.automationPotential || null,
        tools: data.tools ?? [],
        prerequisites: data.prerequisites ?? [],
        steps: data.steps ?? [],
        checklist: data.checklist ?? [],
        expectedOutput: data.expectedOutput || null,
        errorEscalation: data.errorEscalation || null,
        solution: data.solution || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()
    return task
  },

  async updateTask(_tenantId: string, taskId: string, data: Partial<{
    taskKey: string
    subprocess: string
    title: string
    purpose: string
    trigger: string
    timeEstimate: string
    automationPotential: string
    tools: unknown
    prerequisites: unknown
    steps: unknown
    checklist: unknown
    expectedOutput: string
    errorEscalation: string
    solution: string
    sortOrder: number
    appStatus: string
    appNotes: string
    appModule: string | null
    devRequirements: unknown
  }>): Promise<ProcessTask | null> {
    const updateData: Partial<NewProcessTask> = { updatedAt: new Date() }
    if (data.taskKey !== undefined) updateData.taskKey = data.taskKey
    if (data.subprocess !== undefined) updateData.subprocess = data.subprocess
    if (data.title !== undefined) updateData.title = data.title
    if (data.purpose !== undefined) updateData.purpose = data.purpose
    if (data.trigger !== undefined) updateData.trigger = data.trigger
    if (data.timeEstimate !== undefined) updateData.timeEstimate = data.timeEstimate
    if (data.automationPotential !== undefined) updateData.automationPotential = data.automationPotential
    if (data.tools !== undefined) updateData.tools = data.tools
    if (data.prerequisites !== undefined) updateData.prerequisites = data.prerequisites
    if (data.steps !== undefined) updateData.steps = data.steps
    if (data.checklist !== undefined) updateData.checklist = data.checklist
    if (data.expectedOutput !== undefined) updateData.expectedOutput = data.expectedOutput
    if (data.errorEscalation !== undefined) updateData.errorEscalation = data.errorEscalation
    if (data.solution !== undefined) updateData.solution = data.solution
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.appStatus !== undefined) updateData.appStatus = data.appStatus
    if (data.appNotes !== undefined) updateData.appNotes = data.appNotes
    if (data.appModule !== undefined) updateData.appModule = data.appModule
    if (data.devRequirements !== undefined) updateData.devRequirements = data.devRequirements

    const [task] = await db
      .update(processTasks)
      .set(updateData)
      .where(eq(processTasks.id, taskId))
      .returning()
    return task ?? null
  },

  async updateTaskByKey(_tenantId: string, taskKey: string, data: {
    appStatus?: string
    appNotes?: string
    appModule?: string | null
    devRequirements?: unknown
  }): Promise<boolean> {
    const updateData: Partial<NewProcessTask> = { updatedAt: new Date() }
    if (data.appStatus !== undefined) updateData.appStatus = data.appStatus
    if (data.appNotes !== undefined) updateData.appNotes = data.appNotes
    if (data.appModule !== undefined) updateData.appModule = data.appModule
    if (data.devRequirements !== undefined) updateData.devRequirements = data.devRequirements

    const result = await db
      .update(processTasks)
      .set(updateData)
      .where(eq(processTasks.taskKey, taskKey))
      .returning({ id: processTasks.id })
    return result.length > 0
  },

  async deleteTask(_tenantId: string, taskId: string): Promise<boolean> {
    const result = await db
      .delete(processTasks)
      .where(eq(processTasks.id, taskId))
      .returning({ id: processTasks.id })
    return result.length > 0
  },

  // --- Seed from JSON ---

  async seed(_tenantId: string, mainJson: MainJsonData, newSopsJson: NewSopItem[]): Promise<{
    processCount: number
    taskCount: number
  }> {
    // 1. Create process areas
    const sortOrderMap: Record<string, number> = {
      KP1: 1, KP2: 2, KP3: 3, KP4: 4, KP5: 5, MP: 6, UP: 7,
    }

    const processMap = new Map<string, string>() // key -> id

    for (const [key, area] of Object.entries(mainJson.prozessbereiche)) {
      // Check if already exists
      const existing = await this.getByKey(_key)
      if (existing) {
        processMap.set(key, existing.id)
        continue
      }

      const process = await this.create('', {
        key,
        name: area.name,
        description: area.beschreibung,
        sortOrder: sortOrderMap[key] ?? 99,
      })
      processMap.set(key, process.id)
    }

    // 2. Import tasks from main JSON
    let taskCount = 0

    for (const aufgabe of mainJson.aufgaben) {
      const processId = processMap.get(aufgabe.prozess_key)
      if (!processId) continue

      // Check if task already exists
      const existingTasks = await db
        .select({ id: processTasks.id })
        .from(processTasks)
        .where(eq(processTasks.taskKey, aufgabe.id))
        .limit(1)

      if (existingTasks.length > 0) continue

      await this.createTask(_processId, {
        taskKey: aufgabe.id,
        subprocess: aufgabe.teilprozess,
        title: aufgabe.aufgabe,
        purpose: aufgabe.zweck,
        trigger: aufgabe.trigger,
        timeEstimate: aufgabe.zeitaufwand,
        automationPotential: aufgabe.automatisierungs_potenzial,
        tools: aufgabe.empfohlene_tools || [],
        prerequisites: aufgabe.vorbedingungen || [],
        steps: (aufgabe.schritte || []).map((s: StepItem) => ({
          nr: s.nr,
          action: s.aktion,
          tool: s.tool,
          hint: s.hinweis,
        })),
        checklist: aufgabe.erfolgskontrolle_checkliste || [],
        expectedOutput: aufgabe.erwarteter_output,
        errorEscalation: aufgabe.fehlerfall_eskalation,
        solution: aufgabe.loesung,
        sortOrder: taskCount,
      })
      taskCount++
    }

    // 3. Import tasks from new_sops.json
    for (const sop of newSopsJson) {
      const processKey = sop.id.split('-')[0] // e.g. "KP3-10" -> "KP3"
      let processId = processMap.get(processKey)

      // Auto-create process area if not yet known (e.g. KP6, KP7 from new_sops)
      if (!processId) {
        const existing = await this.getByKey(_processKey)
        if (existing) {
          processId = existing.id
        } else {
          const newProcess = await this.create('', {
            key: processKey,
            name: sop.process || processKey,
            description: `Automatisch erstellt aus ${sop.process || processKey}`,
            sortOrder: sortOrderMap[processKey] ?? (10 + processMap.size),
          })
          processId = newProcess.id
        }
        processMap.set(processKey, processId)
      }

      // Check if task already exists
      const existingTasks = await db
        .select({ id: processTasks.id })
        .from(processTasks)
        .where(eq(processTasks.taskKey, sop.id))
        .limit(1)

      if (existingTasks.length > 0) continue

      await this.createTask(_processId, {
        taskKey: sop.id,
        subprocess: sop.subprocess,
        title: sop.title,
        purpose: sop.zweck,
        trigger: sop.trigger,
        timeEstimate: sop.zeit,
        automationPotential: sop.potenzial,
        tools: sop.tools ? sop.tools.split(', ') : [],
        prerequisites: sop.vorbedingungen || [],
        steps: (sop.steps || []).map((s: NewSopStep) => ({
          nr: s.nr,
          action: s.action,
          tool: s.tool,
          hint: s.hint,
        })),
        checklist: sop.checkliste || [],
        expectedOutput: sop.output,
        errorEscalation: sop.fehler,
        solution: sop.ki_ansatz,
        sortOrder: taskCount,
      })
      taskCount++
    }

    return {
      processCount: processMap.size,
      taskCount,
    }
  },
}

// ============================================
// Types for JSON import
// ============================================

interface StepItem {
  nr: number | string
  aktion: string
  tool?: string
  hinweis?: string
}

interface MainJsonAufgabe {
  id: string
  prozess_key: string
  prozess: string
  teilprozess: string
  aufgabe: string
  zeitaufwand: string
  automatisierungs_potenzial: string
  empfohlene_tools?: string[]
  loesung?: string
  zweck?: string
  trigger?: string
  vorbedingungen?: string[]
  schritte?: StepItem[]
  erfolgskontrolle_checkliste?: string[]
  erwarteter_output?: string
  fehlerfall_eskalation?: string
}

interface MainJsonData {
  prozessbereiche: Record<string, { name: string; beschreibung: string }>
  aufgaben: MainJsonAufgabe[]
}

interface NewSopStep {
  nr: string | number
  action: string
  tool?: string
  hint?: string
}

interface NewSopItem {
  id: string
  title: string
  process: string
  subprocess: string
  potenzial: string
  zeit: string
  zweck: string
  trigger: string
  tools: string
  vorbedingungen: string[]
  steps: NewSopStep[]
  ki_ansatz: string
  checkliste: string[]
  output: string
  fehler: string
}

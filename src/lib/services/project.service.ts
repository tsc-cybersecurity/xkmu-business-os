// ============================================
// Project Service (Kanban / OKR / Content Board)
// ============================================

import { db } from '@/lib/db'
import { projects, projectTasks, companies, users } from '@/lib/db/schema'
import type { Project, ProjectTask, NewProject, NewProjectTask } from '@/lib/db/schema'
import { eq, and, asc, count, desc } from 'drizzle-orm'

export const ProjectService = {
  // --- Projects ---
  async list(status?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (status) conditions.push(eq(projects.status, status))

    const items = await db
      .select({ project: projects, companyName: companies.name })
      .from(projects)
      .leftJoin(companies, eq(projects.companyId, companies.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt))

    // Task counts
    const taskCounts = await db
      .select({ projectId: projectTasks.projectId, count: count() })
      .from(projectTasks)
      .groupBy(projectTasks.projectId)

    const countMap = new Map(taskCounts.map(c => [c.projectId, Number(c.count)]))

    return items.map(r => ({
      ...r.project,
      companyName: r.companyName,
      taskCount: countMap.get(r.project.id) || 0,
    }))
  },

  async getById(id: string): Promise<Project | null> {
    const [project] = await db.select().from(projects)
      .where(eq(projects.id, id)).limit(1)
    return project ?? null
  },

  async create(data: {
    name: string; description?: string; companyId?: string; ownerId?: string
    projectType?: string; priority?: string; startDate?: Date; endDate?: Date
    budget?: string; color?: string; columns?: unknown; tags?: string[]
  }): Promise<Project> {
    const [project] = await db.insert(projects).values({
      name: data.name, description: data.description || null,
      companyId: data.companyId || null, ownerId: data.ownerId || null,
      projectType: data.projectType || 'kanban', priority: data.priority || 'mittel',
      startDate: data.startDate || null, endDate: data.endDate || null,
      budget: data.budget || null, color: data.color || null,
      columns: data.columns || undefined, tags: data.tags || [],
    }).returning()
    return project
  },

  async update(id: string, data: Partial<{
    name: string; description: string; companyId: string | null; ownerId: string | null
    status: string; priority: string; startDate: Date | null; endDate: Date | null
    budget: string | null; color: string | null; columns: unknown; tags: string[]
  }>): Promise<Project | null> {
    const updateData: Partial<NewProject> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.companyId !== undefined) updateData.companyId = data.companyId
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.startDate !== undefined) updateData.startDate = data.startDate
    if (data.endDate !== undefined) updateData.endDate = data.endDate
    if (data.budget !== undefined) updateData.budget = data.budget
    if (data.color !== undefined) updateData.color = data.color
    if (data.columns !== undefined) updateData.columns = data.columns
    if (data.tags !== undefined) updateData.tags = data.tags

    const [project] = await db.update(projects).set(updateData)
      .where(eq(projects.id, id)).returning()
    return project ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id })
    return result.length > 0
  },

  // --- Tasks ---
  async listTasks(projectId: string): Promise<(ProjectTask & { assigneeName?: string })[]> {
    const rows = await db
      .select({ task: projectTasks, assigneeEmail: users.email, assigneeFirstName: users.firstName, assigneeLastName: users.lastName })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assignedTo, users.id))
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(asc(projectTasks.position))

    return rows.map(r => ({
      ...r.task,
      assigneeName: r.assigneeFirstName ? `${r.assigneeFirstName} ${r.assigneeLastName || ''}`.trim() : r.assigneeEmail || undefined,
    }))
  },

  async createTask(projectId: string, data: {
    title: string; description?: string; columnId?: string; priority?: string
    assignedTo?: string; startDate?: Date; dueDate?: Date; estimatedMinutes?: number
    labels?: string[]; referenceType?: string; referenceId?: string
    parentTaskId?: string; delegatedTo?: string
  }): Promise<ProjectTask> {
    // Get max position in column
    const existing = await db.select({ position: projectTasks.position }).from(projectTasks)
      .where(and(eq(projectTasks.projectId, projectId), eq(projectTasks.columnId, data.columnId || 'backlog')))
      .orderBy(desc(projectTasks.position)).limit(1)
    const nextPosition = (existing[0]?.position || 0) + 1

    const [task] = await db.insert(projectTasks).values({
      projectId, title: data.title, description: data.description || null,
      columnId: data.columnId || 'backlog', position: nextPosition,
      priority: data.priority || 'mittel',
      assignedTo: data.assignedTo || null, startDate: data.startDate || null,
      dueDate: data.dueDate || null, estimatedMinutes: data.estimatedMinutes || null,
      labels: data.labels || [], referenceType: data.referenceType || null,
      referenceId: data.referenceId || null,
      parentTaskId: data.parentTaskId || null,
      delegatedTo: data.delegatedTo || null,
    }).returning()
    return task
  },

  async updateTask(taskId: string, data: Partial<{
    title: string; description: string; columnId: string; position: number; priority: string
    assignedTo: string | null; startDate: Date | null; dueDate: Date | null
    completedAt: Date | null; estimatedMinutes: number | null
    checklist: unknown; labels: string[]; comments: unknown
    parentTaskId: string | null; delegatedTo: string | null
  }>): Promise<ProjectTask | null> {
    const updateData: Partial<NewProjectTask> = { updatedAt: new Date() }
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.columnId !== undefined) updateData.columnId = data.columnId
    if (data.position !== undefined) updateData.position = data.position
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo
    if (data.startDate !== undefined) updateData.startDate = data.startDate
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt
    if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = data.estimatedMinutes
    if (data.checklist !== undefined) updateData.checklist = data.checklist
    if (data.labels !== undefined) updateData.labels = data.labels
    if (data.comments !== undefined) updateData.comments = data.comments
    if (data.parentTaskId !== undefined) updateData.parentTaskId = data.parentTaskId
    if (data.delegatedTo !== undefined) updateData.delegatedTo = data.delegatedTo

    // Auto-set completedAt when moved to done column
    if (data.columnId === 'done' && !data.completedAt) {
      updateData.completedAt = new Date()
    }

    const [task] = await db.update(projectTasks).set(updateData)
      .where(eq(projectTasks.id, taskId)).returning()
    return task ?? null
  },

  async deleteTask(taskId: string): Promise<boolean> {
    // Delete child tasks first (subtasks)
    await db.delete(projectTasks)
      .where(eq(projectTasks.parentTaskId, taskId))
    const result = await db.delete(projectTasks)
      .where(eq(projectTasks.id, taskId))
      .returning({ id: projectTasks.id })
    return result.length > 0
  },

  async moveTask(taskId: string, columnId: string, position: number): Promise<ProjectTask | null> {
    return this.updateTask(taskId, { columnId, position })
  },
}

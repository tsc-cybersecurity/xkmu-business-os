// ============================================
// Project Service (Kanban / OKR / Content Board)
// ============================================

import { db } from '@/lib/db'
import { projects, projectTasks, companies, users } from '@/lib/db/schema'
import type { Project, ProjectTask, NewProject, NewProjectTask } from '@/lib/db/schema'
import { eq, and, asc, count, desc } from 'drizzle-orm'

export const ProjectService = {
  // --- Projects ---
  async list(tenantId: string, status?: string) {
    const conditions = [eq(projects.tenantId, tenantId)]
    if (status) conditions.push(eq(projects.status, status))

    const items = await db
      .select({ project: projects, companyName: companies.name })
      .from(projects)
      .leftJoin(companies, eq(projects.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))

    // Task counts
    const taskCounts = await db
      .select({ projectId: projectTasks.projectId, count: count() })
      .from(projectTasks)
      .where(eq(projectTasks.tenantId, tenantId))
      .groupBy(projectTasks.projectId)

    const countMap = new Map(taskCounts.map(c => [c.projectId, Number(c.count)]))

    return items.map(r => ({
      ...r.project,
      companyName: r.companyName,
      taskCount: countMap.get(r.project.id) || 0,
    }))
  },

  async getById(tenantId: string, id: string): Promise<Project | null> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id))).limit(1)
    return project ?? null
  },

  async create(tenantId: string, data: {
    name: string; description?: string; companyId?: string; projectType?: string; columns?: unknown
  }): Promise<Project> {
    const [project] = await db.insert(projects).values({
      tenantId, name: data.name, description: data.description || null,
      companyId: data.companyId || null, projectType: data.projectType || 'kanban',
      columns: data.columns || undefined,
    }).returning()
    return project
  },

  async update(tenantId: string, id: string, data: Partial<{
    name: string; description: string; companyId: string | null; status: string; columns: unknown
  }>): Promise<Project | null> {
    const updateData: Partial<NewProject> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.companyId !== undefined) updateData.companyId = data.companyId
    if (data.status !== undefined) updateData.status = data.status
    if (data.columns !== undefined) updateData.columns = data.columns

    const [project] = await db.update(projects).set(updateData)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id))).returning()
    return project ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id)))
      .returning({ id: projects.id })
    return result.length > 0
  },

  // --- Tasks ---
  async listTasks(tenantId: string, projectId: string): Promise<(ProjectTask & { assigneeName?: string })[]> {
    const rows = await db
      .select({ task: projectTasks, assigneeEmail: users.email, assigneeFirstName: users.firstName, assigneeLastName: users.lastName })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assignedTo, users.id))
      .where(and(eq(projectTasks.tenantId, tenantId), eq(projectTasks.projectId, projectId)))
      .orderBy(asc(projectTasks.position))

    return rows.map(r => ({
      ...r.task,
      assigneeName: r.assigneeFirstName ? `${r.assigneeFirstName} ${r.assigneeLastName || ''}`.trim() : r.assigneeEmail || undefined,
    }))
  },

  async createTask(tenantId: string, projectId: string, data: {
    title: string; description?: string; columnId?: string; assignedTo?: string;
    dueDate?: Date; labels?: string[]; referenceType?: string; referenceId?: string
  }): Promise<ProjectTask> {
    // Get max position in column
    const existing = await db.select({ position: projectTasks.position }).from(projectTasks)
      .where(and(eq(projectTasks.projectId, projectId), eq(projectTasks.columnId, data.columnId || 'backlog')))
      .orderBy(desc(projectTasks.position)).limit(1)
    const nextPosition = (existing[0]?.position || 0) + 1

    const [task] = await db.insert(projectTasks).values({
      tenantId, projectId, title: data.title, description: data.description || null,
      columnId: data.columnId || 'backlog', position: nextPosition,
      assignedTo: data.assignedTo || null, dueDate: data.dueDate || null,
      labels: data.labels || [], referenceType: data.referenceType || null,
      referenceId: data.referenceId || null,
    }).returning()
    return task
  },

  async updateTask(tenantId: string, taskId: string, data: Partial<{
    title: string; description: string; columnId: string; position: number;
    assignedTo: string | null; dueDate: Date | null; checklist: unknown; labels: string[]
  }>): Promise<ProjectTask | null> {
    const updateData: Partial<NewProjectTask> = { updatedAt: new Date() }
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.columnId !== undefined) updateData.columnId = data.columnId
    if (data.position !== undefined) updateData.position = data.position
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.checklist !== undefined) updateData.checklist = data.checklist
    if (data.labels !== undefined) updateData.labels = data.labels

    const [task] = await db.update(projectTasks).set(updateData)
      .where(and(eq(projectTasks.tenantId, tenantId), eq(projectTasks.id, taskId))).returning()
    return task ?? null
  },

  async deleteTask(tenantId: string, taskId: string): Promise<boolean> {
    const result = await db.delete(projectTasks)
      .where(and(eq(projectTasks.tenantId, tenantId), eq(projectTasks.id, taskId)))
      .returning({ id: projectTasks.id })
    return result.length > 0
  },

  async moveTask(tenantId: string, taskId: string, columnId: string, position: number): Promise<ProjectTask | null> {
    return this.updateTask(tenantId, taskId, { columnId, position })
  },
}

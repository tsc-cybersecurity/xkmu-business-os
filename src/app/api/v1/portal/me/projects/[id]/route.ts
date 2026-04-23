import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { db } from '@/lib/db'
import { projects, projectTasks } from '@/lib/db/schema'
import { eq, and, ne, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const [project] = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          priority: projects.priority,
          projectType: projects.projectType,
          startDate: projects.startDate,
          endDate: projects.endDate,
          tags: projects.tags,
          color: projects.color,
          columns: projects.columns,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(
          eq(projects.id, id),
          eq(projects.companyId, auth.companyId),
          ne(projects.status, 'archived'),
        ))
        .limit(1)

      if (!project) return apiNotFound('Projekt nicht gefunden')

      const tasksRaw = await db
        .select({
          id: projectTasks.id,
          title: projectTasks.title,
          description: projectTasks.description,
          columnId: projectTasks.columnId,
          position: projectTasks.position,
          priority: projectTasks.priority,
          startDate: projectTasks.startDate,
          dueDate: projectTasks.dueDate,
          completedAt: projectTasks.completedAt,
          labels: projectTasks.labels,
        })
        .from(projectTasks)
        .where(eq(projectTasks.projectId, id))
        .orderBy(asc(projectTasks.columnId), asc(projectTasks.position))

      const tasks = tasksRaw.map(t => ({
        ...t,
        status: t.completedAt ? 'done' : 'open',
      }))

      return apiSuccess({ ...project, tasks })
    } catch (error) {
      logger.error('Failed to load portal project detail', error, { module: 'PortalProjectsAPI' })
      return apiError('LOAD_FAILED', 'Projekt konnte nicht geladen werden', 500)
    }
  })
}

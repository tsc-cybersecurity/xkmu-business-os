import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { db } from '@/lib/db'
import { projects, projectTasks } from '@/lib/db/schema'
import { eq, and, ne, desc, count } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const rows = await db
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
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(
          eq(projects.companyId, auth.companyId),
          ne(projects.status, 'archived'),
        ))
        .orderBy(desc(projects.createdAt))

      const counts = await db
        .select({ projectId: projectTasks.projectId, c: count() })
        .from(projectTasks)
        .groupBy(projectTasks.projectId)
      const countMap = new Map(counts.map(r => [r.projectId, Number(r.c)]))

      return apiSuccess(rows.map(r => ({ ...r, taskCount: countMap.get(r.id) ?? 0 })))
    } catch (error) {
      logger.error('Failed to list portal projects', error, { module: 'PortalProjectsAPI' })
      return apiError('LIST_FAILED', 'Projekte konnten nicht geladen werden', 500)
    }
  })
}

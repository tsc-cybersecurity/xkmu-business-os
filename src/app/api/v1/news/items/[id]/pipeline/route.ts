import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { db } from '@/lib/db'
import { taskQueue, newsItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

const NON_TERMINAL = new Set(['queued', 'researching', 'generating'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const { id } = await params
      const item = await NewsService.getItem(id)
      if (!item) return apiNotFound('News-Item nicht gefunden')

      if (NON_TERMINAL.has(item.pipelineStatus)) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Pipeline already running' } },
          { status: 409 },
        )
      }

      const [task] = await db
        .insert(taskQueue)
        .values({
          type: 'news_pipeline',
          status: 'pending',
          priority: 2,
          payload: { stages: ['research', 'blog', 'social'] },
          referenceType: 'news_item',
          referenceId: id,
        })
        .returning()

      await db
        .update(newsItems)
        .set({
          pipelineStatus: 'queued',
          pipelineTaskId: task.id,
          pipelineError: null,
          updatedAt: new Date(),
        })
        .where(eq(newsItems.id, id))

      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'news.item.pipeline.start',
        entityType: 'news_item',
        entityId: id,
        payload: { taskId: task.id } as Record<string, unknown>,
        request,
      })

      return apiSuccess({ taskId: task.id, status: 'queued' }, undefined, 202)
    } catch (err) {
      logger.error('news pipeline trigger failed', err, { module: 'NewsPipelineAPI' })
      return apiServerError()
    }
  })
}

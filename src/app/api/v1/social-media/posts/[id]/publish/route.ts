import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { SocialPublishOrchestrator } from '@/lib/services/social/social-publish-orchestrator'

type Params = Promise<{ id: string }>

// POST /api/v1/social-media/posts/[id]/publish - Post auf Plattform veroeffentlichen
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    try {
      const { id } = await params
      let outcome
      try {
        outcome = await SocialPublishOrchestrator.publishById(id)
      } catch (e) {
        if (e instanceof Error && e.message === 'post_not_found') return apiNotFound('Post nicht gefunden')
        throw e
      }
      const { result, postedVia } = outcome

      // Audit log nur fuer den HTTP-Pfad — der task_queue-Handler logged ueber
      // task_queue.error/result selbst, ohne user-context fuer AuditLog.
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: result.ok ? 'social_media_post_published' : 'social_media_post_failed',
        entityType: 'social_media_posts',
        entityId: id,
        payload: result.ok
          ? { platform: outcome.platform, postedVia, externalPostId: result.externalPostId, externalUrl: result.externalUrl }
          : { platform: outcome.platform, postedVia, error: result.error },
        request,
      })

      return apiSuccess({ result, postId: id })
    } catch {
      return apiServerError()
    }
  })
}

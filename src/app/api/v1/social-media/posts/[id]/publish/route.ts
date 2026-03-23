import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { SocialPublishingService } from '@/lib/services/social-publishing.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { socialMediaPosts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = Promise<{ id: string }>

// POST /api/v1/social-media/posts/[id]/publish - Post auf Plattform veroeffentlichen
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const { platforms } = body as { platforms?: string[] }

      const [post] = await db
        .select()
        .from(socialMediaPosts)
        .where(and(eq(socialMediaPosts.tenantId, auth.tenantId), eq(socialMediaPosts.id, id)))
        .limit(1)

      if (!post) return apiNotFound('Post nicht gefunden')

      const targetPlatforms = platforms || [post.platform]
      const results = await SocialPublishingService.publish(
        auth.tenantId,
        targetPlatforms,
        post.content || ''
      )

      // Update post status if any platform succeeded
      const anySuccess = Object.values(results).some(r => r.success)
      if (anySuccess) {
        await db
          .update(socialMediaPosts)
          .set({
            status: 'posted',
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(socialMediaPosts.id, id))
      }

      return apiSuccess({ results, postId: id })
    } catch {
      return apiServerError()
    }
  })
}

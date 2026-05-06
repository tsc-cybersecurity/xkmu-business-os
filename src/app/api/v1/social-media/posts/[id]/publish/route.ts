import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { SocialPublishingService } from '@/lib/services/social-publishing.service'
import { MetaProvider } from '@/lib/services/social/meta-provider'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { db } from '@/lib/db'
import { socialMediaPosts, socialOauthAccounts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { PublishResult } from '@/lib/services/social/social-provider'

type Params = Promise<{ id: string }>

// POST /api/v1/social-media/posts/[id]/publish - Post auf Plattform veroeffentlichen
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    try {
      const { id } = await params

      const [post] = await db
        .select()
        .from(socialMediaPosts)
        .where(eq(socialMediaPosts.id, id))
        .limit(1)

      if (!post) return apiNotFound('Post nicht gefunden')

      const platform = post.platform
      const isOAuth = platform === 'facebook' || platform === 'instagram'
      const postedVia: 'oauth' | 'legacy' = isOAuth ? 'oauth' : 'legacy'

      let result: PublishResult

      if (isOAuth) {
        result = await MetaProvider.publish(post)
      } else {
        const body = await request.json().catch(() => ({})) as { imageUrl?: string; link?: string }
        const legacyResults = await SocialPublishingService.publish(
          [platform],
          post.content || '',
          { imageUrl: body.imageUrl || (post.imageUrl ?? undefined), link: body.link },
        )
        const r = legacyResults[platform]
        result = r?.success
          ? { ok: true, externalPostId: r.postId ?? '', externalUrl: r.postUrl ?? null }
          : { ok: false, error: r?.error ?? 'legacy_publish_failed', revokeAccount: false }
      }

      // Persist publish metadata
      if (result.ok) {
        await db.update(socialMediaPosts).set({
          status: 'posted',
          postedAt: new Date(),
          externalPostId: result.externalPostId,
          externalUrl: result.externalUrl,
          lastError: null,
          postedVia,
          updatedAt: new Date(),
        }).where(eq(socialMediaPosts.id, id))
      } else {
        await db.update(socialMediaPosts).set({
          status: 'failed',
          lastError: result.error,
          postedVia,
          updatedAt: new Date(),
        }).where(eq(socialMediaPosts.id, id))

        if (result.revokeAccount) {
          await db.update(socialOauthAccounts).set({
            status: 'revoked',
            revokedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(socialOauthAccounts.provider, platform as 'facebook' | 'instagram'),
            eq(socialOauthAccounts.status, 'connected'),
          ))
        }
      }

      // Audit log (one entry total)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: result.ok ? 'social_media_post_published' : 'social_media_post_failed',
        entityType: 'social_media_posts',
        entityId: id,
        payload: result.ok
          ? { platform, postedVia, externalPostId: result.externalPostId, externalUrl: result.externalUrl }
          : { platform, postedVia, error: result.error },
        request,
      })

      return apiSuccess({ result, postId: id })
    } catch {
      return apiServerError()
    }
  })
}

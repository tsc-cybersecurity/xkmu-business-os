import { db } from '@/lib/db'
import { socialMediaPosts, socialOauthAccounts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { MetaProvider } from './meta-provider'
import { InstagramProvider } from './instagram-provider'
import { XProvider } from './x-provider'
import { LinkedInProvider } from './linkedin-provider'
import { SocialPublishingService } from '@/lib/services/social-publishing.service'
import type { PublishResult } from './social-provider'
import { logger } from '@/lib/utils/logger'

export interface PublishOutcome {
  postId: string
  platform: string
  result: PublishResult
  postedVia: 'oauth' | 'legacy'
}

/**
 * Zentrale Publish-Logik fuer einen social_media_post anhand seiner ID.
 * Wird sowohl vom HTTP-Endpoint (/api/v1/social-media/posts/[id]/publish)
 * als auch vom task_queue-Handler 'social_post_publish' aufgerufen.
 *
 * Kapselt:
 *  - Plattform-Dispatch (FB → MetaProvider, IG → InstagramProvider, sonst legacy)
 *  - Persistierung der publish-Metadaten (status, posted_at, external_url, ...)
 *  - Auto-Revoke des oauth-Accounts bei Token-Fehlern
 *
 * KEINE Audit-Log-Calls hier — die ruft die HTTP-Route mit Request-Kontext
 * weiter selbst auf; der Task-Handler logged stattdessen ueber task_queue.error.
 */
export const SocialPublishOrchestrator = {
  async publishById(postId: string): Promise<PublishOutcome> {
    const [post] = await db
      .select()
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.id, postId))
      .limit(1)

    if (!post) throw new Error('post_not_found')

    const platform = post.platform
    const isOAuth = platform === 'facebook' || platform === 'instagram' || platform === 'x' || platform === 'linkedin'
    const postedVia: 'oauth' | 'legacy' = isOAuth ? 'oauth' : 'legacy'

    let result: PublishResult

    if (platform === 'facebook') {
      result = await MetaProvider.publish(post)
    } else if (platform === 'instagram') {
      result = await InstagramProvider.publish(post)
    } else if (platform === 'x') {
      result = await XProvider.publish(post)
    } else if (platform === 'linkedin') {
      result = await LinkedInProvider.publish(post)
    } else {
      const legacyResults = await SocialPublishingService.publish(
        [platform],
        post.content || '',
        { imageUrl: post.imageUrl ?? undefined },
      )
      const r = legacyResults[platform]
      result = r?.success
        ? { ok: true, externalPostId: r.postId ?? '', externalUrl: r.postUrl ?? null }
        : { ok: false, error: r?.error ?? 'legacy_publish_failed', revokeAccount: false }
    }

    // Persist publish metadata. scheduledAt wird auf null gesetzt — der Post
    // ist veroeffentlicht, der Plan-Slot ist obsolet (postedAt traegt die
    // tatsaechliche Zeit). Verhindert ausserdem dass der Post weiter im
    // Kalender als 'geplant' erscheint.
    if (result.ok) {
      await db.update(socialMediaPosts).set({
        status: 'posted',
        scheduledAt: null,
        postedAt: new Date(),
        externalPostId: result.externalPostId,
        externalUrl: result.externalUrl,
        lastError: null,
        postedVia,
        updatedAt: new Date(),
      }).where(eq(socialMediaPosts.id, postId))
    } else {
      await db.update(socialMediaPosts).set({
        status: 'failed',
        lastError: result.error,
        postedVia,
        updatedAt: new Date(),
      }).where(eq(socialMediaPosts.id, postId))

      if (result.revokeAccount && (platform === 'facebook' || platform === 'instagram' || platform === 'x' || platform === 'linkedin')) {
        await db.update(socialOauthAccounts).set({
          status: 'revoked',
          revokedAt: new Date(),
          updatedAt: new Date(),
        }).where(and(
          eq(socialOauthAccounts.provider, platform),
          eq(socialOauthAccounts.status, 'connected'),
        ))
        logger.warn(
          `Social OAuth account for ${platform} marked as revoked (token error during publish)`,
          { module: 'SocialPublishOrchestrator' },
        )
      }
    }

    // Workflow-Engine-Hook: nachgelagerte Workflows koennen auf diese Triggers
    // hoeren (z.B. fuer Phase-5 Notify-on-Publish-Success). Fail-soft, damit ein
    // Workflow-Fehler den eigentlichen Publish nicht ueberschreibt.
    try {
      const { WorkflowEngine } = await import('@/lib/services/workflow')
      const triggerName = result.ok ? 'social.post.published' : 'social.post.failed'
      await WorkflowEngine.fire(triggerName, {
        postId,
        platform,
        externalPostId: result.ok ? result.externalPostId : null,
        externalUrl: result.ok ? result.externalUrl : null,
        error: result.ok ? null : result.error,
        postedVia,
      })
    } catch (e) {
      logger.warn(
        `Workflow trigger for social publish failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`,
        { module: 'SocialPublishOrchestrator' },
      )
    }

    return { postId, platform, result, postedVia }
  },
}

// src/lib/services/social/social-post.service.ts
// NOTE: This service is the Phase 2A implementation and is DEPRECATED as of Phase 2B.
// The active publish path is the legacy route at src/app/api/v1/social-media/posts/[id]/publish/route.ts.
// Will be cleaned up in a future phase.
import { db } from '@/lib/db'
import { socialPosts, socialPostTargets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PostStatus, canTransition } from './post-status'
import { AuditLogService } from '@/lib/services/audit-log.service'

type ProviderName = 'facebook' | 'instagram' | 'x' | 'linkedin'

export interface Actor {
  userId: string
  userRole: string
  request?: Request
}

export interface CreateInput {
  masterBody: string
  masterImagePath: string | null
  providers: ProviderName[]
  createdBy: string
}

export const SocialPostService = {
  async create(input: CreateInput & { actor: Actor }): Promise<{ id: string }> {
    if (input.providers.length === 0) throw new Error('at_least_one_provider')

    const [post] = await db.insert(socialPosts).values({
      status: PostStatus.Draft,
      masterBody: input.masterBody,
      masterImagePath: input.masterImagePath,
      createdBy: input.createdBy,
    }).returning({ id: socialPosts.id })

    for (const provider of input.providers) {
      await db.insert(socialPostTargets).values({
        postId: post.id,
        provider,
      })
    }

    await AuditLogService.log({
      userId: input.actor.userId,
      userRole: input.actor.userRole,
      action: 'social_post_created',
      entityType: 'social_posts',
      entityId: post.id,
      payload: {
        providers: input.providers,
        hasImage: input.masterImagePath !== null,
      },
      request: input.actor.request as never,
    })

    return { id: post.id }
  },

  async approve(postId: string, actor: Actor): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (!canTransition(post.status as PostStatus, PostStatus.Approved)) {
      throw new Error('invalid_transition')
    }
    await db.update(socialPosts).set({
      status: PostStatus.Approved,
      approvedBy: actor.userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, postId))

    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'social_post_approved',
      entityType: 'social_posts',
      entityId: postId,
      payload: {},
      request: actor.request as never,
    })
  },

  async discard(postId: string, actor: Actor): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (post.status !== PostStatus.Draft) throw new Error('only_drafts')
    await db.delete(socialPosts).where(eq(socialPosts.id, postId))

    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'social_post_discarded',
      entityType: 'social_posts',
      entityId: postId,
      payload: { status: 'draft' },
      request: actor.request as never,
    })
  },

  async publish(_postId: string, _actor: Actor): Promise<{ status: string }> {
    // DEPRECATED as of Phase 2B — use the legacy publish route instead.
    // MetaProvider.publish signature changed to take SocialMediaPost directly.
    throw new Error('deprecated_use_legacy_publish_route')
  },
}

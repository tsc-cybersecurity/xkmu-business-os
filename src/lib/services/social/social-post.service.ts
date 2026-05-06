// src/lib/services/social/social-post.service.ts
import { db } from '@/lib/db'
import { socialPosts, socialPostTargets, socialOauthAccounts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { PostStatus, TargetStatus, canTransition, deriveOverallStatus } from './post-status'
import { MetaProvider } from './meta-provider'
import type { PublishResult } from './social-provider'

type ProviderName = 'facebook' | 'instagram' | 'x' | 'linkedin'

export interface CreateInput {
  masterBody: string
  masterImagePath: string | null
  providers: ProviderName[]
  createdBy: string
}

export const SocialPostService = {
  async create(input: CreateInput): Promise<{ id: string }> {
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
    return { id: post.id }
  },

  async approve(postId: string, approvedBy: string): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (!canTransition(post.status as PostStatus, PostStatus.Approved)) {
      throw new Error('invalid_transition')
    }
    await db.update(socialPosts).set({
      status: PostStatus.Approved,
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, postId))
  },

  async discard(postId: string): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (post.status !== PostStatus.Draft) throw new Error('only_drafts')
    await db.delete(socialPosts).where(eq(socialPosts.id, postId))
  },

  async publish(postId: string): Promise<{ status: string }> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (post.status !== PostStatus.Approved) throw new Error('invalid_state_for_publish')

    const targets = await db.select().from(socialPostTargets)
      .where(eq(socialPostTargets.postId, postId))
    if (targets.length === 0) throw new Error('no_targets')

    const results = await Promise.all(targets.map(async (t) => {
      await db.update(socialPostTargets)
        .set({ publishStatus: TargetStatus.Publishing, updatedAt: new Date() })
        .where(eq(socialPostTargets.id, t.id))
      try {
        const r: PublishResult = await MetaProvider.publish(t, post)
        if (r.ok) {
          await db.update(socialPostTargets).set({
            publishStatus: TargetStatus.Posted,
            externalPostId: r.externalPostId,
            externalUrl: r.externalUrl,
            postedAt: new Date(),
            updatedAt: new Date(),
            lastError: null,
          }).where(eq(socialPostTargets.id, t.id))
          return { provider: t.provider, status: TargetStatus.Posted }
        }
        await db.update(socialPostTargets).set({
          publishStatus: TargetStatus.Failed,
          retryCount: (t.retryCount ?? 0) + 1,
          lastError: r.error,
          updatedAt: new Date(),
        }).where(eq(socialPostTargets.id, t.id))
        if (r.revokeAccount) {
          await db.update(socialOauthAccounts).set({
            status: 'revoked',
            revokedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(socialOauthAccounts.provider, t.provider),
            eq(socialOauthAccounts.status, 'connected'),
          ))
        }
        return { provider: t.provider, status: TargetStatus.Failed }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error'
        await db.update(socialPostTargets).set({
          publishStatus: TargetStatus.Failed,
          retryCount: (t.retryCount ?? 0) + 1,
          lastError: msg,
          updatedAt: new Date(),
        }).where(eq(socialPostTargets.id, t.id))
        return { provider: t.provider, status: TargetStatus.Failed }
      }
    }))

    const overall = deriveOverallStatus(results.map(r => r.status as TargetStatus)) ?? PostStatus.Failed
    await db.update(socialPosts).set({
      status: overall,
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, postId))

    return { status: overall }
  },
}

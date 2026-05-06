// src/lib/services/social/social-post.service.ts
import { db } from '@/lib/db'
import { socialPosts, socialPostTargets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PostStatus, canTransition } from './post-status'

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
}

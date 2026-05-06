import { db } from '@/lib/db'
import { socialMediaPosts, socialMediaTopics, taskQueue } from '@/lib/db/schema'
import { eq, and, count, desc, gte, lt, isNull, asc, inArray } from 'drizzle-orm'
import type { SocialMediaPost, NewSocialMediaPost } from '@/lib/db/schema'

// ──────────────────────────────────────────────────────────────────────────
// Auto-publish scheduling helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Stellt sicher, dass genau ein 'social_post_publish' task_queue-Item fuer
 * diesen Post existiert, sofern Post 'scheduled' ist und scheduledAt
 * in der Zukunft liegt. Bestehende pending/running Tasks werden zu
 * 'cancelled' geflaggt, damit kein Doppel-Posting passiert.
 */
async function reconcilePublishTask(postId: string, scheduledAt: Date | null, status: string | null): Promise<void> {
  // Vorhandene aktive Tasks fuer diesen Post canceln
  await db.update(taskQueue).set({
    status: 'cancelled',
    updatedAt: new Date(),
  }).where(and(
    eq(taskQueue.referenceType, 'social_media_posts'),
    eq(taskQueue.referenceId, postId),
    eq(taskQueue.type, 'social_post_publish'),
    inArray(taskQueue.status, ['pending', 'running']),
  ))

  if (status !== 'scheduled' || !scheduledAt) return
  if (scheduledAt.getTime() <= Date.now()) return

  await db.insert(taskQueue).values({
    type: 'social_post_publish',
    status: 'pending',
    priority: 2,
    scheduledFor: scheduledAt,
    payload: { postId },
    referenceType: 'social_media_posts',
    referenceId: postId,
  })
}

export interface PostFilters {
  platform?: string
  status?: string
  topicId?: string
  page?: number
  limit?: number
}

export interface CreatePostInput {
  topicId?: string | null
  platform: string
  title?: string
  content: string
  hashtags?: string[]
  imageUrl?: string
  scheduledAt?: string
  status?: string
  aiGenerated?: boolean
}

export type UpdatePostInput = Partial<CreatePostInput>

export const SocialMediaPostService = {
  async list(filters: PostFilters = {}) {
    const { platform, status, topicId, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (platform) conditions.push(eq(socialMediaPosts.platform, platform))
    if (status) conditions.push(eq(socialMediaPosts.status, status))
    if (topicId) conditions.push(eq(socialMediaPosts.topicId, topicId))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: socialMediaPosts.id,
        topicId: socialMediaPosts.topicId,
        platform: socialMediaPosts.platform,
        title: socialMediaPosts.title,
        content: socialMediaPosts.content,
        hashtags: socialMediaPosts.hashtags,
        imageUrl: socialMediaPosts.imageUrl,
        scheduledAt: socialMediaPosts.scheduledAt,
        postedAt: socialMediaPosts.postedAt,
        status: socialMediaPosts.status,
        aiGenerated: socialMediaPosts.aiGenerated,
        createdBy: socialMediaPosts.createdBy,
        createdAt: socialMediaPosts.createdAt,
        updatedAt: socialMediaPosts.updatedAt,
        topicName: socialMediaTopics.name,
        topicColor: socialMediaTopics.color,
      })
        .from(socialMediaPosts)
        .leftJoin(socialMediaTopics, eq(socialMediaPosts.topicId, socialMediaTopics.id))
        .where(whereClause)
        .orderBy(desc(socialMediaPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(socialMediaPosts).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(id: string): Promise<SocialMediaPost | null> {
    const [post] = await db
      .select()
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.id, id))
      .limit(1)
    return post ?? null
  },

  async create(data: CreatePostInput, createdBy?: string): Promise<SocialMediaPost> {
    const [post] = await db
      .insert(socialMediaPosts)
      .values({
        topicId: data.topicId || undefined,
        platform: data.platform,
        title: data.title || null,
        content: data.content,
        hashtags: data.hashtags || [],
        imageUrl: data.imageUrl || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status || 'draft',
        aiGenerated: data.aiGenerated || false,
        createdBy: createdBy || undefined,
      })
      .returning()
    await reconcilePublishTask(post.id, post.scheduledAt, post.status)
    return post
  },

  async bulkCreate(posts: CreatePostInput[], createdBy?: string): Promise<SocialMediaPost[]> {
    if (posts.length === 0) return []
    const values = posts.map(data => ({
      topicId: data.topicId || undefined,
      platform: data.platform,
      title: data.title || null,
      content: data.content,
      hashtags: data.hashtags || [],
      imageUrl: data.imageUrl || null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.status || 'draft',
      aiGenerated: data.aiGenerated || false,
      createdBy: createdBy || undefined,
    }))
    return db.insert(socialMediaPosts).values(values).returning()
  },

  async update(id: string, data: UpdatePostInput): Promise<SocialMediaPost | null> {
    const updateData: Partial<NewSocialMediaPost> = { updatedAt: new Date() }
    if (data.topicId !== undefined) updateData.topicId = data.topicId || undefined
    if (data.platform !== undefined) updateData.platform = data.platform
    if (data.title !== undefined) updateData.title = data.title || null
    if (data.content !== undefined) updateData.content = data.content
    if (data.hashtags !== undefined) updateData.hashtags = data.hashtags
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
    if (data.status !== undefined) updateData.status = data.status

    const [post] = await db
      .update(socialMediaPosts)
      .set(updateData)
      .where(eq(socialMediaPosts.id, id))
      .returning()
    if (post) await reconcilePublishTask(post.id, post.scheduledAt, post.status)
    return post ?? null
  },

  async delete(id: string): Promise<boolean> {
    // Pending publish-tasks vor dem Delete canceln, damit der Worker nicht ins
    // Leere greift wenn er die ID spaeter pickt.
    await reconcilePublishTask(id, null, null)
    const result = await db
      .delete(socialMediaPosts)
      .where(eq(socialMediaPosts.id, id))
      .returning({ id: socialMediaPosts.id })
    return result.length > 0
  },

  async listForCalendar(range: { from: Date; to: Date }) {
    const baseFields = {
      id: socialMediaPosts.id,
      topicId: socialMediaPosts.topicId,
      platform: socialMediaPosts.platform,
      title: socialMediaPosts.title,
      content: socialMediaPosts.content,
      hashtags: socialMediaPosts.hashtags,
      imageUrl: socialMediaPosts.imageUrl,
      scheduledAt: socialMediaPosts.scheduledAt,
      postedAt: socialMediaPosts.postedAt,
      status: socialMediaPosts.status,
      topicName: socialMediaTopics.name,
      topicColor: socialMediaTopics.color,
    }

    const [scheduled, backlog] = await Promise.all([
      db.select(baseFields)
        .from(socialMediaPosts)
        .leftJoin(socialMediaTopics, eq(socialMediaPosts.topicId, socialMediaTopics.id))
        .where(and(
          gte(socialMediaPosts.scheduledAt, range.from),
          lt(socialMediaPosts.scheduledAt, range.to),
        ))
        .orderBy(asc(socialMediaPosts.scheduledAt)),
      db.select(baseFields)
        .from(socialMediaPosts)
        .leftJoin(socialMediaTopics, eq(socialMediaPosts.topicId, socialMediaTopics.id))
        .where(and(
          isNull(socialMediaPosts.scheduledAt),
          eq(socialMediaPosts.status, 'draft'),
        ))
        .orderBy(desc(socialMediaPosts.createdAt))
        .limit(50),
    ])

    return { scheduled, backlog }
  },
}

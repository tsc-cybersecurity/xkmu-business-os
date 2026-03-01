import { db } from '@/lib/db'
import { socialMediaPosts, socialMediaTopics } from '@/lib/db/schema'
import { eq, and, count, desc, asc } from 'drizzle-orm'
import type { SocialMediaPost, NewSocialMediaPost } from '@/lib/db/schema'

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
  async list(tenantId: string, filters: PostFilters = {}) {
    const { platform, status, topicId, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(socialMediaPosts.tenantId, tenantId)]
    if (platform) conditions.push(eq(socialMediaPosts.platform, platform))
    if (status) conditions.push(eq(socialMediaPosts.status, status))
    if (topicId) conditions.push(eq(socialMediaPosts.topicId, topicId))

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: socialMediaPosts.id,
        tenantId: socialMediaPosts.tenantId,
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
        .where(whereClause!)
        .orderBy(desc(socialMediaPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(socialMediaPosts).where(whereClause!),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(tenantId: string, id: string): Promise<SocialMediaPost | null> {
    const [post] = await db
      .select()
      .from(socialMediaPosts)
      .where(and(eq(socialMediaPosts.tenantId, tenantId), eq(socialMediaPosts.id, id)))
      .limit(1)
    return post ?? null
  },

  async create(tenantId: string, data: CreatePostInput, createdBy?: string): Promise<SocialMediaPost> {
    const [post] = await db
      .insert(socialMediaPosts)
      .values({
        tenantId,
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
    return post
  },

  async bulkCreate(tenantId: string, posts: CreatePostInput[], createdBy?: string): Promise<SocialMediaPost[]> {
    if (posts.length === 0) return []
    const values = posts.map(data => ({
      tenantId,
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

  async update(tenantId: string, id: string, data: UpdatePostInput): Promise<SocialMediaPost | null> {
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
      .where(and(eq(socialMediaPosts.tenantId, tenantId), eq(socialMediaPosts.id, id)))
      .returning()
    return post ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(socialMediaPosts)
      .where(and(eq(socialMediaPosts.tenantId, tenantId), eq(socialMediaPosts.id, id)))
      .returning({ id: socialMediaPosts.id })
    return result.length > 0
  },
}

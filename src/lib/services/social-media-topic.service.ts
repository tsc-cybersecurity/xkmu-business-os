import { db } from '@/lib/db'
import { socialMediaTopics } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { SocialMediaTopic, NewSocialMediaTopic } from '@/lib/db/schema'

export interface CreateTopicInput {
  name: string
  description?: string
  color?: string
}

export type UpdateTopicInput = Partial<CreateTopicInput>

export const SocialMediaTopicService = {
  async list(tenantId: string): Promise<SocialMediaTopic[]> {
    return db
      .select()
      .from(socialMediaTopics)
      .where(eq(socialMediaTopics.tenantId, tenantId))
      .orderBy(socialMediaTopics.name)
  },

  async getById(tenantId: string, id: string): Promise<SocialMediaTopic | null> {
    const [topic] = await db
      .select()
      .from(socialMediaTopics)
      .where(and(eq(socialMediaTopics.tenantId, tenantId), eq(socialMediaTopics.id, id)))
      .limit(1)
    return topic ?? null
  },

  async create(tenantId: string, data: CreateTopicInput): Promise<SocialMediaTopic> {
    const [topic] = await db
      .insert(socialMediaTopics)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        color: data.color || '#3b82f6',
      })
      .returning()
    return topic
  },

  async update(tenantId: string, id: string, data: UpdateTopicInput): Promise<SocialMediaTopic | null> {
    const updateData: Partial<NewSocialMediaTopic> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.color !== undefined) updateData.color = data.color

    const [topic] = await db
      .update(socialMediaTopics)
      .set(updateData)
      .where(and(eq(socialMediaTopics.tenantId, tenantId), eq(socialMediaTopics.id, id)))
      .returning()
    return topic ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(socialMediaTopics)
      .where(and(eq(socialMediaTopics.tenantId, tenantId), eq(socialMediaTopics.id, id)))
      .returning({ id: socialMediaTopics.id })
    return result.length > 0
  },
}

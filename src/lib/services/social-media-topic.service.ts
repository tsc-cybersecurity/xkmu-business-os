import { db } from '@/lib/db'
import { socialMediaTopics } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'
import type { SocialMediaTopic, NewSocialMediaTopic } from '@/lib/db/schema'

export interface CreateTopicInput {
  name: string
  description?: string
  color?: string
}

export type UpdateTopicInput = Partial<CreateTopicInput>

export const SocialMediaTopicService = {
  async list(_tenantId: string, pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 50
    const offset = (page - 1) * limit

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(socialMediaTopics)
        .orderBy(socialMediaTopics.name)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(socialMediaTopics),
    ])

    return {
      items,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async getById(_tenantId: string, id: string): Promise<SocialMediaTopic | null> {
    const [topic] = await db
      .select()
      .from(socialMediaTopics)
      .where(eq(socialMediaTopics.id, id))
      .limit(1)
    return topic ?? null
  },

  async create(_tenantId: string, data: CreateTopicInput): Promise<SocialMediaTopic> {
    const [topic] = await db
      .insert(socialMediaTopics)
      .values({
        tenantId: TENANT_ID,
        name: data.name,
        description: data.description || null,
        color: data.color || '#3b82f6',
      })
      .returning()
    return topic
  },

  async update(_tenantId: string, id: string, data: UpdateTopicInput): Promise<SocialMediaTopic | null> {
    const updateData: Partial<NewSocialMediaTopic> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.color !== undefined) updateData.color = data.color

    const [topic] = await db
      .update(socialMediaTopics)
      .set(updateData)
      .where(eq(socialMediaTopics.id, id))
      .returning()
    return topic ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(socialMediaTopics)
      .where(eq(socialMediaTopics.id, id))
      .returning({ id: socialMediaTopics.id })
    return result.length > 0
  },
}

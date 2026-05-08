import { db } from '@/lib/db'
import { newsTopics, newsItems } from '@/lib/db/schema'
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import type { NewsTopic, NewNewsTopic, NewsItem } from '@/lib/db/schema'

export interface CreateTopicInput {
  name: string
  description?: string
  color?: string
  keywords: string[]
  sourceType?: string
  sourceConfig?: Record<string, unknown>
  isActive?: boolean
  sortOrder?: number
}

export type UpdateTopicInput = Partial<CreateTopicInput>

export const NewsService = {
  // ── Topics ─────────────────────────────────────────────────

  async listTopics(opts?: { activeOnly?: boolean }): Promise<NewsTopic[]> {
    const where = opts?.activeOnly ? eq(newsTopics.isActive, true) : undefined
    return db
      .select()
      .from(newsTopics)
      .where(where)
      .orderBy(asc(newsTopics.sortOrder), asc(newsTopics.name))
  },

  async getTopic(id: string): Promise<NewsTopic | null> {
    const [t] = await db.select().from(newsTopics).where(eq(newsTopics.id, id)).limit(1)
    return t ?? null
  },

  async createTopic(data: CreateTopicInput): Promise<NewsTopic> {
    const [t] = await db
      .insert(newsTopics)
      .values({
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? '#3b82f6',
        keywords: data.keywords,
        sourceType: data.sourceType ?? 'serpapi_news',
        sourceConfig: data.sourceConfig ?? {},
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()
    return t
  },

  async updateTopic(id: string, data: UpdateTopicInput): Promise<NewsTopic | null> {
    const update: Partial<NewNewsTopic> = { updatedAt: new Date() }
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description ?? null
    if (data.color !== undefined) update.color = data.color
    if (data.keywords !== undefined) update.keywords = data.keywords
    if (data.sourceType !== undefined) update.sourceType = data.sourceType
    if (data.sourceConfig !== undefined) update.sourceConfig = data.sourceConfig
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder

    const [t] = await db.update(newsTopics).set(update).where(eq(newsTopics.id, id)).returning()
    return t ?? null
  },

  async deleteTopic(id: string): Promise<boolean> {
    const result = await db
      .delete(newsTopics)
      .where(eq(newsTopics.id, id))
      .returning({ id: newsTopics.id })
    return result.length > 0
  },

  // ── Items ──────────────────────────────────────────────────

  async listItemsByTopic(
    topicId: string,
    opts?: { hidden?: boolean; since?: Date },
  ): Promise<NewsItem[]> {
    const conditions = [eq(newsItems.topicId, topicId)]
    if (!opts?.hidden) conditions.push(eq(newsItems.isHidden, false))
    return db
      .select()
      .from(newsItems)
      .where(and(...conditions))
      .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))
  },

  async getItem(id: string): Promise<NewsItem | null> {
    const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1)
    return item ?? null
  },

  async hideItem(id: string, hidden: boolean): Promise<boolean> {
    const result = await db
      .update(newsItems)
      .set({ isHidden: hidden, updatedAt: new Date() })
      .where(eq(newsItems.id, id))
      .returning({ id: newsItems.id })
    return result.length > 0
  },

  async listAllForDashboard(opts?: { hidden?: boolean }): Promise<{ topic: NewsTopic; items: NewsItem[] }[]> {
    const topics = await this.listTopics({ activeOnly: true })
    if (!topics.length) return []
    const topicIds = topics.map((t) => t.id)
    const conditions = [inArray(newsItems.topicId, topicIds)]
    if (!opts?.hidden) conditions.push(eq(newsItems.isHidden, false))
    const items = await db
      .select()
      .from(newsItems)
      .where(and(...conditions))
      .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))

    return topics.map((topic) => ({
      topic,
      items: items.filter((i) => i.topicId === topic.id),
    }))
  },
}

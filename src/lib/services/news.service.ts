import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { newsTopics, newsItems } from '@/lib/db/schema'
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import type { NewsTopic, NewNewsTopic, NewsItem, NewNewsItem } from '@/lib/db/schema'

export type NewsSocialPlatform = 'x' | 'facebook' | 'instagram' | 'linkedin'

export interface NewsTopicSocialConfig {
  platforms: NewsSocialPlatform[]
  includeImage: boolean
}

export const DEFAULT_NEWS_TOPIC_SOCIAL_CONFIG: NewsTopicSocialConfig = {
  platforms: ['x', 'facebook', 'instagram'],
  includeImage: true,
}

export interface CreateTopicInput {
  name: string
  description?: string
  color?: string
  keywords: string[]
  sourceType?: string
  sourceConfig?: Record<string, unknown>
  socialConfig?: NewsTopicSocialConfig
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
        socialConfig: data.socialConfig ?? DEFAULT_NEWS_TOPIC_SOCIAL_CONFIG,
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
    if (data.socialConfig !== undefined) update.socialConfig = data.socialConfig
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

  async deleteItem(id: string): Promise<boolean> {
    const result = await db
      .delete(newsItems)
      .where(eq(newsItems.id, id))
      .returning({ id: newsItems.id })
    return result.length > 0
  },

  async updateItem(id: string, data: Partial<NewNewsItem>): Promise<void> {
    await db
      .update(newsItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsItems.id, id))
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

  // ── Recherche ──────────────────────────────────────────────

  async runResearchForTopic(
    topicId: string,
  ): Promise<{ inserted: number; skipped: number }> {
    const topic = await this.getTopic(topicId)
    if (!topic) throw new Error(`Topic not found: ${topicId}`)

    const { resolveNewsAdapter } = await import('@/lib/services/news/index')
    const adapter = resolveNewsAdapter(topic.sourceType)
    const results = await adapter.search(
      topic.keywords ?? [],
      (topic.sourceConfig ?? {}) as Record<string, unknown>,
    )

    const valid = results.filter((r) => r.url && r.url.length > 0)
    if (!valid.length) return { inserted: 0, skipped: 0 }

    const rows = valid.map((r) => ({
      topicId: topic.id,
      title: r.title.slice(0, 500),
      url: r.url.slice(0, 1000),
      snippet: r.snippet ?? null,
      source: r.source?.slice(0, 200) ?? null,
      imageUrl: r.imageUrl?.slice(0, 1000) ?? null,
      publishedAt: r.publishedAt ?? null,
      urlHash: createHash('sha256').update(r.url).digest('hex'),
    }))

    const inserted = await db
      .insert(newsItems)
      .values(rows)
      .onConflictDoNothing({ target: [newsItems.topicId, newsItems.urlHash] })
      .returning({ id: newsItems.id })

    return {
      inserted: inserted.length,
      skipped: valid.length - inserted.length,
    }
  },

  async runResearchForAllActiveTopics(): Promise<
    { topicId: string; inserted: number; skipped: number; error?: string }[]
  > {
    const topics = await this.listTopics({ activeOnly: true })
    const out: { topicId: string; inserted: number; skipped: number; error?: string }[] = []
    for (const t of topics) {
      try {
        const r = await this.runResearchForTopic(t.id)
        out.push({ topicId: t.id, ...r })
      } catch (err) {
        out.push({
          topicId: t.id,
          inserted: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return out
  },
}

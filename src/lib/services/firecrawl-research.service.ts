import { db } from '@/lib/db'
import { firecrawlResearches } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { FirecrawlResearch } from '@/lib/db/schema'

export const FirecrawlResearchService = {
  async create(companyId: string,
    data: {
      url: string
      status?: string
      pageCount?: number
      pages?: unknown
      error?: string
    }
  ): Promise<FirecrawlResearch> {
    const [research] = await db
      .insert(firecrawlResearches)
      .values({
        companyId,
        url: data.url,
        status: data.status || 'crawling',
        pageCount: data.pageCount,
        pages: data.pages,
        error: data.error,
      })
      .returning()

    return research
  },

  async getById(id: string): Promise<FirecrawlResearch | null> {
    const [research] = await db
      .select()
      .from(firecrawlResearches)
      .where(eq(firecrawlResearches.id, id))
      .limit(1)

    return research ?? null
  },

  async listByCompany(companyId: string): Promise<FirecrawlResearch[]> {
    return db
      .select()
      .from(firecrawlResearches)
      .where(eq(firecrawlResearches.companyId, companyId))
      .orderBy(desc(firecrawlResearches.createdAt))
  },

  async getLatest(companyId: string): Promise<FirecrawlResearch | null> {
    const [research] = await db
      .select()
      .from(firecrawlResearches)
      .where(
        and(
          eq(firecrawlResearches.companyId, companyId),
          eq(firecrawlResearches.status, 'completed')
        )
      )
      .orderBy(desc(firecrawlResearches.createdAt))
      .limit(1)

    return research ?? null
  },

  async update(id: string,
    data: {
      status?: string
      pageCount?: number
      pages?: unknown
      error?: string
    }
  ): Promise<FirecrawlResearch | null> {
    const [updated] = await db
      .update(firecrawlResearches)
      .set(data)
      .where(eq(firecrawlResearches.id, id))
      .returning()

    return updated ?? null
  },
}

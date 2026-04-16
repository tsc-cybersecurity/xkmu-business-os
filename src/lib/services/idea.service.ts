import { db } from '@/lib/db'
import { ideas } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import type { Idea, NewIdea } from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface IdeaFilters {
  status?: string
  type?: string
  page?: number
  limit?: number
}

export interface CreateIdeaInput {
  rawContent: string
  type?: string
  status?: string
  tags?: string[]
  structuredContent?: Record<string, unknown>
}

export type UpdateIdeaInput = Partial<CreateIdeaInput>

export const IdeaService = {
  async create(_tenantId: string, data: CreateIdeaInput, createdBy?: string): Promise<Idea> {
    const [idea] = await db
      .insert(ideas)
      .values({
        tenantId: TENANT_ID,
        rawContent: data.rawContent,
        type: data.type || 'text',
        status: data.status || 'backlog',
        tags: data.tags || [],
        structuredContent: data.structuredContent || {},
        createdBy: createdBy || undefined,
      })
      .returning()
    return idea
  },

  async getById(_tenantId: string, ideaId: string): Promise<Idea | null> {
    const [idea] = await db
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1)
    return idea ?? null
  },

  async update(_tenantId: string, ideaId: string, data: UpdateIdeaInput): Promise<Idea | null> {
    const updateData: Partial<NewIdea> = { updatedAt: new Date() }
    if (data.rawContent !== undefined) updateData.rawContent = data.rawContent
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.structuredContent !== undefined) updateData.structuredContent = data.structuredContent

    const [idea] = await db
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, ideaId))
      .returning()
    return idea ?? null
  },

  async delete(_tenantId: string, ideaId: string): Promise<boolean> {
    const result = await db
      .delete(ideas)
      .where(eq(ideas.id, ideaId))
      .returning({ id: ideas.id })
    return result.length > 0
  },

  async list(_tenantId: string, filters: IdeaFilters = {}) {
    const { status, type, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(ideas.status, status))
    if (type) conditions.push(eq(ideas.type, type))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(ideas).where(whereClause).orderBy(desc(ideas.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(ideas).where(whereClause),
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

  async listGroupedByStatus(_tenantId: string, maxPerGroup = 100): Promise<Record<string, Idea[]>> {
    // Limit total rows fetched to prevent unbounded memory usage
    const allIdeas = await db
      .select()
      .from(ideas)
      .orderBy(desc(ideas.createdAt))
      .limit(maxPerGroup * 3)

    const grouped: Record<string, Idea[]> = {
      backlog: [],
      in_progress: [],
      converted: [],
    }

    for (const idea of allIdeas) {
      const key = idea.status || 'backlog'
      if (!grouped[key]) grouped[key] = []
      if (grouped[key].length < maxPerGroup) {
        grouped[key].push(idea)
      }
    }

    return grouped
  },
}

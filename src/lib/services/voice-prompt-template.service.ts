import { db } from '@/lib/db'
import { voicePromptTemplates } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import type { VoicePromptTemplate } from '@/lib/db/schema'

export interface CreateVoicePromptTemplateInput {
  agentKey: string
  slug: string
  name: string
  description?: string | null
  category?: string | null
  systemPrompt: string
  greeting: string
  isActive?: boolean
  sortOrder?: number
}

export type UpdateVoicePromptTemplateInput = Partial<CreateVoicePromptTemplateInput>

// Strenge Slug-Regel — der Slug landet in URLs und in der Datenbank-Unique-
// Constraint, deshalb nur a-z, 0-9 und Bindestriche.
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$|^[a-z0-9]$/

export function isValidVoiceTemplateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}

export const VoicePromptTemplateService = {
  async list(filter: { agentKey?: string; onlyActive?: boolean } = {}): Promise<VoicePromptTemplate[]> {
    const conditions = []
    if (filter.agentKey) conditions.push(eq(voicePromptTemplates.agentKey, filter.agentKey))
    if (filter.onlyActive) conditions.push(eq(voicePromptTemplates.isActive, true))
    return db
      .select()
      .from(voicePromptTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(voicePromptTemplates.sortOrder), asc(voicePromptTemplates.name))
  },

  async getById(id: string): Promise<VoicePromptTemplate | null> {
    const [row] = await db
      .select()
      .from(voicePromptTemplates)
      .where(eq(voicePromptTemplates.id, id))
      .limit(1)
    return row ?? null
  },

  async create(data: CreateVoicePromptTemplateInput): Promise<VoicePromptTemplate> {
    if (!isValidVoiceTemplateSlug(data.slug)) {
      throw new Error('Slug darf nur a-z, 0-9 und Bindestriche enthalten.')
    }
    const [row] = await db
      .insert(voicePromptTemplates)
      .values({
        agentKey: data.agentKey,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        systemPrompt: data.systemPrompt,
        greeting: data.greeting,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()
    return row
  },

  async update(id: string, data: UpdateVoicePromptTemplateInput): Promise<VoicePromptTemplate | null> {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.agentKey !== undefined) patch.agentKey = data.agentKey
    if (data.slug !== undefined) {
      if (!isValidVoiceTemplateSlug(data.slug)) {
        throw new Error('Slug darf nur a-z, 0-9 und Bindestriche enthalten.')
      }
      patch.slug = data.slug
    }
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.category !== undefined) patch.category = data.category
    if (data.systemPrompt !== undefined) patch.systemPrompt = data.systemPrompt
    if (data.greeting !== undefined) patch.greeting = data.greeting
    if (data.isActive !== undefined) patch.isActive = data.isActive
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder

    const [row] = await db
      .update(voicePromptTemplates)
      .set(patch)
      .where(eq(voicePromptTemplates.id, id))
      .returning()
    return row ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(voicePromptTemplates)
      .where(eq(voicePromptTemplates.id, id))
      .returning({ id: voicePromptTemplates.id })
    return result.length > 0
  },
}

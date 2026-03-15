import { db } from '@/lib/db'
import { aiPromptTemplates } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { TEMPLATE_PLACEHOLDERS, DEFAULT_TEMPLATES } from '@/lib/services/ai-prompt-template.defaults'
import { applyPlaceholders } from '@/lib/services/ai-prompt-template.renderer'

// Re-export for backward compatibility
export { TEMPLATE_PLACEHOLDERS, DEFAULT_TEMPLATES } from '@/lib/services/ai-prompt-template.defaults'
export { applyPlaceholders } from '@/lib/services/ai-prompt-template.renderer'

// ============================================
// AI Prompt Template Service
// ============================================

export interface AiPromptTemplateData {
  slug: string
  name: string
  description?: string | null
  systemPrompt: string
  userPrompt: string
  outputFormat?: string | null
  isActive?: boolean
  isDefault?: boolean
  version?: number
}

// ============================================
// Service
// ============================================
export const AiPromptTemplateService = {
  // ============================================
  // CRUD
  // ============================================

  async list(tenantId: string) {
    return db
      .select()
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.tenantId, tenantId))
      .orderBy(asc(aiPromptTemplates.slug))
  },

  async getById(tenantId: string, id: string) {
    const [template] = await db
      .select()
      .from(aiPromptTemplates)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .limit(1)
    return template || null
  },

  async getBySlug(tenantId: string, slug: string) {
    const [template] = await db
      .select()
      .from(aiPromptTemplates)
      .where(
        and(
          eq(aiPromptTemplates.tenantId, tenantId),
          eq(aiPromptTemplates.slug, slug),
          eq(aiPromptTemplates.isActive, true)
        )
      )
      .limit(1)
    return template || null
  },

  async create(tenantId: string, data: AiPromptTemplateData) {
    const [template] = await db
      .insert(aiPromptTemplates)
      .values({
        tenantId,
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        outputFormat: data.outputFormat || null,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        version: data.version ?? 1,
      })
      .returning()

    return template
  },

  async update(tenantId: string, id: string, data: Partial<AiPromptTemplateData>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt
    if (data.userPrompt !== undefined) updateData.userPrompt = data.userPrompt
    if (data.outputFormat !== undefined) updateData.outputFormat = data.outputFormat
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.version !== undefined) updateData.version = data.version

    const [template] = await db
      .update(aiPromptTemplates)
      .set(updateData)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .returning()

    return template || null
  },

  async delete(tenantId: string, id: string) {
    // Don't allow deleting default templates
    const existing = await this.getById(tenantId, id)
    if (!existing || existing.isDefault) {
      return false
    }

    const [deleted] = await db
      .delete(aiPromptTemplates)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .returning({ id: aiPromptTemplates.id })

    return !!deleted
  },

  // ============================================
  // Seed-Defaults
  // ============================================

  async seedDefaults(tenantId: string) {
    for (const [slug, defaults] of Object.entries(DEFAULT_TEMPLATES)) {
      // Check if template already exists for this tenant+slug
      const existing = await this.getBySlug(tenantId, slug)
      if (!existing) {
        await this.create(tenantId, {
          slug,
          name: defaults.name,
          description: defaults.description,
          systemPrompt: defaults.systemPrompt,
          userPrompt: defaults.userPrompt,
          outputFormat: defaults.outputFormat,
          isActive: true,
          isDefault: true,
        })
      }
    }
  },

  async resetToDefault(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return null

    const defaults = DEFAULT_TEMPLATES[existing.slug]
    if (!defaults) return null

    return this.update(tenantId, id, {
      systemPrompt: defaults.systemPrompt,
      userPrompt: defaults.userPrompt,
      outputFormat: defaults.outputFormat,
      name: defaults.name,
      description: defaults.description,
    })
  },

  // ============================================
  // Template Loading with Fallback
  // ============================================

  /**
   * Lädt Template aus DB oder verwendet hart codierte Defaults als Fallback
   */
  async getOrDefault(tenantId: string, slug: string): Promise<{
    systemPrompt: string
    userPrompt: string
    outputFormat: string
  }> {
    // Versuche aus DB zu laden (nur wenn systemPrompt befüllt ist)
    const template = await this.getBySlug(tenantId, slug)
    if (template && template.systemPrompt) {
      return {
        systemPrompt: template.systemPrompt,
        userPrompt: template.userPrompt,
        outputFormat: template.outputFormat || '',
      }
    }

    // Fallback auf Default-Templates
    const defaults = DEFAULT_TEMPLATES[slug]
    if (defaults) {
      return {
        systemPrompt: defaults.systemPrompt,
        userPrompt: defaults.userPrompt,
        outputFormat: defaults.outputFormat,
      }
    }

    // Kein Template gefunden – leere Defaults
    return {
      systemPrompt: '',
      userPrompt: '',
      outputFormat: '',
    }
  },

  // ============================================
  // Platzhalter-System
  // ============================================
  applyPlaceholders,

  // ============================================
  // Platzhalter-Info
  // ============================================
  getPlaceholdersForSlug(slug: string) {
    return TEMPLATE_PLACEHOLDERS[slug] || []
  },
}

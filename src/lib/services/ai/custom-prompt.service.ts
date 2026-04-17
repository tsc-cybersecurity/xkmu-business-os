// ============================================
// Custom AI Prompt Service
// ============================================
// CRUD + execute for user-defined KI-Prompts.
// Execution is entity-agnostic (currently scoped to company); designed
// so that workflows can call execute() with { promptId, companyId }.

import { db } from '@/lib/db'
import { customAiPrompts } from '@/lib/db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { AIService } from './ai.service'
import { applyPlaceholders } from '@/lib/services/ai-prompt-template.renderer'
import { PromptContextBuilder, type PromptContextConfig } from './prompt-context-builder'
import { logger } from '@/lib/utils/logger'

export interface CustomPromptInput {
  name: string
  description?: string | null
  category?: string
  icon?: string
  color?: string
  systemPrompt?: string | null
  userPrompt: string
  contextConfig?: PromptContextConfig
  activityType?: string
  isActive?: boolean
}

export interface ExecuteInput {
  promptId: string
  companyId?: string | null
  userId?: string | null
}

export interface ExecuteResult {
  subject: string
  content: string
  promptId: string
  activityType: string
}

export const CustomAiPromptService = {
  // ============================================
  // CRUD
  // ============================================

  async list(opts: { activeOnly?: boolean } = {}) {
    const rows = opts.activeOnly
      ? await db.select().from(customAiPrompts).where(eq(customAiPrompts.isActive, true)).orderBy(asc(customAiPrompts.name))
      : await db.select().from(customAiPrompts).orderBy(desc(customAiPrompts.updatedAt))
    return rows
  },

  async getById(id: string) {
    const [row] = await db.select().from(customAiPrompts).where(eq(customAiPrompts.id, id)).limit(1)
    return row || null
  },

  async create(data: CustomPromptInput, userId?: string | null) {
    const [row] = await db
      .insert(customAiPrompts)
      .values({
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? 'custom',
        icon: data.icon ?? 'Sparkles',
        color: data.color ?? 'indigo',
        systemPrompt: data.systemPrompt ?? null,
        userPrompt: data.userPrompt,
        contextConfig: (data.contextConfig ?? {}) as Record<string, unknown>,
        activityType: data.activityType ?? 'note',
        isActive: data.isActive ?? true,
        createdBy: userId ?? null,
      })
      .returning()
    return row
  },

  async update(id: string, data: Partial<CustomPromptInput>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt
    if (data.userPrompt !== undefined) updateData.userPrompt = data.userPrompt
    if (data.contextConfig !== undefined) updateData.contextConfig = data.contextConfig
    if (data.activityType !== undefined) updateData.activityType = data.activityType
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const [row] = await db
      .update(customAiPrompts)
      .set(updateData)
      .where(eq(customAiPrompts.id, id))
      .returning()
    return row || null
  },

  async delete(id: string) {
    const [row] = await db
      .delete(customAiPrompts)
      .where(eq(customAiPrompts.id, id))
      .returning({ id: customAiPrompts.id })
    return !!row
  },

  // ============================================
  // Execute (run prompt with injected context)
  // ============================================

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const prompt = await this.getById(input.promptId)
    if (!prompt) throw new Error('Prompt nicht gefunden')
    if (!prompt.isActive) throw new Error('Prompt ist deaktiviert')

    const config = (prompt.contextConfig ?? {}) as PromptContextConfig

    const ctx = await PromptContextBuilder.build({
      companyId: input.companyId ?? null,
      config,
    })

    const systemPrompt = prompt.systemPrompt
      ? applyPlaceholders(prompt.systemPrompt, ctx.placeholders)
      : undefined
    const userPromptRendered = applyPlaceholders(prompt.userPrompt, ctx.placeholders)

    const fullPrompt = ctx.contextBlocks
      ? `${ctx.contextBlocks}\n\n=== AUFGABE ===\n${userPromptRendered}`
      : userPromptRendered

    const response = await AIService.completeWithContext(
      fullPrompt,
      {
        userId: input.userId ?? undefined,
        feature: 'custom_prompt',
        entityType: input.companyId ? 'company' : undefined,
        entityId: input.companyId ?? undefined,
      },
      {
        systemPrompt,
        temperature: 0.6,
        maxTokens: 2000,
      }
    )

    return {
      subject: prompt.name,
      content: response.text.trim(),
      promptId: prompt.id,
      activityType: prompt.activityType || 'note',
    }
  },

  // ============================================
  // LLM-assisted prompt generation
  // ============================================

  /**
   * Takes a user's free-form description of what prompt they want and
   * asks the LLM to produce a clean prompt body with {{placeholders}}.
   */
  async generateFromDescription(description: string, userId?: string | null): Promise<{
    name: string
    userPrompt: string
    systemPrompt: string
    suggestedContext: PromptContextConfig
  }> {
    const meta = `
Du bist ein Prompt-Engineering-Assistent. Der User möchte einen wiederverwendbaren KI-Prompt für sein CRM bauen. Erzeuge einen sauberen deutschen Prompt.

Verfügbare Platzhalter (nur nutzen wenn wirklich sinnvoll für die Aufgabe):
- {{companyName}}, {{companyIndustry}}, {{companyCity}}, {{companyStatus}}, {{companyNotes}}, {{companyWebsite}}, {{companyEmployeeCount}}
- {{organizationName}}, {{organizationCity}}, {{organizationLegalForm}}
- {{primaryContactName}}, {{primaryContactTitle}}, {{primaryContactEmail}}
- {{recentActivities}}, {{latestResearch}}, {{productList}}, {{processList}}

Wunsch des Users:
"""
${description}
"""

Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Format (keine Erklärung, kein Markdown):
{
  "name": "Kurzer prägnanter Name (max 60 Zeichen)",
  "systemPrompt": "Rollenanweisung für die KI (2-4 Sätze, deutsch)",
  "userPrompt": "Die eigentliche Aufgabe mit passenden {{Platzhaltern}}",
  "suggestedContext": {
    "includeCompany": true|false,
    "includePersons": true|false,
    "includeOrganization": true|false,
    "includeRecentActivities": true|false,
    "includeResearch": true|false,
    "includeProducts": true|false,
    "includeProcesses": true|false
  }
}
`.trim()

    const response = await AIService.completeWithContext(
      meta,
      { userId: userId ?? undefined, feature: 'custom_prompt_generate' },
      { temperature: 0.4, maxTokens: 1200 }
    )

    try {
      let content = response.text.trim()
      const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlock) content = codeBlock[1].trim()
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')
      if (firstBrace >= 0 && lastBrace > firstBrace) content = content.slice(firstBrace, lastBrace + 1)

      const parsed = JSON.parse(content) as {
        name?: unknown
        systemPrompt?: unknown
        userPrompt?: unknown
        suggestedContext?: Record<string, unknown>
      }

      return {
        name: typeof parsed.name === 'string' ? parsed.name : 'Neuer Prompt',
        systemPrompt: typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : '',
        userPrompt: typeof parsed.userPrompt === 'string' ? parsed.userPrompt : description,
        suggestedContext: parsed.suggestedContext
          ? {
              includeCompany: !!parsed.suggestedContext.includeCompany,
              includePersons: !!parsed.suggestedContext.includePersons,
              includeOrganization: !!parsed.suggestedContext.includeOrganization,
              includeRecentActivities: !!parsed.suggestedContext.includeRecentActivities,
              includeResearch: !!parsed.suggestedContext.includeResearch,
              includeProducts: !!parsed.suggestedContext.includeProducts,
              includeProcesses: !!parsed.suggestedContext.includeProcesses,
            }
          : { includeCompany: true },
      }
    } catch (e) {
      logger.error('Failed to parse prompt generation response', e, { module: 'CustomAiPromptService' })
      return {
        name: 'Neuer Prompt',
        systemPrompt: '',
        userPrompt: description,
        suggestedContext: { includeCompany: true },
      }
    }
  },
}

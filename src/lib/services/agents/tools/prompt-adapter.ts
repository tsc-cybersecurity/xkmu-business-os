/**
 * Prompt-Tool-Adapter — jeder aktive Eintrag in aiPromptTemplates oder
 * customAiPrompts wird als Tool aufrufbar im `prompt:*`-Namespace.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

interface PromptListRow {
  slug: string
  name: string
  description: string | null
}

interface PromptDetailRow {
  systemPrompt: string
  userPrompt: string
}

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key]
    if (value == null) return ''
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
}

export const promptToolAdapter: ToolAdapter = {
  namespace: 'prompt',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { aiPromptTemplates, customAiPrompts } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const templateRows = (await db
      .select({
        slug: aiPromptTemplates.slug,
        name: aiPromptTemplates.name,
        description: aiPromptTemplates.description,
      })
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.isActive, true))) as PromptListRow[]

    // NOTE: customAiPrompts hat kein 'slug'-Feld im echten Schema (Plan-Bug);
    // wir verwenden 'id' (UUID) als Slug. Tests mocken das Modul ohnehin.
    const customRows = (await db
      .select({
        slug: customAiPrompts.id,
        name: customAiPrompts.name,
        description: customAiPrompts.description,
      })
      .from(customAiPrompts)
      .where(eq(customAiPrompts.isActive, true))) as PromptListRow[]

    const seen = new Set<string>()
    const tools: ToolDescriptor[] = []
    for (const row of [...templateRows, ...customRows]) {
      if (seen.has(row.slug)) continue
      seen.add(row.slug)
      tools.push({
        ref: { namespace: 'prompt', name: row.slug, raw: `prompt:${row.slug}` },
        description: `Prompt-Template '${row.name}'${row.description ? ` — ${row.description}` : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            variables: {
              type: 'object',
              description: 'Schluessel-Wert-Paare fuer {{platzhalter}}-Substitution im userPrompt',
            },
            options: {
              type: 'object',
              description: 'AI-Options: { providerId, model, temperature, maxTokens }',
            },
          },
        },
      })
    }
    return tools
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const slug = invocation.ref.name
    const input = invocation.input as {
      variables?: Record<string, unknown>
      options?: { providerId?: string; model?: string; temperature?: number; maxTokens?: number }
    }
    const variables = input.variables ?? {}

    try {
      const { db } = await import('@/lib/db')
      const { aiPromptTemplates, customAiPrompts } = await import('@/lib/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [tplRow] = (await db
        .select({
          systemPrompt: aiPromptTemplates.systemPrompt,
          userPrompt: aiPromptTemplates.userPrompt,
        })
        .from(aiPromptTemplates)
        .where(and(eq(aiPromptTemplates.slug, slug), eq(aiPromptTemplates.isActive, true)))
        .limit(1)) as PromptDetailRow[]

      let row: PromptDetailRow | undefined = tplRow

      if (!row) {
        const [customRow] = (await db
          .select({
            systemPrompt: customAiPrompts.systemPrompt,
            userPrompt: customAiPrompts.userPrompt,
          })
          .from(customAiPrompts)
          .where(and(eq(customAiPrompts.id, slug), eq(customAiPrompts.isActive, true)))
          .limit(1)) as PromptDetailRow[]
        row = customRow
      }

      if (!row) {
        return { status: 'failed', error: `Prompt-Slug '${slug}' nicht gefunden oder inaktiv` }
      }

      const renderedUser = renderTemplate(row.userPrompt, variables)
      const renderedSystem = renderTemplate(row.systemPrompt, variables)

      const { AIService } = await import('@/lib/services/ai')
      const response = await AIService.complete(renderedUser, {
        systemPrompt: renderedSystem,
        providerId: input.options?.providerId,
        model: input.options?.model,
        temperature: input.options?.temperature,
        maxTokens: input.options?.maxTokens,
      })

      return {
        status: 'succeeded',
        output: { text: response.text, provider: response.provider, model: response.model },
        usage: {
          inputTokens: response.usage?.promptTokens ?? 0,
          outputTokens: response.usage?.completionTokens ?? 0,
          costCents: 0, // TODO: Pricing-Tabelle pro provider/model
          provider: response.provider,
          model: response.model,
        },
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}

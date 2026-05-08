import { db } from '@/lib/db'
import { newsItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import type { NewsItem } from '@/lib/db/schema'

export type PipelineStatus =
  | 'idle'
  | 'queued'
  | 'researching'
  | 'generating'
  | 'completed'
  | 'failed'

export interface DeepResearchResult {
  summary: string
  keyPoints: string[]
  sources: { title?: string; url?: string }[]
  context: string
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

async function runTemplate<T>(
  slug: string,
  vars: Record<string, string>,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<T> {
  const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
  const { AIService } = await import('@/lib/services/ai/ai.service')

  const template = await AiPromptTemplateService.getOrDefault(slug)
  const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, vars)
  const fullPrompt = template.outputFormat ? `${userPrompt}\n\n${template.outputFormat}` : userPrompt

  const response = await AIService.completeWithContext(fullPrompt, { feature: 'news_pipeline' }, {
    maxTokens: options.maxTokens ?? 4000,
    temperature: options.temperature ?? 0.7,
    systemPrompt: template.systemPrompt,
  })

  const jsonStr = extractJson(response.text)
  if (!jsonStr) {
    logger.error(`${slug}: no JSON in AI response`, undefined, { module: 'NewsPipelineService' })
    throw new Error(`${slug}: AI response had no parseable JSON`)
  }
  return JSON.parse(jsonStr) as T
}

export const NewsPipelineService = {
  async markStatus(
    itemId: string,
    status: PipelineStatus,
    error?: string | null,
  ): Promise<void> {
    await db
      .update(newsItems)
      .set({
        pipelineStatus: status,
        pipelineError: error ?? null,
        updatedAt: new Date(),
      })
      .where(eq(newsItems.id, itemId))
  },

  async deepResearch(item: NewsItem): Promise<DeepResearchResult> {
    const parsed = await runTemplate<Partial<DeepResearchResult>>('news-deep-research', {
      title: item.title,
      url: item.url,
      snippet: item.snippet ?? '',
      source: item.source ?? '',
    })
    if (!parsed || typeof parsed.summary !== 'string') {
      throw new Error('news-deep-research: invalid AI output')
    }
    return {
      summary: parsed.summary,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      context: typeof parsed.context === 'string' ? parsed.context : '',
    }
  },
}

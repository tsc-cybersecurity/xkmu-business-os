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

export interface BlogDraft {
  title: string
  excerpt: string
  content: string
  seoTitle?: string
  seoDescription?: string
  tags: string[]
}

export interface SocialDraft {
  platform: 'linkedin' | 'x'
  title?: string
  content: string
  hashtags: string[]
}

const DEFAULT_SOCIAL_PLATFORMS: Array<'linkedin' | 'x'> = ['linkedin', 'x']

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

  async generateBlogPost(item: NewsItem, research: DeepResearchResult): Promise<BlogDraft> {
    const parsed = await runTemplate<Partial<BlogDraft>>('news-blog-draft', {
      title: item.title,
      research: JSON.stringify(research),
    }, { maxTokens: 8000 })
    if (!parsed?.title || !parsed?.content) {
      throw new Error('news-blog-draft: invalid AI output')
    }
    return {
      title: parsed.title,
      excerpt: parsed.excerpt ?? '',
      content: parsed.content,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    }
  },

  async generateSocialPosts(
    item: NewsItem,
    research: DeepResearchResult,
    blog: { id: string; title: string; excerpt: string | null },
  ): Promise<SocialDraft[]> {
    const drafts: SocialDraft[] = []
    for (const platform of DEFAULT_SOCIAL_PLATFORMS) {
      try {
        const parsed = await runTemplate<Partial<SocialDraft>>('news-social-draft', {
          title: item.title,
          research: JSON.stringify(research),
          blogTitle: blog.title,
          blogExcerpt: blog.excerpt ?? '',
          platform,
        }, { maxTokens: 1500 })
        if (!parsed?.content) {
          logger.warn(`news-social-draft: empty content for ${platform}`, {
            module: 'NewsPipelineService',
            itemId: item.id,
          })
          continue
        }
        drafts.push({
          platform,
          title: parsed.title,
          content: parsed.content,
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        })
      } catch (err) {
        logger.warn(`news-social-draft: failed for ${platform}`, {
          module: 'NewsPipelineService',
          itemId: item.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return drafts
  },
}

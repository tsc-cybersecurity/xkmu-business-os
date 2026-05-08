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
  options: {
    maxTokens?: number
    temperature?: number
    feature?: string
    entityType?: string
    entityId?: string
  } = {},
): Promise<T> {
  const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
  const { AIService } = await import('@/lib/services/ai/ai.service')

  const template = await AiPromptTemplateService.getOrDefault(slug)
  const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, vars)
  const fullPrompt = template.outputFormat ? `${userPrompt}\n\n${template.outputFormat}` : userPrompt

  const response = await AIService.completeWithContext(
    fullPrompt,
    {
      feature: options.feature ?? slug,
      entityType: options.entityType,
      entityId: options.entityId,
    },
    {
      maxTokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      systemPrompt: template.systemPrompt,
    },
  )

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
    }, {
      feature: 'news_deep_research',
      entityType: 'news_item',
      entityId: item.id,
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
    }, {
      maxTokens: 8000,
      feature: 'news_blog_draft',
      entityType: 'news_item',
      entityId: item.id,
    })
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
        }, {
          maxTokens: 1500,
          feature: `news_social_draft_${platform}`,
          entityType: 'news_item',
          entityId: item.id,
        })
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

  async run(newsItemId: string): Promise<void> {
    const { NewsService } = await import('@/lib/services/news.service')
    const { BlogPostService } = await import('@/lib/services/blog-post.service')
    const { SocialMediaPostService } = await import('@/lib/services/social-media-post.service')

    const item = await NewsService.getItem(newsItemId)
    if (!item) throw new Error(`news item not found: ${newsItemId}`)

    try {
      // Stufe 1
      await this.markStatus(newsItemId, 'researching')
      const research = await this.deepResearch(item)
      await NewsService.updateItem(newsItemId, { researchData: research as never })

      // Stufe 2
      await this.markStatus(newsItemId, 'generating')
      const blogDraft = await this.generateBlogPost(item, research)
      const blogPost = await BlogPostService.create({
        title: blogDraft.title,
        excerpt: blogDraft.excerpt,
        content: blogDraft.content,
        seoTitle: blogDraft.seoTitle,
        seoDescription: blogDraft.seoDescription,
        tags: blogDraft.tags,
        status: 'draft',
        source: 'news',
        sourceNewsItemId: newsItemId,
      })

      // Stufe 3
      const socialDrafts = await this.generateSocialPosts(item, research, {
        id: blogPost.id,
        title: blogPost.title,
        excerpt: blogPost.excerpt,
      })
      const socialErrors: string[] = []
      for (const draft of socialDrafts) {
        try {
          await SocialMediaPostService.create({
            platform: draft.platform,
            content: draft.content,
            title: draft.title,
            hashtags: draft.hashtags,
            status: 'draft',
            aiGenerated: true,
            sourceNewsItemId: newsItemId,
          })
        } catch (e) {
          socialErrors.push(`${draft.platform}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      await this.markStatus(newsItemId, 'completed', socialErrors.length ? socialErrors.join('; ') : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.markStatus(newsItemId, 'failed', msg)
      throw err
    }
  },
}

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
  /** Englischer AI-Bildgenerierungs-Prompt fuer das Hero-Bild — wird
   *  sowohl an Gemini geschickt als auch in blog_posts.featured_image_prompt
   *  persistiert, damit Operatoren ihn nachbearbeiten und re-generieren koennen. */
  featuredImage?: string
  /** Deutscher Alt-Text. */
  featuredImageAlt?: string
}

export type SocialPlatform = 'x' | 'facebook' | 'instagram' | 'linkedin'

export interface SocialDraft {
  platform: SocialPlatform
  title?: string
  content: string
  hashtags: string[]
}

const VALID_SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['x', 'facebook', 'instagram', 'linkedin']
const DEFAULT_SOCIAL_PLATFORMS: SocialPlatform[] = ['x', 'facebook', 'instagram']
const DEFAULT_INCLUDE_IMAGE = true

function normalizeSocialConfig(raw: unknown): { platforms: SocialPlatform[]; includeImage: boolean } {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rawPlatforms = Array.isArray(obj.platforms) ? obj.platforms : []
  const platforms = rawPlatforms
    .map((p) => String(p).toLowerCase())
    .filter((p): p is SocialPlatform => (VALID_SOCIAL_PLATFORMS as readonly string[]).includes(p))
  return {
    platforms: platforms.length > 0 ? platforms : DEFAULT_SOCIAL_PLATFORMS,
    includeImage: typeof obj.includeImage === 'boolean' ? obj.includeImage : DEFAULT_INCLUDE_IMAGE,
  }
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

// Sanftes Kuerzen am letzten Wortende mit Ellipsis. Pendant zu blog-ai.service.
// Schuetzt vor varchar-Limit-Verletzungen (Postgres) wenn die KI ueberschiesst.
function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s
  const suffix = '…'
  const budget = Math.max(0, max - suffix.length)
  let cut = s.slice(0, budget)
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > budget * 0.6) cut = cut.slice(0, lastSpace)
  cut = cut.replace(/[\s,;:.\-–—]+$/u, '')
  return cut + suffix
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
  const { AiProviderService } = await import('@/lib/services/ai-provider.service')
  const { AIService } = await import('@/lib/services/ai/ai.service')

  const template = await AiPromptTemplateService.getOrDefault(slug)
  const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, vars)
  const fullPrompt = template.outputFormat ? `${userPrompt}\n\n${template.outputFormat}` : userPrompt

  // Strikter Default-Provider, kein Fallback-Cascading durch andere Provider.
  // Der News-Pipeline soll genau der unter /intern/settings/ai-providers
  // markierte Default-Provider zugewiesen werden — sonst landen Calls bei
  // einem anderen aktiven Provider mit ggf. abgelaufenem/falschem Key.
  const defaultProvider = await AiProviderService.getDefaultProvider()
  if (!defaultProvider) {
    throw new Error(
      'Kein Default-KI-Provider konfiguriert. Bitte unter /intern/settings/ai-providers einen aktiven Provider als Standard markieren.',
    )
  }

  const response = await AIService.completeWithContext(
    fullPrompt,
    {
      feature: options.feature ?? slug,
      entityType: options.entityType,
      entityId: options.entityId,
    },
    {
      providerId: defaultProvider.id,
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
    // Defensives Truncating — KI ueberschiesst gelegentlich die varchar-Limits
    // aus blog_posts (title 255, seo_title 70, seo_description 160). Sonst
    // schlaegt der Insert mit "value too long for type varchar" fehl.
    return {
      title: truncateAtWord(parsed.title, 255),
      excerpt: parsed.excerpt ?? '',
      content: parsed.content,
      seoTitle: parsed.seoTitle ? truncateAtWord(parsed.seoTitle, 70) : undefined,
      seoDescription: parsed.seoDescription ? truncateAtWord(parsed.seoDescription, 160) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      featuredImage: typeof parsed.featuredImage === 'string' ? parsed.featuredImage : undefined,
      featuredImageAlt: parsed.featuredImageAlt ? truncateAtWord(parsed.featuredImageAlt, 255) : undefined,
    }
  },

  async generateSocialPosts(
    item: NewsItem,
    research: DeepResearchResult,
    blog: { id: string; title: string; excerpt: string | null; shortcode?: string | null; slug?: string | null },
    options: { platforms: SocialPlatform[]; siteUrl: string },
  ): Promise<SocialDraft[]> {
    const drafts: SocialDraft[] = []
    const cleanSiteUrl = options.siteUrl.replace(/\/$/, '')
    // Shortcode-Kurz-URL bevorzugen (kritisch fuer X-280-Zeichen-Limit) —
    // Fallback auf /it-news/<slug> oder Stamm-URL, falls weder Shortcode
    // noch Slug bekannt sind (sollte bei frisch erstelltem Blog-Post nicht
    // passieren, aber defensiv ist sicherer).
    const url = blog.shortcode
      ? `${cleanSiteUrl}/${blog.shortcode}`
      : blog.slug
        ? `${cleanSiteUrl}/it-news/${blog.slug}`
        : cleanSiteUrl

    for (const platform of options.platforms) {
      try {
        const parsed = await runTemplate<Partial<SocialDraft>>('news-social-draft', {
          title: item.title,
          research: JSON.stringify(research),
          blogTitle: blog.title,
          blogExcerpt: blog.excerpt ?? '',
          platform,
          url,
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
        // Defensiv: falls die KI die URL nicht selbst eingebaut hat,
        // haengen wir sie hier nach an. So ist garantiert IMMER ein Link
        // zum Blog-Beitrag im Post — wichtig auch bei X.
        let content = parsed.content
        if (!content.includes(url)) {
          content = `${content.trimEnd()} ${url}`
        }
        drafts.push({
          platform,
          title: parsed.title,
          content,
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
    const { CmsDesignService } = await import('@/lib/services/cms-design.service')

    const item = await NewsService.getItem(newsItemId)
    if (!item) throw new Error(`news item not found: ${newsItemId}`)

    // Topic laden, um socialConfig (Plattformen + Bild-Flag) zu lesen.
    // Falls Topic geloescht oder ohne socialConfig: Defaults greifen.
    const topic = await NewsService.getTopic(item.topicId)
    const socialCfg = normalizeSocialConfig(topic?.socialConfig)

    try {
      // Stufe 1
      await this.markStatus(newsItemId, 'researching')
      const research = await this.deepResearch(item)
      await NewsService.updateItem(newsItemId, { researchData: research as never })

      // Stufe 2
      await this.markStatus(newsItemId, 'generating')
      const blogDraft = await this.generateBlogPost(item, research)

      // Hero-Bild via Gemini generieren (analog manuelle Blog-Generierung).
      // Non-blocking: schlaegt es fehl/timeout, wird der Post trotzdem
      // angelegt — der Bildprompt bleibt aber persistiert, Operator kann
      // im Editor manuell nachgenerieren.
      let featuredImageUrl = ''
      const imagePrompt = blogDraft.featuredImage ?? ''
      if (imagePrompt) {
        try {
          const { ImageGenerationService } = await import('@/lib/services/ai/image-generation.service')
          const result = await Promise.race([
            ImageGenerationService.generate(null, {
              prompt: imagePrompt,
              provider: 'gemini',
              aspectRatio: '16:9',
              category: 'blog',
              tags: blogDraft.tags.slice(0, 5),
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 60_000)),
          ])
          if (result && result.imageUrl) {
            featuredImageUrl = result.imageUrl
          } else {
            logger.warn('news-pipeline: image generation timed out or returned empty', { module: 'NewsPipelineService', newsItemId })
          }
        } catch (e) {
          logger.warn(`news-pipeline: image generation failed: ${e instanceof Error ? e.message : String(e)}`, { module: 'NewsPipelineService', newsItemId })
        }
      }

      const blogPost = await BlogPostService.create({
        title: blogDraft.title,
        excerpt: blogDraft.excerpt,
        content: blogDraft.content,
        featuredImage: featuredImageUrl,
        featuredImageAlt: blogDraft.featuredImageAlt,
        featuredImagePrompt: imagePrompt,
        seoTitle: blogDraft.seoTitle,
        seoDescription: blogDraft.seoDescription,
        tags: blogDraft.tags,
        status: 'draft',
        source: 'news',
        sourceNewsItemId: newsItemId,
      })

      // Stufe 3 — Social-Media-Posts pro konfigurierter Plattform.
      // Skippt komplett wenn topic.socialConfig.platforms leer ist (Operator
      // hat alle Haken entfernt). URL = App-Basis aus CMS-Design + Shortcode.
      const socialErrors: string[] = []
      if (socialCfg.platforms.length > 0) {
        const siteUrl = await CmsDesignService.getAppUrl()
        const socialDrafts = await this.generateSocialPosts(
          item,
          research,
          {
            id: blogPost.id,
            title: blogPost.title,
            excerpt: blogPost.excerpt,
            shortcode: blogPost.shortcode ?? null,
            slug: blogPost.slug ?? null,
          },
          { platforms: socialCfg.platforms, siteUrl },
        )
        const postImageUrl = socialCfg.includeImage && featuredImageUrl ? featuredImageUrl : undefined
        for (const draft of socialDrafts) {
          try {
            await SocialMediaPostService.create({
              platform: draft.platform,
              content: draft.content,
              title: draft.title,
              hashtags: draft.hashtags,
              imageUrl: postImageUrl,
              status: 'draft',
              aiGenerated: true,
              sourceNewsItemId: newsItemId,
            })
          } catch (e) {
            socialErrors.push(`${draft.platform}: ${e instanceof Error ? e.message : String(e)}`)
          }
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

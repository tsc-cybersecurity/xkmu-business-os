import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'
import { logger } from '@/lib/utils/logger'

export interface GeneratedPost {
  title: string
  slug: string
  content: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  tags: string[]
  /** Detaillierter AI-Bildgenerierungs-Prompt (Englisch). Kein Unsplash-Search-Term mehr. */
  featuredImage: string
  featuredImageAlt: string
}

export interface GeneratePostOptions {
  language: string
  tone: string
  length: string
}

const lengthGuide: Record<string, string> = {
  short: 'circa 500 Woerter',
  medium: 'circa 1000 Woerter',
  long: 'circa 2000 Woerter',
}

const toneGuide: Record<string, string> = {
  professional: 'professionell und sachlich',
  casual: 'locker und ansprechend',
  technical: 'technisch detailliert und praezise',
}

function extractJson(text: string): string | null {
  // 1. Try to extract from ```json code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 2. Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return null
}

// Hartes Kuerzen am Zeichen (fuer slugs/URLs).
function hardTruncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s
}

// Sanftes Kuerzen am letzten Wortende. Schneidet zusaetzlich Trailing-
// Punctuation/Whitespace und haengt einen Ellipsis-Marker an, wenn ueberhaupt
// gekuerzt wurde — alles innerhalb der max-Laenge.
function truncateAtWord(s: string, max: number, opts?: { suffix?: string }): string {
  if (s.length <= max) return s
  const suffix = opts?.suffix ?? '…'
  const budget = Math.max(0, max - suffix.length)
  let cut = s.slice(0, budget)
  // Letztes Whitespace vor budget suchen; falls keines, hart cutten.
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > budget * 0.6) {
    cut = cut.slice(0, lastSpace)
  }
  // Trailing Satzzeichen/Whitespace abschneiden, damit "…", nicht ", …" rauskommt.
  cut = cut.replace(/[\s,;:.\-–—]+$/u, '')
  return cut + suffix
}

export const BlogAIService = {
  /**
   * Parse AI response text into a GeneratedPost, with robust error handling
   */
  parseGeneratedPost(text: string): GeneratedPost {
    const jsonStr = extractJson(text)
    if (!jsonStr) {
      logger.error('No JSON found in response', undefined, { module: 'BlogAIService' })
      throw new Error('KI-Antwort enthielt kein JSON. Bitte erneut versuchen.')
    }

    try {
      const parsed = JSON.parse(jsonStr)

      // Validate required fields
      if (!parsed.title || !parsed.content) {
        logger.error('Parsed JSON missing required fields', undefined, { module: 'BlogAIService' })
        throw new Error('KI-Antwort unvollstaendig (Titel oder Inhalt fehlt). Bitte erneut versuchen.')
      }

      // Schema-Limits aus blog_posts (varchar-Laengen) — KI ueberschiesst gelegentlich,
      // also defensiv kuerzen damit der Insert nicht mit "value too long" kippt.
      // Slugs werden hart gecut (kein Whitespace), prosaische Felder am Wortende.
      return {
        title: truncateAtWord(String(parsed.title || ''), 255),
        slug: hardTruncate(String(parsed.slug || ''), 255),
        content: String(parsed.content || ''),
        excerpt: String(parsed.excerpt || ''),
        seoTitle: truncateAtWord(String(parsed.seoTitle || ''), 70),
        seoDescription: truncateAtWord(String(parsed.seoDescription || ''), 160),
        seoKeywords: truncateAtWord(String(parsed.seoKeywords || ''), 255, { suffix: '' }),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
        featuredImage: hardTruncate(String(parsed.featuredImage || ''), 500),
        featuredImageAlt: truncateAtWord(String(parsed.featuredImageAlt || ''), 255),
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error('JSON parse error', error, { module: 'BlogAIService' })
        throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
      }
      throw error
    }
  },

  async generatePost(
    topic: string,
    options: GeneratePostOptions,
    context: AIRequestContext
  ): Promise<GeneratedPost> {
    const lang = options.language === 'en' ? 'Englisch' : 'Deutsch'
    const tone = toneGuide[options.tone] || 'professionell'
    const length = lengthGuide[options.length] || 'circa 1000 Woerter'

    // Template aus DB laden (Fallback auf hartcodierte Defaults)
    const template = await AiPromptTemplateService.getOrDefault('blog_post_generation')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      topic,
      language: lang,
      tone,
      length,
    })
    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    // Token-Budget abhaengig von der gewuenschten Laenge: long-Inhalte lassen
    // sonst keinen Platz fuer die Metadaten-Felder am Ende des JSONs.
    const maxTokensByLength: Record<string, number> = { short: 6000, medium: 12000, long: 20000 }
    const maxTokens = maxTokensByLength[options.length] ?? 12000
    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens,
      temperature: 0.7,
      systemPrompt: template.systemPrompt,
    })

    let parsed: GeneratedPost
    try {
      parsed = this.parseGeneratedPost(response.text)
    } catch (err) {
      // Log the raw response length and a preview so we can diagnose truncation vs. format issues
      const snippet = response.text.length > 500
        ? `${response.text.substring(0, 250)}...${response.text.substring(response.text.length - 250)}`
        : response.text
      logger.error(`Blog parse failed (${response.text.length} chars). Snippet: ${snippet}`, err, { module: 'BlogAIService' })
      throw err
    }
    // Ensure slug is URL-safe
    parsed.slug = parsed.slug
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return parsed
  },

  async generateSEO(
    title: string,
    content: string,
    context: AIRequestContext
  ): Promise<{ seoTitle: string; seoDescription: string; seoKeywords: string }> {
    const template = await AiPromptTemplateService.getOrDefault('blog_seo_generation')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      title,
      content: content.substring(0, 2000),
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 2000,
      temperature: 0.3,
      systemPrompt: template.systemPrompt,
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0])
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in blog SEO generation, returning empty result', { module: 'BlogAIService', feature: 'seo_generation' })
      logger.debug('Parse error detail', { module: 'BlogAIService', error: String(parseError) })
    }

    return { seoTitle: '', seoDescription: '', seoKeywords: '' }
  },

  /**
   * Wandelt einen Blogbeitrag in 3 Social-Media-Post-Entwuerfe um (Instagram, X, LinkedIn).
   * Nutzt 3 separate, in der DB editierbare Prompt-Templates (Slugs blog_to_*) und
   * laeuft die Plattformen parallel ab.
   */
  async generateSocialPosts(
    post: { title: string; content: string | null; excerpt: string | null; slug: string },
    options: { siteUrl: string; platforms?: Array<'instagram' | 'x' | 'linkedin'> },
    context: AIRequestContext
  ): Promise<Array<{ platform: 'instagram' | 'x' | 'linkedin'; content: string; hashtags: string[] }>> {
    const platforms = options.platforms ?? ['instagram', 'x', 'linkedin']
    const slugMap: Record<'instagram' | 'x' | 'linkedin', string> = {
      instagram: 'blog_to_instagram',
      x: 'blog_to_x',
      linkedin: 'blog_to_linkedin',
    }

    const cleanSiteUrl = options.siteUrl.replace(/\/$/, '')
    const url = post.slug ? `${cleanSiteUrl}/blog/${post.slug}` : cleanSiteUrl

    const placeholders = {
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: (post.content ?? '').substring(0, 3000),
      url,
    }

    const tasks = platforms.map(async (platform) => {
      const template = await AiPromptTemplateService.getOrDefault(slugMap[platform])
      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, placeholders)
      const fullPrompt = template.outputFormat ? `${userPrompt}\n\n${template.outputFormat}` : userPrompt

      const response = await AIService.completeWithContext(fullPrompt, context, {
        maxTokens: 1500,
        temperature: 0.7,
        systemPrompt: template.systemPrompt,
      })

      let content = ''
      let hashtags: string[] = []
      try {
        const jsonStr = extractJson(response.text)
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr)
          content = String(parsed.content ?? '').trim()
          hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: unknown) => String(h)) : []
        }
      } catch (err) {
        logger.warn(`Failed to parse social post JSON for ${platform}`, { module: 'BlogAIService', error: String(err) })
      }

      return { platform, content, hashtags }
    })

    return Promise.all(tasks)
  },
}

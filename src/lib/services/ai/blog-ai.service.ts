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

      return {
        title: String(parsed.title || ''),
        slug: String(parsed.slug || ''),
        content: String(parsed.content || ''),
        excerpt: String(parsed.excerpt || ''),
        seoTitle: String(parsed.seoTitle || ''),
        seoDescription: String(parsed.seoDescription || ''),
        seoKeywords: String(parsed.seoKeywords || ''),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
        featuredImage: String(parsed.featuredImage || ''),
        featuredImageAlt: String(parsed.featuredImageAlt || ''),
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

    const prompt = `Du bist ein erfahrener Fachautor fuer IT-Themen. Erstelle einen kompletten Blogbeitrag.

Thema: ${topic}
Sprache: ${lang}
Tonalität: ${tone}
Laenge: ${length}

Erstelle einen vollstaendigen Blogbeitrag im Markdown-Format mit:
- Einleitungsabsatz
- Mehrere Abschnitte mit Ueberschriften (## H2)
- Aufzaehlungen wo sinnvoll
- Fazit

Antworte NUR als JSON:
{
  "title": "Aussagekraeftiger Titel",
  "slug": "url-freundlicher-slug",
  "content": "# Ueberschrift\\n\\nMarkdown-Inhalt...",
  "excerpt": "Kurze Zusammenfassung in 1-2 Saetzen",
  "seoTitle": "SEO-Titel (max 60 Zeichen)",
  "seoDescription": "Meta-Description (max 155 Zeichen)",
  "seoKeywords": "keyword1, keyword2, keyword3",
  "tags": ["tag1", "tag2", "tag3"],
  "featuredImage": "2-4 englische Keywords fuer Unsplash-Bildsuche, z.B. 'technology server network'",
  "featuredImageAlt": "Beschreibender Alt-Text für das Bild auf Deutsch"
}`

    const response = await AIService.completeWithContext(prompt, context, {
      maxTokens: 4000,
      temperature: 0.7,
      systemPrompt: `Du bist ein professioneller IT-Fachautor. Schreibe ${tone} auf ${lang}. Antworte NUR als valides JSON ohne Markdown-Code-Bloecke.`,
    })

    const parsed = this.parseGeneratedPost(response.text)
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
    const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'blog_seo_generation')

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
}

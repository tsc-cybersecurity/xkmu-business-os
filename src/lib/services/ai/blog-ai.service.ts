import { AIService, type AIRequestContext } from './ai.service'

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

export const BlogAIService = {
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
Tonalitaet: ${tone}
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
  "featuredImageAlt": "Beschreibender Alt-Text fuer das Bild auf Deutsch"
}`

    const response = await AIService.completeWithContext(prompt, context, {
      maxTokens: 4000,
      temperature: 0.7,
      systemPrompt: `Du bist ein professioneller IT-Fachautor. Schreibe ${tone} auf ${lang}. Antworte nur als valides JSON.`,
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as GeneratedPost
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
      }
    } catch {
      // Parsing failed
    }

    throw new Error('KI-Antwort konnte nicht verarbeitet werden')
  },

  async generateSEO(
    title: string,
    content: string,
    context: AIRequestContext
  ): Promise<{ seoTitle: string; seoDescription: string; seoKeywords: string }> {
    const prompt = `Du bist ein SEO-Experte. Generiere optimierte SEO-Metadaten fuer diesen Blogbeitrag.

Titel: ${title}
Inhalt (Auszug):
${content.substring(0, 2000)}

Generiere:
1. SEO-Titel (max 60 Zeichen)
2. Meta-Description (max 155 Zeichen)
3. Keywords (5-8 relevante Keywords, kommagetrennt)

Antworte NUR als JSON:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}`

    const response = await AIService.completeWithContext(prompt, context, {
      maxTokens: 500,
      temperature: 0.3,
      systemPrompt: 'Du bist ein SEO-Spezialist. Antworte auf Deutsch und nur als valides JSON.',
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0])
      }
    } catch {
      // Parsing failed
    }

    return { seoTitle: '', seoDescription: '', seoKeywords: '' }
  },
}

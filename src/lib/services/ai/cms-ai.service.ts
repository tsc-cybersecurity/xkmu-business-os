import { AIService, type AIRequestContext } from './ai.service'

export interface SEOResult {
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}

export const CmsAIService = {
  async generateSEO(
    pageContent: string,
    pageSlug: string,
    context: AIRequestContext
  ): Promise<SEOResult> {
    const prompt = `Du bist ein SEO-Experte. Generiere optimierte SEO-Metadaten fuer eine Webseite.

Seiten-URL: ${pageSlug}
Seiteninhalt:
${pageContent.substring(0, 2000)}

Generiere:
1. SEO-Titel (max 60 Zeichen, praegnant, mit Hauptkeyword)
2. Meta-Description (max 155 Zeichen, mit Call-to-Action)
3. Keywords (5-8 relevante Keywords, kommagetrennt)

Antworte NUR als JSON:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "keyword1, keyword2, ..."
}`

    const response = await AIService.completeWithContext(prompt, context, {
      maxTokens: 500,
      temperature: 0.3,
      systemPrompt: 'Du bist ein SEO-Spezialist fuer deutschsprachige Webseiten. Antworte immer auf Deutsch und nur als valides JSON.',
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0]) as SEOResult
      }
    } catch {
      // Parsing failed
    }

    return {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    }
  },

  async improveBlockContent(
    blockType: string,
    currentContent: Record<string, unknown>,
    instructions: string,
    context: AIRequestContext
  ): Promise<Record<string, unknown>> {
    const prompt = `Du bist ein Content-Experte. Verbessere den folgenden CMS-Block-Inhalt.

Blocktyp: ${blockType}
Aktueller Inhalt:
${JSON.stringify(currentContent, null, 2)}

Anweisungen: ${instructions}

Antworte NUR als JSON mit der gleichen Struktur wie der aktuelle Inhalt, aber mit verbesserten Texten.`

    const response = await AIService.completeWithContext(prompt, context, {
      maxTokens: 1500,
      temperature: 0.5,
      systemPrompt: 'Du bist ein Content-Spezialist. Antworte immer auf Deutsch und nur als valides JSON.',
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0])
      }
    } catch {
      // Parsing failed
    }

    return currentContent
  },
}

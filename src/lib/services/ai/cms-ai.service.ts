import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'

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
    const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'cms_seo_generation')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      pageSlug,
      pageContent: pageContent.substring(0, 2000),
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 500,
      temperature: 0.3,
      systemPrompt: template.systemPrompt,
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

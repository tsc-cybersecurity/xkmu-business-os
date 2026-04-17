import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'
import { logger } from '@/lib/utils/logger'

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
    const template = await AiPromptTemplateService.getOrDefault('', 'cms_seo_generation')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      pageSlug,
      pageContent: pageContent.substring(0, 2000),
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      temperature: 0.3,
      systemPrompt: template.systemPrompt,
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0]) as SEOResult
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in CMS SEO generation, returning empty result', { module: 'CmsAIService', feature: 'generateSEO' })
      logger.debug('Parse error detail', { module: 'CmsAIService', error: String(parseError) })
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
      temperature: 0.5,
      systemPrompt: 'Du bist ein Content-Spezialist. Antworte immer auf Deutsch und nur als valides JSON.',
    })

    try {
      const match = response.text.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0])
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in CMS block content improvement, returning original content', { module: 'CmsAIService', feature: 'improveBlockContent' })
      logger.debug('Parse error detail', { module: 'CmsAIService', error: String(parseError) })
    }

    return currentContent
  },
}

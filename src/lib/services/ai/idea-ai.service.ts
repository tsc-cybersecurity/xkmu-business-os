import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'

export interface IdeaProcessingResult {
  summary: string
  tags: string[]
}

export const IdeaAIService = {
  /**
   * Verarbeitet Rohtext einer Idee und generiert eine Zusammenfassung + Tags
   */
  async processIdea(
    rawContent: string,
    context: AIRequestContext
  ): Promise<IdeaProcessingResult> {
    const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'idea_processing')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      rawContent,
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    try {
      const response = await AIService.completeWithContext(fullPrompt, {
        ...context,
        feature: 'idea_processing',
      }, {
        maxTokens: 1000,
        temperature: 0.3,
        systemPrompt: template.systemPrompt,
      })

      // JSON aus Antwort parsen
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          summary: parsed.summary || parsed.zusammenfassung || rawContent.substring(0, 200),
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        }
      }
    } catch (error) {
      console.error('[IdeaAI] Fehler bei der Verarbeitung:', error)
    }

    // Fallback: Einfache Zusammenfassung
    return {
      summary: rawContent.substring(0, 200) + (rawContent.length > 200 ? '...' : ''),
      tags: [],
    }
  },
}

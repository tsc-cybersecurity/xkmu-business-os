import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'
import type { BusinessAnalysisResult } from '../business-profile.service'
import { logger } from '@/lib/utils/logger'

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

export const BusinessIntelligenceAIService = {
  async analyzeDocuments(
    extractedTexts: string[],
    context: AIRequestContext
  ): Promise<BusinessAnalysisResult> {
    const template = await AiPromptTemplateService.getOrDefault('', 'business_profile_analysis')

    const combinedText = extractedTexts.join('\n\n---DOKUMENT-TRENNUNG---\n\n')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      documentTexts: combinedText.substring(0, 15000),
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 8000,
      temperature: 0.3,
      systemPrompt: template.systemPrompt,
    })

    const jsonStr = extractJson(response.text)
    if (!jsonStr) {
      // Kein JSON gefunden - rawAnalysis trotzdem speichern
      return { rawAnalysis: response.text }
    }

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        companyName: parsed.companyName || undefined,
        industry: parsed.industry || undefined,
        businessModel: parsed.businessModel || undefined,
        swotAnalysis: parsed.swotAnalysis || undefined,
        marketAnalysis: parsed.marketAnalysis || undefined,
        financialSummary: parsed.financialSummary || undefined,
        keyMetrics: parsed.keyMetrics || undefined,
        recommendations: parsed.recommendations || undefined,
        rawAnalysis: response.text,
      }
    } catch (parseError) {
      // JSON kaputt (z.B. abgeschnitten) - rawAnalysis trotzdem speichern
      logger.warn('Failed to parse JSON in business analysis, returning raw text', { module: 'BusinessIntelligenceAIService', feature: 'analyzeDocuments' })
      logger.debug('Parse error detail', { module: 'BusinessIntelligenceAIService', error: String(parseError) })
      return { rawAnalysis: response.text }
    }
  },
}

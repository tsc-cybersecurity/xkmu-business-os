import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'

export interface GeneratedMarketingContent {
  subject: string
  content: string
  tone: string
}

export interface GenerateContentParams {
  type: 'email' | 'call' | 'sms'
  recipientName?: string
  recipientCompany?: string
  tone?: string
  language?: string
  context?: string
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

const slugMap: Record<string, string> = {
  email: 'marketing_email',
  call: 'marketing_call_script',
  sms: 'marketing_sms',
}

export const MarketingAIService = {
  async generateContent(
    params: GenerateContentParams,
    context: AIRequestContext
  ): Promise<GeneratedMarketingContent> {
    const slug = slugMap[params.type] || 'marketing_email'
    const template = await AiPromptTemplateService.getOrDefault(slug)

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      recipientName: params.recipientName || '',
      recipientCompany: params.recipientCompany || '',
      context: params.context || '',
      tone: params.tone || 'professional',
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: template.systemPrompt,
    })

    const jsonStr = extractJson(response.text)
    if (!jsonStr) {
      throw new Error('KI-Antwort enthielt kein JSON. Bitte erneut versuchen.')
    }

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        subject: String(parsed.subject || ''),
        content: String(parsed.content || ''),
        tone: String(parsed.tone || params.tone || 'professional'),
      }
    } catch {
      throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
    }
  },
}

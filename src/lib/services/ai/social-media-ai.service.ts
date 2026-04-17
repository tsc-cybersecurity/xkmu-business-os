import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'

export interface GeneratedPost {
  title: string
  content: string
  hashtags: string[]
}

export interface ContentPlanItem {
  platform: string
  title: string
  content: string
  hashtags: string[]
  scheduledDay?: number
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

export const SocialMediaAIService = {
  async generatePost(
    params: {
      platform: string
      topic: string
      tone?: string
      language?: string
      includeHashtags?: boolean
      includeEmoji?: boolean
    },
    context: AIRequestContext
  ): Promise<GeneratedPost> {
    const template = await AiPromptTemplateService.getOrDefault('', 'social_media_post')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      platform: params.platform,
      topic: params.topic,
      tone: params.tone || 'professional',
      includeHashtags: params.includeHashtags !== false ? 'ja' : 'nein',
      includeEmoji: params.includeEmoji !== false ? 'ja' : 'nein',
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 1500,
      temperature: 0.8,
      systemPrompt: template.systemPrompt,
    })

    const jsonStr = extractJson(response.text)
    if (!jsonStr) {
      throw new Error('KI-Antwort enthielt kein JSON. Bitte erneut versuchen.')
    }

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        title: String(parsed.title || ''),
        content: String(parsed.content || ''),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      }
    } catch {
      throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
    }
  },

  async generateContentPlan(
    params: {
      platforms: string[]
      topics?: string[]
      count?: number
      tone?: string
      language?: string
    },
    context: AIRequestContext
  ): Promise<ContentPlanItem[]> {
    const template = await AiPromptTemplateService.getOrDefault('', 'social_media_content_plan')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      platforms: params.platforms.join(', '),
      topics: params.topics?.join(', ') || 'Allgemein',
      count: String(params.count || 7),
      tone: params.tone || 'professional',
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 4000,
      temperature: 0.8,
      systemPrompt: template.systemPrompt,
    })

    const jsonStr = extractJson(response.text)
    if (!jsonStr) {
      throw new Error('KI-Antwort enthielt kein JSON. Bitte erneut versuchen.')
    }

    try {
      const parsed = JSON.parse(jsonStr)
      const items = Array.isArray(parsed) ? parsed : (parsed.posts || parsed.items || [])
      return items.map((item: Record<string, unknown>) => ({
        platform: String(item.platform || params.platforms[0]),
        title: String(item.title || ''),
        content: String(item.content || ''),
        hashtags: Array.isArray(item.hashtags) ? item.hashtags.map(String) : [],
        scheduledDay: typeof item.scheduledDay === 'number' ? item.scheduledDay : undefined,
      }))
    } catch {
      throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
    }
  },

  async generateTopics(
    params: {
      count: number
      companyName?: string
      industry?: string
      businessModel?: string
      targetGroup?: string
      strengths?: string
    },
    context: AIRequestContext
  ): Promise<Array<{ name: string; description: string }>> {
    const template = await AiPromptTemplateService.getOrDefault('', 'social_media_topic_generation')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      count: String(params.count),
      companyName: params.companyName,
      industry: params.industry,
      businessModel: params.businessModel,
      targetGroup: params.targetGroup,
      strengths: params.strengths,
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 3000,
      temperature: 0.8,
      systemPrompt: template.systemPrompt,
    })

    const jsonStr = extractJson(response.text)
    if (!jsonStr) {
      throw new Error('KI-Antwort enthielt kein JSON. Bitte erneut versuchen.')
    }

    try {
      const parsed = JSON.parse(jsonStr)
      const items = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.items || [])
      return items.map((item: Record<string, unknown>) => ({
        name: String(item.name || '').substring(0, 100),
        description: String(item.description || ''),
      }))
    } catch {
      throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
    }
  },

  async improvePost(
    params: {
      currentContent: string
      platform: string
      instructions: string
    },
    context: AIRequestContext
  ): Promise<{ content: string; hashtags: string[] }> {
    const template = await AiPromptTemplateService.getOrDefault('', 'social_media_improve')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      currentContent: params.currentContent,
      platform: params.platform,
      instructions: params.instructions,
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await AIService.completeWithContext(fullPrompt, context, {
      maxTokens: 1500,
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
        content: String(parsed.content || ''),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      }
    } catch {
      throw new Error('KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.')
    }
  },
}

import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter'
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(config?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || ''
    this.model = config?.model || DEFAULT_MODEL
    this.baseUrl = config?.baseUrl || OPENROUTER_API_URL
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const model = options?.model || this.model

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://xkmu-business-os.local',
        'X-Title': 'xKMU Business OS',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${error}`)
    }

    const data = await response.json()

    const text = data.choices?.[0]?.message?.content || ''
    const usage = data.usage

    return {
      text,
      provider: this.name,
      model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
          }
        : undefined,
    }
  }
}

import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private apiKey: string
  private defaultModel: string

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || ''
    this.defaultModel = config?.model || DEFAULT_MODEL
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const model = options?.model || this.defaultModel

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(90000),
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
      throw new Error(`OpenAI API error: ${error}`)
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

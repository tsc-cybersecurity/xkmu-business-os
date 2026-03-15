import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const DEFAULT_MODEL = 'moonshot-v1-8k'

export class KimiProvider implements AIProvider {
  name = 'kimi'
  private apiKey: string
  private defaultModel: string
  private timeoutMs: number

  constructor(config?: { apiKey?: string; model?: string; timeoutMs?: number }) {
    this.apiKey = config?.apiKey || ''
    this.defaultModel = config?.model || DEFAULT_MODEL
    this.timeoutMs = config?.timeoutMs || 60_000
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Kimi (Moonshot) API key not configured')
    }

    const model = options?.model || this.defaultModel

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
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
      throw new Error(`Kimi API error: ${error}`)
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

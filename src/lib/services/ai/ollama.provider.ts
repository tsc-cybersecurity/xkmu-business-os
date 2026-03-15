import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const DEFAULT_MODEL = 'gemma3'

export class OllamaProvider implements AIProvider {
  name = 'ollama'
  private baseUrl: string
  private defaultModel: string
  private timeoutMs: number

  constructor(config?: { baseUrl?: string; model?: string; timeoutMs?: number }) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.defaultModel = config?.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL
    this.timeoutMs = config?.timeoutMs || 120_000
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    const model = options?.model || this.defaultModel
    const url = `${this.baseUrl}/api/generate`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model,
        prompt,
        ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
        stream: false,
        options: {
          num_predict: options?.maxTokens || 1000,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${error}`)
    }

    const data = await response.json()

    return {
      text: data.response || '',
      provider: this.name,
      model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data.models?.map((m: { name: string }) => m.name) || []
    } catch {
      return []
    }
  }

  async pullModel(model: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(300_000),
        body: JSON.stringify({ name: model, stream: false }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-2.5-flash'

// Aktuelle Gemini-Modelle (Stand 2026)
export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Schnell & günstig (Empfohlen)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Leichteste Variante, sehr günstig' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Leistungsstark, höhere Kosten' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Neueste Generation (Preview)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Neueste Pro-Version (Preview)' },
] as const

export class GeminiProvider implements AIProvider {
  name = 'gemini'
  private apiKey: string
  private defaultModel: string

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey || process.env.GOOGLE_AI_API_KEY || ''
    this.defaultModel = config?.model || DEFAULT_MODEL
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const model = options?.model || this.defaultModel
    const url = `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(options?.systemPrompt ? { systemInstruction: { parts: [{ text: options.systemPrompt }] } } : {}),
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 1000,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usage = data.usageMetadata

    return {
      text,
      provider: this.name,
      model,
      usage: usage
        ? {
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          }
        : undefined,
    }
  }
}

import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const KIE_API_URL = 'https://api.kie.ai/api/v1'

export const KIE_MODELS = [
  { id: 'market/kling/kling-3.0', name: 'Kling 3.0', description: 'Text-to-Video (Empfohlen)' },
  { id: 'market/kling/image-to-video', name: 'Kling Image-to-Video', description: 'Bild zu Video' },
] as const

export class KieProvider implements AIProvider {
  name = 'kie'
  private apiKey: string
  private timeoutMs: number

  constructor(config?: { apiKey?: string; model?: string; timeoutMs?: number }) {
    this.apiKey = config?.apiKey || process.env.KIE_API_KEY || ''
    this.timeoutMs = config?.timeoutMs || 30_000
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async complete(_prompt: string, _options?: AIOptions): Promise<AIResponse> {
    throw new Error(
      'kie.ai ist ein Video/Bild-Generierungs-Provider und unterstützt keine Text-Completion. ' +
      'Verwenden Sie den KieService für Video-Generierung.'
    )
  }

  async generateVideo(prompt: string, options?: {
    model?: string
    aspectRatio?: '9:16' | '16:9' | '1:1'
    mode?: 'std' | 'pro'
    sound?: boolean
    multiShots?: boolean
    imageUrls?: string[]
  }): Promise<{ taskId: string }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const model = options?.model || 'market/kling/kling-3.0'

    const body: Record<string, unknown> = {
      model,
      prompt,
      aspect_ratio: options?.aspectRatio || '16:9',
      mode: options?.mode || 'std',
    }

    if (options?.sound !== undefined) {
      body.sound = options.sound
    }
    if (options?.multiShots !== undefined) {
      body.multi_shots = options.multiShots
    }
    if (options?.imageUrls && options.imageUrls.length > 0) {
      body.image_urls = options.imageUrls
    }

    const response = await fetch(`${KIE_API_URL}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`kie.ai API error (${response.status}): ${error}`)
    }

    const data = await response.json()

    if (!data.data?.taskId) {
      throw new Error('kie.ai API returned no taskId')
    }

    return { taskId: data.data.taskId }
  }

  async getTaskStatus(taskId: string): Promise<{
    status: string
    progress?: number
    resultUrl?: string
    error?: string
  }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const response = await fetch(`${KIE_API_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`kie.ai API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    const record = data.data

    return {
      status: record?.status || 'unknown',
      progress: record?.progress,
      resultUrl: record?.resultUrl || record?.result_url,
      error: record?.error,
    }
  }
}

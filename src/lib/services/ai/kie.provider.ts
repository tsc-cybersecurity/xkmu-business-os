import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const KIE_API_URL = 'https://api.kie.ai/api/v1'

export const KIE_MODELS = [
  { id: 'market/kling/kling-3.0', name: 'Kling 3.0', description: 'Text-to-Video (Empfohlen)', type: 'video' },
  { id: 'market/kling/image-to-video', name: 'Kling Image-to-Video', description: 'Bild zu Video', type: 'video' },
] as const

export const KIE_IMAGE_MODELS = [
  { id: 'market/fal/nano-banana', name: 'Nano Banana', description: 'Schnelle Bildgenerierung (fal.ai)', type: 'image' },
  { id: 'market/fal/flux-schnell', name: 'FLUX Schnell', description: 'Hochwertige Bildgenerierung', type: 'image' },
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

  async generateImage(prompt: string, options?: {
    model?: string
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
    width?: number
    height?: number
  }): Promise<{ taskId: string }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const model = options?.model || 'market/fal/nano-banana'

    const body: Record<string, unknown> = {
      model,
      prompt,
    }

    // kie.ai image models may use different parameter names
    if (options?.aspectRatio) {
      body.aspect_ratio = options.aspectRatio
    }
    if (options?.width && options?.height) {
      body.image_size = { width: options.width, height: options.height }
      // Also send as top-level for compatibility
      body.width = options.width
      body.height = options.height
    }

    console.log('[kie.ai] generateImage request:', JSON.stringify(body, null, 2))

    const response = await fetch(`${KIE_API_URL}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify(body),
    })

    const responseText = await response.text()
    console.log('[kie.ai] generateImage response:', response.status, responseText)

    if (!response.ok) {
      throw new Error(`kie.ai Image API error (${response.status}): ${responseText}`)
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`kie.ai returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    // kie.ai may return taskId at different levels
    const taskId = (data.data as Record<string, unknown>)?.taskId
      || data.taskId
      || (data.data as Record<string, unknown>)?.task_id
      || data.task_id
    if (!taskId) {
      throw new Error(`kie.ai API returned no taskId. Response: ${responseText.substring(0, 300)}`)
    }

    return { taskId: String(taskId) }
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
    const record = data.data || data

    // Try multiple possible URL fields for the result
    const resultUrl = record?.resultUrl
      || record?.result_url
      || record?.output?.url
      || record?.image_url
      || record?.imageUrl
      || (Array.isArray(record?.images) ? record.images[0]?.url : undefined)
      || (Array.isArray(record?.output?.images) ? record.output.images[0]?.url : undefined)

    return {
      status: record?.status || 'unknown',
      progress: record?.progress,
      resultUrl,
      error: record?.error || record?.message,
    }
  }
}

import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const KIE_API_URL = 'https://api.kie.ai/api/v1'

export const KIE_MODELS = [
  { id: 'market/kling/kling-3.0', name: 'Kling 3.0', description: 'Text-to-Video (Empfohlen)', type: 'video' },
  { id: 'market/kling/image-to-video', name: 'Kling Image-to-Video', description: 'Bild zu Video', type: 'video' },
] as const

// All kie.ai models use /jobs/createTask with model slug + /jobs/recordInfo for polling
export const KIE_IMAGE_MODELS = [
  { id: 'flux', name: 'Flux AI', description: 'Schnelle Bildgenerierung' },
  { id: 'ghibli', name: 'Ghibli AI', description: 'Studio Ghibli Stil' },
  { id: '4o', name: 'GPT-4o Image', description: 'OpenAI Bildgenerierung via kie.ai' },
  { id: 'mj', name: 'Midjourney', description: 'Midjourney Text-to-Image' },
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

  /**
   * Generate an image using kie.ai — all models use /jobs/createTask
   */
  async generateImage(prompt: string, options?: {
    model?: string
    aspectRatio?: string
  }): Promise<{ taskId: string }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const model = options?.model || 'flux'

    const body: Record<string, unknown> = {
      model,
      prompt,
      input: prompt, // some kie.ai models expect "input" instead of "prompt"
    }

    if (options?.aspectRatio) {
      body.aspect_ratio = options.aspectRatio
    }

    console.log('[kie.ai] generateImage: POST /jobs/createTask', JSON.stringify(body))

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
    console.log(`[kie.ai] generateImage response (${response.status}):`, responseText.substring(0, 500))

    if (!response.ok) {
      throw new Error(`kie.ai API error (${response.status}): ${responseText.substring(0, 300)}`)
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`kie.ai returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    const nested = data.data as Record<string, unknown> | undefined
    const taskId = nested?.taskId || nested?.task_id || data.taskId || data.task_id
    if (!taskId) {
      throw new Error(`kie.ai returned no taskId. Response: ${responseText.substring(0, 400)}`)
    }

    return { taskId: String(taskId) }
  }

  /**
   * Get task status — used for both video and image tasks
   */
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

    const responseText = await response.text()
    console.log('[kie.ai] getTaskStatus:', responseText.substring(0, 500))

    if (!response.ok) {
      throw new Error(`kie.ai query error (${response.status}): ${responseText.substring(0, 300)}`)
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`kie.ai returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    const record = (data.data as Record<string, unknown>) || data

    // Extract URL from various possible fields
    const resultUrl = (record?.resultUrl as string)
      || (record?.result_url as string)
      || (record?.imageUrl as string)
      || (record?.image_url as string)
      || (record?.url as string)
      || ((record?.output as Record<string, unknown>)?.url as string)
      || ((record?.images as Array<Record<string, unknown>>)?.[0]?.url as string)
      || undefined

    return {
      status: (record?.status as string) || 'unknown',
      progress: record?.progress as number | undefined,
      resultUrl,
      error: (record?.error as string) || (record?.message as string) || undefined,
    }
  }
}

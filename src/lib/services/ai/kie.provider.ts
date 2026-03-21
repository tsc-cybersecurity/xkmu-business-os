import type { AIProvider, AIOptions, AIResponse } from './ai.service'

const KIE_API_URL = 'https://api.kie.ai/api/v1'

export const KIE_MODELS = [
  { id: 'market/kling/kling-3.0', name: 'Kling 3.0', description: 'Text-to-Video (Empfohlen)', type: 'video' },
  { id: 'market/kling/image-to-video', name: 'Kling Image-to-Video', description: 'Bild zu Video', type: 'video' },
] as const

// Image models use different endpoints on kie.ai:
// - 4o-image: POST /jobs/createImage + GET /jobs/queryImage
// - flux: POST /jobs/fluxAi + GET /jobs/queryFluxKontext (or similar)
// - midjourney: POST /jobs/textToImage + GET /jobs/getTaskDetails
export const KIE_IMAGE_MODELS = [
  { id: 'flux', name: 'Flux AI', description: 'Schnelle Bildgenerierung', type: 'image', createEndpoint: 'fluxAi', queryEndpoint: 'queryFluxKontext' },
  { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', description: 'Hochwertige Bildgenerierung', type: 'image', createEndpoint: 'fluxKontextPro', queryEndpoint: 'queryFluxKontext' },
  { id: '4o-image', name: 'GPT-4o Image', description: 'OpenAI Bildgenerierung via kie.ai', type: 'image', createEndpoint: 'createImage', queryEndpoint: 'queryImage' },
  { id: 'midjourney', name: 'Midjourney', description: 'Midjourney Text-to-Image', type: 'image', createEndpoint: 'textToImage', queryEndpoint: 'getTaskDetails' },
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
   * Generate an image using kie.ai
   * Uses model-specific endpoints (createImage, fluxAi, textToImage, etc.)
   */
  async generateImage(prompt: string, options?: {
    model?: string
    aspectRatio?: string
    width?: number
    height?: number
    count?: number
  }): Promise<{ taskId: string; queryEndpoint: string }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const modelId = options?.model || 'flux'
    const modelConfig = KIE_IMAGE_MODELS.find(m => m.id === modelId)
    const createEndpoint = modelConfig?.createEndpoint || 'fluxAi'
    const queryEndpoint = modelConfig?.queryEndpoint || 'queryFluxKontext'

    // Build request body based on model type
    const body: Record<string, unknown> = { prompt }

    if (modelId === 'flux' || modelId.startsWith('flux')) {
      // Flux AI params
      if (options?.aspectRatio) body.ratio = options.aspectRatio
      body.outputFormat = 'png'
    } else if (modelId === '4o-image') {
      // GPT-4o Image params
      body.count = options?.count || 1
    } else if (modelId === 'midjourney') {
      // Midjourney params
      if (options?.aspectRatio) body.aspectRatio = options.aspectRatio
    }

    console.log(`[kie.ai] generateImage: POST /jobs/${createEndpoint}`, JSON.stringify(body))

    const response = await fetch(`${KIE_API_URL}/jobs/${createEndpoint}`, {
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
      throw new Error(`kie.ai Image API error (${response.status}): ${responseText.substring(0, 300)}`)
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`kie.ai returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    // Extract taskId from various possible response shapes
    const nested = data.data as Record<string, unknown> | undefined
    const taskId = nested?.taskId || nested?.task_id || data.taskId || data.task_id
    if (!taskId) {
      throw new Error(`kie.ai returned no taskId. Full response: ${responseText.substring(0, 400)}`)
    }

    return { taskId: String(taskId), queryEndpoint }
  }

  /**
   * Query image generation status using model-specific endpoint
   */
  async queryImageStatus(taskId: string, queryEndpoint: string): Promise<{
    status: string
    progress?: number
    resultUrl?: string
    error?: string
  }> {
    if (!this.apiKey) {
      throw new Error('kie.ai API key not configured')
    }

    const response = await fetch(`${KIE_API_URL}/jobs/${queryEndpoint}?taskId=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    const responseText = await response.text()
    console.log(`[kie.ai] queryImageStatus (${queryEndpoint}):`, responseText.substring(0, 500))

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

    // Extract image URL from various possible fields
    const resultUrl = record?.resultUrl as string
      || record?.result_url as string
      || record?.imageUrl as string
      || record?.image_url as string
      || (record?.output as Record<string, unknown>)?.url as string
      || ((record?.images as Array<Record<string, unknown>>)?.[0]?.url as string)
      || ((record?.output as Record<string, unknown>)?.images as Array<Record<string, unknown>>)?.[0]?.url as string
      || (record?.url as string)
      || undefined

    const status = (record?.status as string) || 'unknown'

    return {
      status,
      progress: record?.progress as number | undefined,
      resultUrl,
      error: (record?.error as string) || (record?.message as string) || undefined,
    }
  }

  /**
   * Legacy: get task status for video tasks
   */
  async getTaskStatus(taskId: string): Promise<{
    status: string
    progress?: number
    resultUrl?: string
    error?: string
  }> {
    return this.queryImageStatus(taskId, 'recordInfo')
  }
}

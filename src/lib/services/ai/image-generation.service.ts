// ============================================
// Image Generation Service
// Supports: OpenAI DALL-E 3, kie.ai (Nano Banana, FLUX)
// ============================================

import { db } from '@/lib/db'
import { generatedImages, aiProviders } from '@/lib/db/schema'
import { eq, and, desc, count, ilike, inArray } from 'drizzle-orm'
import { AiProviderService } from '../ai-provider.service'
import { KieProvider } from './kie.provider'
import { logger } from '@/lib/utils/logger'
import { ImageOptimizerService } from '../image-optimizer.service'
import { randomUUID } from 'crypto'
import path from 'path'

// ============================================
// Types
// ============================================

export interface ImageGenerationParams {
  prompt: string
  provider: 'gemini' | 'openai' | 'kie'
  model?: string
  size?: string
  style?: string // DALL-E: vivid | natural
  quality?: string // DALL-E: standard | hd
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  category?: string
  tags?: string[]
}

export interface GeneratedImageResult {
  id: string
  imageUrl: string
  prompt: string
  revisedPrompt?: string
  provider: string
  model: string
  size?: string
}

async function downloadAndSave(
  imageUrl: string,
  tenantId: string
): Promise<{ localPath: string; servePath: string; sizeBytes: number }> {
  const result = await ImageOptimizerService.optimizeFromUrl(imageUrl, `generated/${tenantId}`)
  return { localPath: result.localPath, servePath: result.servePath, sizeBytes: result.sizeBytes }
}

async function saveBase64(
  b64: string,
  tenantId: string
): Promise<{ localPath: string; servePath: string; sizeBytes: number }> {
  const result = await ImageOptimizerService.optimizeFromBase64(b64, `generated/${tenantId}`)
  return { localPath: result.localPath, servePath: result.servePath, sizeBytes: result.sizeBytes }
}

// ============================================
// Provider: OpenAI DALL-E 3
// ============================================

async function generateWithOpenAI(
  params: ImageGenerationParams,
  apiKey: string
): Promise<{ imageUrl?: string; b64?: string; revisedPrompt?: string; model: string; size: string }> {
  const model = params.model || 'dall-e-3'
  const size = params.size || '1024x1024'

  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    n: 1,
    size,
    response_format: 'b64_json',
  }
  if (params.style) body.style = params.style
  if (params.quality) body.quality = params.quality

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI DALL-E error (${response.status}): ${err}`)
  }

  const data = await response.json()
  const img = data.data?.[0]

  return {
    b64: img?.b64_json,
    imageUrl: img?.url,
    revisedPrompt: img?.revised_prompt,
    model,
    size,
  }
}

// ============================================
// Provider: Google Gemini (Imagen)
// ============================================

async function generateWithGemini(
  params: ImageGenerationParams,
  apiKey: string
): Promise<{ b64: string; model: string; size: string }> {
  const model = params.model || 'gemini-2.5-flash-image'

  const aspectRatio = params.aspectRatio || '1:1'

  const body = {
    contents: [{
      parts: [{ text: params.prompt }],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio,
      },
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini Image error (${response.status}): ${err.substring(0, 300)}`)
  }

  const data = await response.json()

  // Find the image part in the response (skip thinking parts)
  const candidates = data.candidates || []
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          b64: part.inlineData.data,
          model,
          size: aspectRatio,
        }
      }
    }
  }

  throw new Error('Gemini returned no image data. Möglicherweise wurde der Prompt abgelehnt.')
}

// ============================================
// Provider: kie.ai (Nano Banana, FLUX, etc.)
// ============================================

async function getKieApiKey(tenantId: string): Promise<string> {
  const [kieConfig] = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.providerType, 'kie'),
      eq(aiProviders.isActive, true)))
    .limit(1)
  if (!kieConfig?.apiKey) throw new Error('Kein kie.ai API-Key konfiguriert. Bitte unter Einstellungen → KI-Provider anlegen.')
  return kieConfig.apiKey
}

async function startKieTask(
  params: ImageGenerationParams,
  apiKey: string
): Promise<{ taskId: string; model: string }> {
  const provider = new KieProvider({ apiKey })
  const model = params.model || 'nano-banana-2'

  const task = await provider.generateImage(params.prompt, {
    model,
    aspectRatio: params.aspectRatio,
  })

  logger.info(`kie.ai image task created: ${task.taskId}`, { module: 'ImageGeneration' })
  return { taskId: task.taskId, model }
}

async function pollKieTask(
  taskId: string,
  apiKey: string
): Promise<{ status: string; resultUrl?: string; error?: string; progress?: number }> {
  const provider = new KieProvider({ apiKey })
  const status = await provider.getTaskStatus(taskId)
  logger.info(`kie.ai poll: status=${status.status}, progress=${status.progress}, hasUrl=${!!status.resultUrl}`, { module: 'ImageGeneration' })
  return status
}

// ============================================
// Main Service
// ============================================

export const ImageGenerationService = {
  /**
   * Generate an image and save to gallery
   */
  async generate(
    tenantId: string,
    userId: string | null,
    params: ImageGenerationParams
  ): Promise<GeneratedImageResult> {
    const startTime = Date.now()

    // Get API key for chosen provider
    const providers = await AiProviderService.getActiveProviders(tenantId)

    let servePath: string
    let sizeBytes = 0
    let revisedPrompt: string | undefined
    let actualModel: string
    let actualSize: string

    if (params.provider === 'gemini') {
      const geminiConfig = providers.find(p => p.providerType === 'gemini')
      const apiKey = geminiConfig?.apiKey || process.env.GEMINI_API_KEY
      if (!apiKey) throw new Error('Kein Gemini API-Key konfiguriert.')

      const result = await generateWithGemini(params, apiKey)
      actualModel = result.model
      actualSize = result.size

      const saved = await saveBase64(result.b64, tenantId)
      servePath = saved.servePath
      sizeBytes = saved.sizeBytes
    } else if (params.provider === 'openai') {
      const openaiConfig = providers.find(p => p.providerType === 'openai')
      const apiKey = openaiConfig?.apiKey || process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('Kein OpenAI API-Key konfiguriert.')

      const result = await generateWithOpenAI(params, apiKey)
      actualModel = result.model
      actualSize = result.size
      revisedPrompt = result.revisedPrompt

      if (result.b64) {
        const saved = await saveBase64(result.b64, tenantId)
        servePath = saved.servePath
        sizeBytes = saved.sizeBytes
      } else if (result.imageUrl) {
        const saved = await downloadAndSave(result.imageUrl, tenantId)
        servePath = saved.servePath
        sizeBytes = saved.sizeBytes
      } else {
        throw new Error('OpenAI returned no image data')
      }
    } else {
      // kie.ai — async: start task, return taskId, frontend polls
      const apiKey = await getKieApiKey(tenantId)
      const task = await startKieTask(params, apiKey)

      // Return immediately with taskId — frontend will poll /api/v1/images/status
      return {
        id: '',
        imageUrl: '',
        prompt: params.prompt,
        provider: 'kie',
        model: task.model,
        size: params.aspectRatio || '1:1',
        taskId: task.taskId,
        status: 'processing',
      } as GeneratedImageResult & { taskId: string; status: string }
    }

    // Save to gallery DB
    const [image] = await db
      .insert(generatedImages)
      .values({
        tenantId,
        prompt: params.prompt,
        revisedPrompt,
        provider: params.provider,
        model: actualModel,
        size: actualSize,
        style: params.style || null,
        imageUrl: servePath,
        mimeType: 'image/png',
        sizeBytes,
        category: params.category || 'general',
        tags: params.tags || [],
        metadata: {
          aspectRatio: params.aspectRatio,
          quality: params.quality,
        },
        createdBy: userId,
      })
      .returning()

    // Log AI usage (fire-and-forget)
    AiProviderService.createLog({
      tenantId,
      providerId: null,
      userId,
      providerType: params.provider,
      model: actualModel,
      prompt: params.prompt,
      response: servePath,
      status: 'success',
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      durationMs: Date.now() - startTime,
      feature: 'image_generation',
      entityType: null,
      entityId: null,
    }).catch(err => {
      logger.error('Failed to log image generation', err, { module: 'ImageGeneration' })
    })

    logger.info(`Image generated: ${actualModel} in ${Date.now() - startTime}ms`, { module: 'ImageGeneration' })

    return {
      id: image.id,
      imageUrl: image.imageUrl,
      prompt: image.prompt,
      revisedPrompt: image.revisedPrompt || undefined,
      provider: image.provider,
      model: image.model,
      size: image.size || undefined,
    }
  },

  /**
   * Check kie.ai task status and finalize if complete
   */
  async checkTaskStatus(
    tenantId: string,
    taskId: string,
    meta?: { prompt?: string; model?: string; category?: string }
  ): Promise<{
    status: string
    progress?: number
    imageUrl?: string
    id?: string
    error?: string
    debug?: unknown
  }> {
    const apiKey = await getKieApiKey(tenantId)
    const status = await pollKieTask(taskId, apiKey)
    logger.info(`checkTaskStatus raw: ${JSON.stringify(status)}`, { module: 'ImageGeneration' })

    if (status.status === 'completed' || status.status === 'success' || status.status === 'done') {
      if (!status.resultUrl) {
        return { status: 'error', error: 'Keine Bild-URL erhalten' }
      }

      // Download and save
      const saved = await downloadAndSave(status.resultUrl, tenantId)

      const [image] = await db
        .insert(generatedImages)
        .values({
          tenantId,
          prompt: meta?.prompt || taskId,
          provider: 'kie',
          model: meta?.model || 'nano-banana-2',
          imageUrl: saved.servePath,
          mimeType: 'image/png',
          sizeBytes: saved.sizeBytes,
          category: meta?.category || 'general',
          tags: [],
          metadata: { taskId },
        })
        .returning()

      return { status: 'completed', imageUrl: saved.servePath, id: image.id }
    }

    if (status.status === 'failed' || status.status === 'error') {
      return { status: 'error', error: status.error || 'Bildgenerierung fehlgeschlagen' }
    }

    return { status: status.status || 'processing', progress: status.progress, debug: status }
  },

  /**
   * List gallery images
   */
  async list(tenantId: string, filters?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 30
    const offset = (page - 1) * limit

    const conditions = []
    if (filters?.category && filters.category !== 'all') {
      conditions.push(eq(generatedImages.category, filters.category))
    }
    if (filters?.search) {
      conditions.push(ilike(generatedImages.prompt, `%${filters.search}%`))
    }

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select()
        .from(generatedImages)
        .where(whereClause)
        .orderBy(desc(generatedImages.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(generatedImages).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  /**
   * Get single image
   */
  async getById(tenantId: string, id: string) {
    const [image] = await db
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.id, id)))
      .limit(1)
    return image || null
  },

  /**
   * Delete image (DB + file)
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const image = await this.getById(tenantId, id)
    if (!image) return false

    // Delete file
    try {
      const { resolveMediaPath } = await import('@/lib/services/media-upload.service')
      const { unlink } = await import('fs/promises')
      const { existsSync } = await import('fs')
      const fullPath = resolveMediaPath(image.imageUrl)
      if (existsSync(fullPath)) await unlink(fullPath)
    } catch {
      logger.warn(`Failed to delete image file: ${image.imageUrl}`, { module: 'ImageGeneration' })
    }

    const result = await db
      .delete(generatedImages)
      .where(and(eq(generatedImages.id, id)))
      .returning({ id: generatedImages.id })

    return result.length > 0
  },

  /**
   * Bulk delete
   */
  async bulkDelete(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    const result = await db
      .delete(generatedImages)
      .where(and(inArray(generatedImages.id, ids)))
      .returning({ id: generatedImages.id })
    return result.length
  },
}

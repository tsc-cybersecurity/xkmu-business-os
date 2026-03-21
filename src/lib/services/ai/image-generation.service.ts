// ============================================
// Image Generation Service
// Supports: OpenAI DALL-E 3, kie.ai (Nano Banana, FLUX)
// ============================================

import { db } from '@/lib/db'
import { generatedImages, aiProviders } from '@/lib/db/schema'
import { eq, and, desc, count, ilike } from 'drizzle-orm'
import { AiProviderService } from '../ai-provider.service'
import { KieProvider } from './kie.provider'
import { logger } from '@/lib/utils/logger'
import { randomUUID } from 'crypto'
import path from 'path'

// ============================================
// Types
// ============================================

export interface ImageGenerationParams {
  prompt: string
  provider: 'openai' | 'kie'
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

// Persistent dir for generated images
const IMAGE_DIR = process.env.MEDIA_UPLOAD_DIR
  ? path.join(process.env.MEDIA_UPLOAD_DIR, 'generated')
  : path.join(process.cwd(), 'public', 'uploads', 'generated')
const USE_DATA_DIR = !!process.env.MEDIA_UPLOAD_DIR

// ============================================
// File Helpers
// ============================================

async function ensureDir(dir: string) {
  const { mkdir } = await import('fs/promises')
  const { existsSync } = await import('fs')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

async function downloadAndSave(
  imageUrl: string,
  tenantId: string
): Promise<{ localPath: string; servePath: string; sizeBytes: number }> {
  const { writeFile } = await import('fs/promises')

  const tenantDir = path.join(IMAGE_DIR, tenantId)
  await ensureDir(tenantDir)

  const filename = `${randomUUID()}.png`
  const localPath = path.join(tenantDir, filename)
  const servePath = USE_DATA_DIR
    ? `/api/v1/media/serve/generated/${tenantId}/${filename}`
    : `/uploads/generated/${tenantId}/${filename}`

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(localPath, buffer)

  return { localPath, servePath, sizeBytes: buffer.length }
}

async function saveBase64(
  b64: string,
  tenantId: string
): Promise<{ localPath: string; servePath: string; sizeBytes: number }> {
  const { writeFile } = await import('fs/promises')

  const tenantDir = path.join(IMAGE_DIR, tenantId)
  await ensureDir(tenantDir)

  const filename = `${randomUUID()}.png`
  const localPath = path.join(tenantDir, filename)
  const servePath = USE_DATA_DIR
    ? `/api/v1/media/serve/generated/${tenantId}/${filename}`
    : `/uploads/generated/${tenantId}/${filename}`

  const buffer = Buffer.from(b64, 'base64')
  await writeFile(localPath, buffer)

  return { localPath, servePath, sizeBytes: buffer.length }
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
// Provider: kie.ai (Nano Banana, FLUX, etc.)
// ============================================

async function generateWithKie(
  params: ImageGenerationParams,
  apiKey: string
): Promise<{ imageUrl: string; model: string; size: string }> {
  const provider = new KieProvider({ apiKey })
  const model = params.model || 'flux'

  const task = await provider.generateImage(params.prompt, {
    model,
    aspectRatio: params.aspectRatio,
  })

  logger.info(`kie.ai image task created: ${task.taskId} (query: ${task.queryEndpoint})`, { module: 'ImageGeneration' })

  // Poll for result using model-specific query endpoint
  const startTime = Date.now()
  let delay = 2000
  const maxWaitMs = 120_000

  while (Date.now() - startTime < maxWaitMs) {
    const status = await provider.queryImageStatus(task.taskId, task.queryEndpoint)
    logger.info(`kie.ai poll: status=${status.status}, progress=${status.progress}, hasUrl=${!!status.resultUrl}`, { module: 'ImageGeneration' })

    if (status.status === 'completed' || status.status === 'success' || status.status === 'done') {
      if (!status.resultUrl) {
        logger.error(`kie.ai task ${task.taskId} completed but no resultUrl`, undefined, { module: 'ImageGeneration' })
        throw new Error('kie.ai Aufgabe abgeschlossen, aber keine Bild-URL erhalten.')
      }
      return { imageUrl: status.resultUrl, model, size: params.aspectRatio || '1:1' }
    }

    if (status.status === 'failed' || status.status === 'error') {
      throw new Error(`Bildgenerierung fehlgeschlagen: ${status.error || 'Unbekannter Fehler'}`)
    }

    await new Promise(resolve => setTimeout(resolve, delay))
    delay = Math.min(delay * 1.5, 10000)
  }

  throw new Error('Bildgenerierung Timeout nach 120s')
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

    if (params.provider === 'openai') {
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
      // kie.ai — getActiveProviders excludes kie/firecrawl/serpapi, so query directly
      const [kieConfig] = await db
        .select()
        .from(aiProviders)
        .where(and(
          eq(aiProviders.tenantId, tenantId),
          eq(aiProviders.providerType, 'kie'),
          eq(aiProviders.isActive, true),
        ))
        .limit(1)
      const apiKey = kieConfig?.apiKey
      if (!apiKey) throw new Error('Kein kie.ai API-Key konfiguriert. Bitte unter Einstellungen → KI-Provider anlegen.')

      const result = await generateWithKie(params, apiKey)
      actualModel = result.model
      actualSize = result.size

      const saved = await downloadAndSave(result.imageUrl, tenantId)
      servePath = saved.servePath
      sizeBytes = saved.sizeBytes
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

    const conditions = [eq(generatedImages.tenantId, tenantId)]
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
      .where(and(eq(generatedImages.tenantId, tenantId), eq(generatedImages.id, id)))
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
      .where(and(eq(generatedImages.tenantId, tenantId), eq(generatedImages.id, id)))
      .returning({ id: generatedImages.id })

    return result.length > 0
  },

  /**
   * Bulk delete
   */
  async bulkDelete(tenantId: string, ids: string[]): Promise<number> {
    let count = 0
    for (const id of ids) {
      const deleted = await this.delete(tenantId, id)
      if (deleted) count++
    }
    return count
  },
}

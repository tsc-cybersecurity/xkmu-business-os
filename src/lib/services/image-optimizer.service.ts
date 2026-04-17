/**
 * Zentraler Bild-Optimierungs-Service
 *
 * Alle Bilder (Upload, KI-generiert, externe URLs) werden hier optimiert:
 * - Resize auf max. Breite (Standard: 1200px)
 * - WebP-Konvertierung (80% Quality)
 * - Gespeichert im optimierten Ordner
 *
 * Typische Ergebnisse: 60-80% kleiner als Original
 */

import { randomUUID } from 'crypto'
import path from 'path'
import { logger } from '@/lib/utils/logger'

const MAX_WIDTH = 1200
const WEBP_QUALITY = 80

const MEDIA_DIR = process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const USE_DATA_DIR = !!process.env.MEDIA_UPLOAD_DIR

export interface OptimizedImage {
  filename: string
  servePath: string
  localPath: string
  mimeType: string
  sizeBytes: number
  originalSizeBytes: number
  savedPercent: number
}

async function ensureDir(dir: string) {
  const { mkdir } = await import('fs/promises')
  const { existsSync } = await import('fs')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export const ImageOptimizerService = {
  /**
   * Optimiert einen Buffer und speichert als WebP.
   * subDir: z.B. 'uploads' oder 'generated'
   */
  async optimize(buffer: Buffer, subDir: string, options?: {
    maxWidth?: number
    quality?: number
    skipOptimize?: boolean
  }): Promise<OptimizedImage> {
    const { writeFile } = await import('fs/promises')
    const maxWidth = options?.maxWidth || MAX_WIDTH
    const quality = options?.quality || WEBP_QUALITY
    const originalSize = buffer.length

    let optimizedBuffer = buffer
    let ext = 'png'
    let mimeType = 'image/png'

    if (!options?.skipOptimize) {
      try {
        const sharp = (await import('sharp')).default
        const image = sharp(buffer)
        const metadata = await image.metadata()

        // Animated GIFs nicht konvertieren
        if (metadata.pages && metadata.pages > 1) {
          ext = 'gif'
          mimeType = 'image/gif'
        } else {
          let pipeline = image
          if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize(maxWidth, undefined, { withoutEnlargement: true })
          }
          optimizedBuffer = await pipeline.webp({ quality }).toBuffer()
          ext = 'webp'
          mimeType = 'image/webp'
        }
      } catch (error) {
        logger.error('Image optimization failed, using original', error, { module: 'ImageOptimizer' })
      }
    }

    const filename = `${randomUUID()}.${ext}`
    const outputDir = path.join(MEDIA_DIR, subDir)
    await ensureDir(outputDir)

    const localPath = path.join(outputDir, filename)
    const servePath = USE_DATA_DIR
      ? `/api/v1/media/serve/${subDir}/${filename}`
      : `/uploads/${subDir}/${filename}`

    await writeFile(localPath, optimizedBuffer)

    const savedPercent = originalSize > 0
      ? Math.round((1 - optimizedBuffer.length / originalSize) * 100)
      : 0

    if (savedPercent > 0) {
      logger.info(`Image optimized: ${(originalSize / 1024).toFixed(0)}KB -> ${(optimizedBuffer.length / 1024).toFixed(0)}KB (${savedPercent}% kleiner)`)
    }

    return {
      filename,
      servePath,
      localPath,
      mimeType,
      sizeBytes: optimizedBuffer.length,
      originalSizeBytes: originalSize,
      savedPercent,
    }
  },

  /**
   * Optimiert ein Bild von einer URL.
   */
  async optimizeFromUrl(imageUrl: string, subDir: string): Promise<OptimizedImage> {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    return this.optimize(buffer, subDir)
  },

  /**
   * Optimiert ein Base64-Bild.
   */
  async optimizeFromBase64(b64: string, subDir: string): Promise<OptimizedImage> {
    const buffer = Buffer.from(b64, 'base64')
    return this.optimize(buffer, subDir)
  },
}

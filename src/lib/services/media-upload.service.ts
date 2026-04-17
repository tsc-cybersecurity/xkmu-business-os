import { db } from '@/lib/db'
import { mediaUploads } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import type { MediaUpload } from '@/lib/db/schema'
import path from 'path'
import { logger } from '@/lib/utils/logger'
import { ImageOptimizerService } from './image-optimizer.service'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB (vor Optimierung)

const MEDIA_UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const USE_DATA_DIR = !!process.env.MEDIA_UPLOAD_DIR

async function deleteFromLocal(filePath: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')
    const { existsSync } = await import('fs')

    let fullPath: string
    const serveMatch = filePath.match(/\/api\/v1\/media\/serve\/(.+)/)
    if (serveMatch) {
      fullPath = path.join(MEDIA_UPLOAD_DIR, serveMatch[1])
    } else {
      fullPath = path.join(process.cwd(), 'public', filePath)
    }
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  } catch (error) {
    logger.error('Failed to delete local file', error, { module: 'MediaUploadService' })
  }
}

/** Resolve a media path to an absolute file path on disk */
export function resolveMediaPath(relativePath: string): string {
  const serveMatch = relativePath.match(/\/api\/v1\/media\/serve\/(.+)/)
  if (serveMatch) {
    return path.join(MEDIA_UPLOAD_DIR, serveMatch[1])
  }
  return path.join(process.cwd(), 'public', relativePath)
}

export const MediaUploadService = {
  async upload(file: File,
    uploadedBy?: string
  ): Promise<MediaUpload> {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Nicht unterstuetzter Dateityp: ${file.type}. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`)
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Datei zu gross: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_SIZE_BYTES / 1024 / 1024}MB`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await ImageOptimizerService.optimize(buffer, 'uploads')

    const [upload] = await db
      .insert(mediaUploads)
      .values({
        filename: result.filename,
        originalName: file.name,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        path: result.servePath,
        uploadedBy: uploadedBy || undefined,
      })
      .returning()

    return upload
  },

  async list(pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 50
    const offset = (page - 1) * limit

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(mediaUploads)
        .orderBy(desc(mediaUploads.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(mediaUploads),
    ])

    return {
      items,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async delete(uploadId: string): Promise<boolean> {
    const [upload] = await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.id, uploadId))
      .limit(1)

    if (!upload) return false

    await deleteFromLocal(upload.path)

    const result = await db
      .delete(mediaUploads)
      .where(eq(mediaUploads.id, uploadId))
      .returning({ id: mediaUploads.id })

    return result.length > 0
  },
}

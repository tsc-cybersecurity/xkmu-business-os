import { db } from '@/lib/db'
import { mediaUploads } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import type { MediaUpload } from '@/lib/db/schema'
import { randomUUID } from 'crypto'
import path from 'path'
import { logger } from '@/lib/utils/logger'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// Use persistent data dir (Docker volume) in production, public/ for local dev
const MEDIA_UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const USE_DATA_DIR = !!process.env.MEDIA_UPLOAD_DIR

// ============================================
// Lokales Dateisystem
// ============================================
async function uploadToLocal(file: File, filename: string, tenantId: string): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises')
  const { existsSync } = await import('fs')

  const uploadDir = path.join(MEDIA_UPLOAD_DIR, tenantId)
  const filePath = path.join(uploadDir, filename)
  // When using data dir, serve via API route; otherwise serve statically from public/
  const publicPath = USE_DATA_DIR
    ? `/api/v1/media/serve/${tenantId}/${filename}`
    : `/uploads/${tenantId}/${filename}`

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return publicPath
}

async function deleteFromLocal(filePath: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')
    const { existsSync } = await import('fs')

    // Handle both formats: /uploads/tid/file or /api/v1/media/serve/tid/file
    let fullPath: string
    const serveMatch = filePath.match(/\/api\/v1\/media\/serve\/(.+)/)
    if (serveMatch) {
      fullPath = path.join(MEDIA_UPLOAD_DIR, serveMatch[1])
    } else {
      // Legacy: /uploads/tid/file
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
  // Legacy: /uploads/tid/file
  return path.join(process.cwd(), 'public', relativePath)
}

// ============================================
// Service
// ============================================
export const MediaUploadService = {
  async upload(
    tenantId: string,
    file: File,
    uploadedBy?: string
  ): Promise<MediaUpload> {
    // Validate
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Nicht unterstuetzter Dateityp: ${file.type}. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`)
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Datei zu gross: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB`)
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${randomUUID()}.${ext}`

    const publicPath = await uploadToLocal(file, filename, tenantId)

    // Save to DB
    const [upload] = await db
      .insert(mediaUploads)
      .values({
        tenantId,
        filename,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        path: publicPath,
        uploadedBy: uploadedBy || undefined,
      })
      .returning()

    return upload
  },

  async list(tenantId: string, pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 50
    const offset = (page - 1) * limit

    const whereClause = eq(mediaUploads.tenantId, tenantId)

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(mediaUploads)
        .where(whereClause)
        .orderBy(desc(mediaUploads.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(mediaUploads).where(whereClause),
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

  async delete(tenantId: string, uploadId: string): Promise<boolean> {
    const [upload] = await db
      .select()
      .from(mediaUploads)
      .where(and(eq(mediaUploads.tenantId, tenantId), eq(mediaUploads.id, uploadId)))
      .limit(1)

    if (!upload) return false

    await deleteFromLocal(upload.path)

    // Delete from DB
    const result = await db
      .delete(mediaUploads)
      .where(and(eq(mediaUploads.tenantId, tenantId), eq(mediaUploads.id, uploadId)))
      .returning({ id: mediaUploads.id })

    return result.length > 0
  },
}

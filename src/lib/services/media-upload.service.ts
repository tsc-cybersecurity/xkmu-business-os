import { db } from '@/lib/db'
import { mediaUploads } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { MediaUpload } from '@/lib/db/schema'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

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
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId)
    const filePath = path.join(uploadDir, filename)
    const publicPath = `/uploads/${tenantId}/${filename}`

    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

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

  async list(tenantId: string): Promise<MediaUpload[]> {
    return db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.tenantId, tenantId))
      .orderBy(desc(mediaUploads.createdAt))
  },

  async delete(tenantId: string, uploadId: string): Promise<boolean> {
    const [upload] = await db
      .select()
      .from(mediaUploads)
      .where(and(eq(mediaUploads.tenantId, tenantId), eq(mediaUploads.id, uploadId)))
      .limit(1)

    if (!upload) return false

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), 'public', upload.path)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (error) {
      console.error('Failed to delete file from disk:', error)
    }

    // Delete from DB
    const result = await db
      .delete(mediaUploads)
      .where(and(eq(mediaUploads.tenantId, tenantId), eq(mediaUploads.id, uploadId)))
      .returning({ id: mediaUploads.id })

    return result.length > 0
  },
}

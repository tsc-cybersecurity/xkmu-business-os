import { db } from '@/lib/db'
import { courseAssets } from '@/lib/db/schema'
import type { CourseAsset } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'
import { logger } from '@/lib/utils/logger'
import { invalidateAssetAccess } from '@/lib/utils/course-asset-acl'
import path from 'path'
import { randomUUID } from 'crypto'

const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']
const DOC_MIMES = [
  'application/pdf', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function videoMaxBytes(): number {
  return Number(process.env.COURSE_ASSET_VIDEO_MAX_MB ?? 2048) * 1024 * 1024
}
function docMaxBytes(): number {
  return Number(process.env.COURSE_ASSET_DOC_MAX_MB ?? 50) * 1024 * 1024
}
function assetDir(): string {
  return process.env.COURSE_ASSET_DIR
    ?? path.join(process.cwd(), 'public', 'uploads', 'courses')
}

export class CourseAssetError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export type CourseAssetKind = 'video' | 'document'

export const CourseAssetService = {
  async uploadForLesson(
    lessonId: string, courseId: string, file: File, kind: CourseAssetKind,
    label: string | undefined, actor: Actor,
  ): Promise<CourseAsset> {
    const allowed = kind === 'video' ? VIDEO_MIMES : DOC_MIMES
    if (!allowed.includes(file.type)) {
      throw new CourseAssetError('INVALID_MIME', `MIME ${file.type} nicht erlaubt für ${kind}`)
    }
    const max = kind === 'video' ? videoMaxBytes() : docMaxBytes()
    if (file.size > max) {
      throw new CourseAssetError('FILE_TOO_LARGE', `Datei ${file.size} > Max ${max} bytes`)
    }

    const id = randomUUID()
    const ext = path.extname(file.name) || ''
    const relative = path.posix.join(courseId, `${id}${ext}`)
    const absolute = path.join(assetDir(), relative)

    const { mkdir, writeFile } = await import('fs/promises')
    await mkdir(path.dirname(absolute), { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(absolute, buffer)

    const [row] = await db.insert(courseAssets).values({
      id, courseId, lessonId, kind,
      filename: `${id}${ext}`, originalName: file.name,
      mimeType: file.type, sizeBytes: file.size,
      path: relative, label: label ?? null,
      uploadedBy: actor.userId,
    }).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_asset.uploaded', entityType: 'course_asset', entityId: row.id,
      payload: { lessonId, courseId, kind, sizeBytes: file.size, mime: file.type },
    })
    return row
  },

  async listByLesson(lessonId: string): Promise<CourseAsset[]> {
    return db.select().from(courseAssets).where(eq(courseAssets.lessonId, lessonId)).orderBy(courseAssets.position)
  },

  async listByCourse(courseId: string): Promise<CourseAsset[]> {
    return db.select().from(courseAssets).where(eq(courseAssets.courseId, courseId))
  },

  async get(id: string): Promise<CourseAsset | null> {
    const [row] = await db.select().from(courseAssets).where(eq(courseAssets.id, id)).limit(1)
    return row ?? null
  },

  async delete(id: string, actor: Actor): Promise<void> {
    const existing = await this.get(id)
    if (!existing) throw new CourseAssetError('NOT_FOUND', `Asset ${id} nicht gefunden`)
    await db.delete(courseAssets).where(eq(courseAssets.id, id))
    invalidateAssetAccess(id)
    try {
      const { unlink } = await import('fs/promises')
      await unlink(this.resolveAbsolutePath(existing))
    } catch (err) {
      logger.warn('Asset-Datei beim Löschen nicht gefunden', { module: 'CourseAssetService', id, err })
    }
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_asset.deleted', entityType: 'course_asset', entityId: id,
      payload: { path: existing.path },
    })
  },

  resolveAbsolutePath(asset: CourseAsset): string {
    const base = path.resolve(assetDir())
    const candidate = path.resolve(base, asset.path)
    if (!candidate.startsWith(base + path.sep) && candidate !== base) {
      throw new CourseAssetError('PATH_TRAVERSAL', `PATH_TRAVERSAL: Pfad verlässt Asset-Verzeichnis: ${asset.path}`)
    }
    return candidate
  },
}

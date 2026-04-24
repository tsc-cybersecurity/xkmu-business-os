import { db } from '@/lib/db'
import { portalDocuments } from '@/lib/db/schema'
import type { PortalDocument } from '@/lib/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { mkdir, writeFile, unlink } from 'fs/promises'
import path from 'path'
import crypto from 'node:crypto'
import { logger } from '@/lib/utils/logger'
import { PortalDocumentCategoryService } from './portal-document-category.service'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/markdown',
])

const EXT_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

const MEDIA_UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')

export interface UploadInput {
  companyId: string
  categoryId: string
  direction: 'admin_to_portal' | 'portal_to_admin'
  uploaderUserId: string
  uploaderRole: 'admin' | 'portal_user'
  file: File
  note?: string
  linkedType?: 'contract' | 'project' | 'order'
  linkedId?: string
}

export interface ListFilters {
  companyId: string
  direction?: 'admin_to_portal' | 'portal_to_admin'
  linkedType?: 'contract' | 'project' | 'order'
  linkedId?: string
  includeDeleted?: boolean
}

export interface SoftDeleteInput {
  documentId: string
  actorUserId: string
  actorRole: 'admin' | 'portal_user' | string
}

function ym(): { year: string; month: string } {
  const d = new Date()
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
  }
}

function resolveStoragePath(relative: string): string {
  return path.join(MEDIA_UPLOAD_DIR, relative)
}

async function persistFileToDisk(file: File, storagePath: string): Promise<void> {
  const fullPath = resolveStoragePath(storagePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buf)
}

export const PortalDocumentService = {
  async upload(input: UploadInput): Promise<PortalDocument> {
    if (input.file.size > MAX_SIZE_BYTES) {
      throw new Error('Datei zu groß (max 10 MB)')
    }
    if (!ALLOWED_MIME.has(input.file.type)) {
      throw new Error(`Nicht unterstützter Dateityp: ${input.file.type}`)
    }

    const category = await PortalDocumentCategoryService.getById(input.categoryId)
    if (!category || category.deletedAt) {
      throw new Error('Kategorie nicht gefunden oder gelöscht')
    }
    const catDir = category.direction
    if (catDir !== 'both' && catDir !== input.direction) {
      throw new Error(`Kategorie passt nicht zur Richtung (Kategorie: ${catDir}, gewünscht: ${input.direction})`)
    }

    if ((input.linkedType && !input.linkedId) || (!input.linkedType && input.linkedId)) {
      throw new Error('linkedType und linkedId müssen gemeinsam gesetzt sein')
    }
    if (input.linkedType && !['contract', 'project', 'order'].includes(input.linkedType)) {
      throw new Error(`Ungültiger linkedType: ${input.linkedType}`)
    }

    const ext = EXT_MAP[input.file.type] || 'bin'
    const uuid = crypto.randomUUID()
    const { year, month } = ym()
    const storagePath = path.posix.join('portal-docs', year, month, `${uuid}.${ext}`)
    await persistFileToDisk(input.file, storagePath)

    try {
      const [created] = await db.insert(portalDocuments).values({
        companyId: input.companyId,
        categoryId: input.categoryId,
        direction: input.direction,
        fileName: input.file.name || `document.${ext}`,
        storagePath,
        mimeType: input.file.type,
        sizeBytes: input.file.size,
        linkedType: input.linkedType ?? null,
        linkedId: input.linkedId ?? null,
        uploadedByUserId: input.uploaderUserId,
        uploaderRole: input.uploaderRole,
        note: input.note ?? null,
      }).returning()
      logger.info(`Portal document uploaded: ${created.fileName} (company=${input.companyId}, dir=${input.direction})`, {
        module: 'PortalDocumentService',
      })
      return created
    } catch (err) {
      try { await unlink(resolveStoragePath(storagePath)) } catch { /* ignore */ }
      throw err
    }
  },

  async getById(id: string): Promise<PortalDocument | null> {
    const [row] = await db.select().from(portalDocuments).where(eq(portalDocuments.id, id)).limit(1)
    return row ?? null
  },

  async list(filters: ListFilters): Promise<PortalDocument[]> {
    const conds = [eq(portalDocuments.companyId, filters.companyId)]
    if (filters.direction) conds.push(eq(portalDocuments.direction, filters.direction))
    if (filters.linkedType) conds.push(eq(portalDocuments.linkedType, filters.linkedType))
    if (filters.linkedId) conds.push(eq(portalDocuments.linkedId, filters.linkedId))
    if (!filters.includeDeleted) conds.push(isNull(portalDocuments.deletedAt))
    return db.select().from(portalDocuments)
      .where(and(...conds))
      .orderBy(desc(portalDocuments.createdAt))
  },

  async softDelete(input: SoftDeleteInput): Promise<PortalDocument> {
    const doc = await this.getById(input.documentId)
    if (!doc) throw new Error('Dokument nicht gefunden')
    if (doc.deletedAt) throw new Error('Dokument bereits gelöscht')

    if (input.actorRole === 'portal_user') {
      if (doc.direction !== 'portal_to_admin') {
        throw new Error('Portal-User ist für dieses Dokument nicht berechtigt')
      }
      if (doc.uploadedByUserId !== input.actorUserId) {
        throw new Error('Nur eigene Uploads können gelöscht werden')
      }
    }

    const [updated] = await db.update(portalDocuments)
      .set({ deletedAt: new Date(), deletedByUserId: input.actorUserId })
      .where(eq(portalDocuments.id, input.documentId))
      .returning()
    logger.info(`Portal document soft-deleted: ${doc.fileName} by ${input.actorRole}`, {
      module: 'PortalDocumentService',
    })
    return updated
  },

  /** Resolve disk path for streaming. */
  resolveDiskPath(storagePath: string): string {
    return resolveStoragePath(storagePath)
  },
}

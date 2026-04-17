import { db } from '@/lib/db'
import { businessDocuments } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { unlink } from 'fs/promises'
import path from 'path'
import type { BusinessDocument } from '@/lib/db/schema'

const UPLOAD_DIR = process.env.BI_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads', 'bi')

export interface BusinessDocumentFilters {
  status?: string
  page?: number
  limit?: number
}

export const BusinessDocumentService = {
  async list(_tenantId: string, filters: BusinessDocumentFilters = {}) {
    const { status, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(businessDocuments.extractionStatus, status))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(businessDocuments).where(whereClause).orderBy(desc(businessDocuments.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(businessDocuments).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(_tenantId: string, id: string): Promise<BusinessDocument | null> {
    const [doc] = await db
      .select()
      .from(businessDocuments)
      .where(eq(businessDocuments.id, id))
      .limit(1)
    return doc ?? null
  },

  async create(_tenantId: string, data: {
    filename: string
    originalName: string
    mimeType: string
    sizeBytes: number
  }, uploadedBy?: string): Promise<BusinessDocument> {
    const [doc] = await db
      .insert(businessDocuments)
      .values({
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        extractionStatus: 'pending',
        uploadedBy: uploadedBy || undefined,
      })
      .returning()
    return doc
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    // Get document record to find filename
    const doc = await this.getById(_id)
    if (!doc) return false

    const result = await db
      .delete(businessDocuments)
      .where(eq(businessDocuments.id, id))
      .returning({ id: businessDocuments.id })

    if (result.length > 0) {
      // Delete physical file (ignore errors if file already gone)
      try {
        await unlink(path.join(UPLOAD_DIR, doc.filename))
      } catch {
        // File may already be deleted
      }
      return true
    }
    return false
  },

  async updateExtraction(_tenantId: string, id: string, extractedText: string | null, status: 'processing' | 'completed' | 'failed'): Promise<BusinessDocument | null> {
    const [doc] = await db
      .update(businessDocuments)
      .set({
        extractedText,
        extractionStatus: status,
      })
      .where(eq(businessDocuments.id, id))
      .returning()
    return doc ?? null
  },

  async getExtractedDocuments(_tenantId: string): Promise<BusinessDocument[]> {
    return db
      .select()
      .from(businessDocuments)
      .where(eq(businessDocuments.extractionStatus, 'completed'))
      .orderBy(desc(businessDocuments.createdAt))
  },
}

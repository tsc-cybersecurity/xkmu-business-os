import { db } from '@/lib/db'
import { businessDocuments } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import type { BusinessDocument } from '@/lib/db/schema'

export interface BusinessDocumentFilters {
  status?: string
  page?: number
  limit?: number
}

export const BusinessDocumentService = {
  async list(tenantId: string, filters: BusinessDocumentFilters = {}) {
    const { status, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(businessDocuments.tenantId, tenantId)]
    if (status) conditions.push(eq(businessDocuments.extractionStatus, status))

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select().from(businessDocuments).where(whereClause!).orderBy(desc(businessDocuments.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(businessDocuments).where(whereClause!),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(tenantId: string, id: string): Promise<BusinessDocument | null> {
    const [doc] = await db
      .select()
      .from(businessDocuments)
      .where(and(eq(businessDocuments.tenantId, tenantId), eq(businessDocuments.id, id)))
      .limit(1)
    return doc ?? null
  },

  async create(tenantId: string, data: {
    filename: string
    originalName: string
    mimeType: string
    sizeBytes: number
  }, uploadedBy?: string): Promise<BusinessDocument> {
    const [doc] = await db
      .insert(businessDocuments)
      .values({
        tenantId,
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

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(businessDocuments)
      .where(and(eq(businessDocuments.tenantId, tenantId), eq(businessDocuments.id, id)))
      .returning({ id: businessDocuments.id })
    return result.length > 0
  },

  async updateExtraction(tenantId: string, id: string, extractedText: string | null, status: 'completed' | 'failed'): Promise<BusinessDocument | null> {
    const [doc] = await db
      .update(businessDocuments)
      .set({
        extractedText,
        extractionStatus: status,
      })
      .where(and(eq(businessDocuments.tenantId, tenantId), eq(businessDocuments.id, id)))
      .returning()
    return doc ?? null
  },

  async getExtractedDocuments(tenantId: string): Promise<BusinessDocument[]> {
    return db
      .select()
      .from(businessDocuments)
      .where(and(
        eq(businessDocuments.tenantId, tenantId),
        eq(businessDocuments.extractionStatus, 'completed')
      ))
      .orderBy(desc(businessDocuments.createdAt))
  },
}

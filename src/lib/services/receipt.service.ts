// ============================================
// Receipt Service (Belegverwaltung)
// ============================================

import { db } from '@/lib/db'
import { receipts } from '@/lib/db/schema'
import type { Receipt } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { AIService } from '@/lib/services/ai/ai.service'
import { logger } from '@/lib/utils/logger'

export const ReceiptService = {
  async list(tenantId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(receipts.tenantId, tenantId)]
    if (status) conditions.push(eq(receipts.status, status))

    const [items, [{ total }]] = await Promise.all([
      db.select().from(receipts).where(and(...conditions)).orderBy(desc(receipts.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(receipts).where(and(...conditions)),
    ])

    return { items, meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } }
  },

  async getById(tenantId: string, id: string): Promise<Receipt | null> {
    const [receipt] = await db.select().from(receipts)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id))).limit(1)
    return receipt ?? null
  },

  async create(tenantId: string, data: {
    fileName?: string
    fileUrl?: string
    amount?: string
    date?: Date
    vendor?: string
    category?: string
    notes?: string
    ocrData?: unknown
  }): Promise<Receipt> {
    const [receipt] = await db.insert(receipts).values({
      tenantId,
      fileName: data.fileName || null,
      fileUrl: data.fileUrl || null,
      amount: data.amount || null,
      date: data.date || null,
      vendor: data.vendor || null,
      category: data.category || null,
      notes: data.notes || null,
      ocrData: data.ocrData || null,
    }).returning()
    return receipt
  },

  async update(tenantId: string, id: string, data: Partial<{
    amount: string
    date: Date
    vendor: string
    category: string
    status: string
    notes: string
  }>): Promise<Receipt | null> {
    const [receipt] = await db.update(receipts).set(data)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id))).returning()
    return receipt ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(receipts)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id)))
      .returning({ id: receipts.id })
    return result.length > 0
  },

  async extractWithAI(tenantId: string, imageBase64: string): Promise<{
    amount?: string
    date?: string
    vendor?: string
    category?: string
  }> {
    try {
      const response = await AIService.completeWithContext(
        `Extrahiere aus diesem Beleg/Rechnung: Betrag (als Zahl), Datum (YYYY-MM-DD), Lieferant/Firma, Kategorie (office/travel/software/other). Antworte als JSON: {"amount":"12.50","date":"2026-01-15","vendor":"Firma XY","category":"office"}`,
        { tenantId, feature: 'receipt_ocr' },
        { maxTokens: 500, temperature: 0.1, systemPrompt: 'Du bist ein OCR-Assistent. Extrahiere strukturierte Daten aus Belegen. Antworte nur in JSON.' },
      )

      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return {}
    } catch (error) {
      logger.warn('Receipt OCR failed', { module: 'ReceiptService' })
      return {}
    }
  },
}

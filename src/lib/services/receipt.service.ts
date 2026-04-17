// ============================================
// Receipt Service (Belegverwaltung)
// ============================================

import { db } from '@/lib/db'
import { receipts } from '@/lib/db/schema'
import type { Receipt } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { logger } from '@/lib/utils/logger'

export const ReceiptService = {
  async list(filters: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(receipts.status, status))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(receipts).where(whereClause).orderBy(desc(receipts.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(receipts).where(whereClause),
    ])

    return { items, meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } }
  },

  async getById(id: string): Promise<Receipt | null> {
    const [receipt] = await db.select().from(receipts)
      .where(eq(receipts.id, id)).limit(1)
    return receipt ?? null
  },

  async create(data: {
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

  async update(id: string, data: Partial<{
    amount: string
    date: Date
    vendor: string
    category: string
    status: string
    notes: string
  }>): Promise<Receipt | null> {
    const [receipt] = await db.update(receipts).set(data)
      .where(eq(receipts.id, id)).returning()
    return receipt ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(receipts)
      .where(eq(receipts.id, id))
      .returning({ id: receipts.id })
    return result.length > 0
  },

  async extractWithAI(imageBase64: string): Promise<{
    amount?: string
    date?: string
    vendor?: string
    category?: string
  }> {
    try {
      const template = await AiPromptTemplateService.getOrDefault('receipt_ocr')
      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, { imageDescription: imageBase64.substring(0, 500) })

      const response = await AIService.completeWithContext(userPrompt,
        { feature: 'receipt_ocr' },
        { maxTokens: 500, temperature: 0.1, systemPrompt: template.systemPrompt })

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

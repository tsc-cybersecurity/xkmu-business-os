import { db } from '@/lib/db'
import { documents, documentItems } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Document, DocumentItem, NewDocumentItem } from '@/lib/db/schema'
import type { CreateDocumentItemInput, UpdateDocumentItemInput } from './document.types'

export function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discount?: number | null,
  discountType?: string | null
): number {
  let total = quantity * unitPrice
  if (discount && discount > 0) {
    if (discountType === 'percent') {
      total = total * (1 - discount / 100)
    } else {
      total = total - discount
    }
  }
  return Math.round(total * 100) / 100
}

export const DocumentCalculationService = {
  async recalculateTotals(tenantId: string, docId: string): Promise<Document | null> {
    const items = await db
      .select()
      .from(documentItems)
      .where(and(eq(documentItems.tenantId, tenantId), eq(documentItems.documentId, docId)))

    let subtotal = 0
    let taxTotal = 0

    for (const item of items) {
      const lineTotal = parseFloat(item.lineTotal || '0')
      const vatRate = parseFloat(item.vatRate || '0')
      subtotal += lineTotal
      taxTotal += lineTotal * (vatRate / 100)
    }

    // Apply document-level discount
    const [doc] = await db
      .select({ discount: documents.discount, discountType: documents.discountType })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .limit(1)

    if (!doc) return null

    let discountAmount = 0
    if (doc.discount) {
      const discountVal = parseFloat(doc.discount)
      if (doc.discountType === 'percent') {
        discountAmount = subtotal * (discountVal / 100)
      } else {
        discountAmount = discountVal
      }
    }

    const total = subtotal + taxTotal - discountAmount

    const [updated] = await db
      .update(documents)
      .set({
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .returning()

    return updated ?? null
  },

  // === Item Methods ===

  async addItem(tenantId: string, docId: string, data: CreateDocumentItemInput): Promise<DocumentItem> {
    // Get next position
    const [maxPos] = await db
      .select({ max: sql<number>`COALESCE(MAX(${documentItems.position}), -1)` })
      .from(documentItems)
      .where(and(eq(documentItems.tenantId, tenantId), eq(documentItems.documentId, docId)))

    const position = (maxPos?.max ?? -1) + 1
    const quantity = data.quantity ?? 1
    const unitPrice = data.unitPrice ?? 0
    const lineTotal = calculateLineTotal(quantity, unitPrice, data.discount, data.discountType)

    const [item] = await db
      .insert(documentItems)
      .values({
        documentId: docId,
        tenantId,
        position,
        productId: emptyToNull(data.productId),
        name: data.name,
        description: emptyToNull(data.description),
        quantity: quantity.toString(),
        unit: data.unit || 'Stück',
        unitPrice: unitPrice.toString(),
        vatRate: (data.vatRate ?? 19).toString(),
        discount: data.discount?.toString() ?? null,
        discountType: emptyToNull(data.discountType),
        lineTotal: lineTotal.toString(),
      })
      .returning()

    await this.recalculateTotals(tenantId, docId)
    return item
  },

  async updateItem(
    tenantId: string,
    docId: string,
    itemId: string,
    data: UpdateDocumentItemInput
  ): Promise<DocumentItem | null> {
    // Get existing item to merge values for recalculation
    const existing = await db
      .select()
      .from(documentItems)
      .where(
        and(
          eq(documentItems.tenantId, tenantId),
          eq(documentItems.documentId, docId),
          eq(documentItems.id, itemId)
        )
      )
      .limit(1)
      .then(r => r[0])

    if (!existing) return null

    const quantity = data.quantity ?? parseFloat(existing.quantity || '1')
    const unitPrice = data.unitPrice ?? parseFloat(existing.unitPrice || '0')
    const discount = data.discount !== undefined ? data.discount : (existing.discount ? parseFloat(existing.discount) : null)
    const discountType = data.discountType !== undefined ? data.discountType : existing.discountType
    const lineTotal = calculateLineTotal(quantity, unitPrice, discount, discountType)

    const updateData: Partial<NewDocumentItem> = { updatedAt: new Date() }

    if ('productId' in data) updateData.productId = emptyToNull(data.productId)
    if ('name' in data) updateData.name = data.name
    if ('description' in data) updateData.description = emptyToNull(data.description)
    if ('quantity' in data) updateData.quantity = quantity.toString()
    if ('unit' in data) updateData.unit = data.unit
    if ('unitPrice' in data) updateData.unitPrice = unitPrice.toString()
    if ('vatRate' in data) updateData.vatRate = (data.vatRate ?? 19).toString()
    if ('discount' in data) updateData.discount = discount?.toString() ?? null
    if ('discountType' in data) updateData.discountType = emptyToNull(discountType)
    updateData.lineTotal = lineTotal.toString()

    const [item] = await db
      .update(documentItems)
      .set(updateData)
      .where(
        and(
          eq(documentItems.tenantId, tenantId),
          eq(documentItems.documentId, docId),
          eq(documentItems.id, itemId)
        )
      )
      .returning()

    await this.recalculateTotals(tenantId, docId)
    return item ?? null
  },

  async removeItem(tenantId: string, docId: string, itemId: string): Promise<boolean> {
    const result = await db
      .delete(documentItems)
      .where(
        and(
          eq(documentItems.tenantId, tenantId),
          eq(documentItems.documentId, docId),
          eq(documentItems.id, itemId)
        )
      )
      .returning({ id: documentItems.id })

    if (result.length > 0) {
      await this.recalculateTotals(tenantId, docId)
    }
    return result.length > 0
  },

  async reorderItems(tenantId: string, docId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await db
        .update(documentItems)
        .set({ position: i })
        .where(
          and(
            eq(documentItems.tenantId, tenantId),
            eq(documentItems.documentId, docId),
            eq(documentItems.id, itemIds[i])
          )
        )
    }
  },

  async getItems(tenantId: string, docId: string): Promise<DocumentItem[]> {
    return db
      .select()
      .from(documentItems)
      .where(and(eq(documentItems.tenantId, tenantId), eq(documentItems.documentId, docId)))
      .orderBy(documentItems.position)
  },
}

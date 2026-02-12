import { db } from '@/lib/db'
import { documents, documentItems, companies, persons } from '@/lib/db/schema'
import { eq, and, ilike, count, sql, or, desc, getTableColumns } from 'drizzle-orm'
import type { Document, NewDocument, DocumentItem, NewDocumentItem } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

export interface DocumentWithDetails extends Document {
  company: { id: string; name: string } | null
  contactPerson: { id: string; firstName: string; lastName: string } | null
  items: DocumentItem[]
}

export interface DocumentListItem extends Document {
  company: { id: string; name: string } | null
  contactPerson: { id: string; firstName: string; lastName: string } | null
}

export interface DocumentFilters {
  type?: string
  status?: string | string[]
  companyId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateDocumentInput {
  type: string
  number?: string
  companyId?: string | null
  contactPersonId?: string | null
  issueDate?: string
  dueDate?: string
  validUntil?: string
  notes?: string
  paymentTerms?: string
  discount?: number | null
  discountType?: string | null
  customerName?: string
  customerStreet?: string
  customerHouseNumber?: string
  customerPostalCode?: string
  customerCity?: string
  customerCountry?: string
  customerVatId?: string
}

export type UpdateDocumentInput = Partial<CreateDocumentInput>

export interface CreateDocumentItemInput {
  productId?: string | null
  name: string
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  vatRate?: number
  discount?: number | null
  discountType?: string | null
}

export type UpdateDocumentItemInput = Partial<CreateDocumentItemInput>

// Valid status transitions
const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
}

const OFFER_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
}

function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

function calculateLineTotal(quantity: number, unitPrice: number, discount?: number | null, discountType?: string | null): number {
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

export const DocumentService = {
  async generateNumber(tenantId: string, type: string, year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear()
    const prefix = type === 'invoice' ? 'RE' : 'AN'
    const pattern = `${prefix}-${currentYear}-%`

    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.type, type),
          sql`${documents.number} LIKE ${pattern}`
        )
      )

    const nextNum = (Number(result?.count) || 0) + 1
    return `${prefix}-${currentYear}-${String(nextNum).padStart(4, '0')}`
  },

  async getNextNumber(tenantId: string, type: string): Promise<string> {
    return this.generateNumber(tenantId, type)
  },

  async create(
    tenantId: string,
    data: CreateDocumentInput,
    createdBy?: string
  ): Promise<Document> {
    // Auto-generate number if not provided
    const number = data.number || await this.generateNumber(tenantId, data.type)

    // Snapshot company address if companyId provided and no customer address given
    let customerSnapshot: Partial<NewDocument> = {}
    if (data.companyId && !data.customerName) {
      const [company] = await db
        .select()
        .from(companies)
        .where(and(eq(companies.tenantId, tenantId), eq(companies.id, data.companyId)))
        .limit(1)

      if (company) {
        customerSnapshot = {
          customerName: company.name,
          customerStreet: company.street,
          customerHouseNumber: company.houseNumber,
          customerPostalCode: company.postalCode,
          customerCity: company.city,
          customerCountry: company.country,
          customerVatId: company.vatId,
        }
      }
    }

    const [doc] = await db
      .insert(documents)
      .values({
        tenantId,
        type: data.type,
        number,
        companyId: emptyToNull(data.companyId),
        contactPersonId: emptyToNull(data.contactPersonId),
        status: 'draft',
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: emptyToNull(data.notes),
        paymentTerms: emptyToNull(data.paymentTerms),
        discount: data.discount?.toString() ?? null,
        discountType: emptyToNull(data.discountType),
        customerName: data.customerName || customerSnapshot.customerName || null,
        customerStreet: data.customerStreet || customerSnapshot.customerStreet || null,
        customerHouseNumber: data.customerHouseNumber || customerSnapshot.customerHouseNumber || null,
        customerPostalCode: data.customerPostalCode || customerSnapshot.customerPostalCode || null,
        customerCity: data.customerCity || customerSnapshot.customerCity || null,
        customerCountry: data.customerCountry || customerSnapshot.customerCountry || null,
        customerVatId: data.customerVatId || customerSnapshot.customerVatId || null,
        createdBy,
      })
      .returning()

    return doc
  },

  async getById(tenantId: string, docId: string): Promise<DocumentWithDetails | null> {
    const [row] = await db
      .select({
        ...getTableColumns(documents),
        company: {
          id: companies.id,
          name: companies.name,
        },
        contactPerson: {
          id: persons.id,
          firstName: persons.firstName,
          lastName: persons.lastName,
        },
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(persons, eq(documents.contactPersonId, persons.id))
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .limit(1)

    if (!row) return null

    const items = await db
      .select()
      .from(documentItems)
      .where(and(eq(documentItems.tenantId, tenantId), eq(documentItems.documentId, docId)))
      .orderBy(documentItems.position)

    return {
      ...row,
      company: row.company?.id ? row.company : null,
      contactPerson: row.contactPerson?.id ? row.contactPerson : null,
      items,
    }
  },

  async update(
    tenantId: string,
    docId: string,
    data: UpdateDocumentInput
  ): Promise<Document | null> {
    // Check document exists and is in draft status
    const existing = await db
      .select({ status: documents.status })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .limit(1)
      .then(r => r[0])

    if (!existing) return null
    if (existing.status !== 'draft') {
      throw new Error('Nur Dokumente im Status "Entwurf" können bearbeitet werden')
    }

    const { discount, ...rest } = data
    const updateData: Partial<NewDocument> = {
      updatedAt: new Date(),
    }

    // Map simple string fields
    if ('notes' in data) updateData.notes = emptyToNull(data.notes)
    if ('paymentTerms' in data) updateData.paymentTerms = emptyToNull(data.paymentTerms)
    if ('companyId' in data) updateData.companyId = emptyToNull(data.companyId)
    if ('contactPersonId' in data) updateData.contactPersonId = emptyToNull(data.contactPersonId)
    if ('discountType' in data) updateData.discountType = emptyToNull(data.discountType)
    if ('number' in data && data.number) updateData.number = data.number
    if ('type' in data && data.type) updateData.type = data.type

    // Date fields
    if ('issueDate' in data) updateData.issueDate = data.issueDate ? new Date(data.issueDate) : null
    if ('dueDate' in data) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if ('validUntil' in data) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null

    // Decimal fields
    if (discount !== undefined) updateData.discount = discount?.toString() ?? null

    // Customer address snapshot fields
    if ('customerName' in data) updateData.customerName = emptyToNull(data.customerName)
    if ('customerStreet' in data) updateData.customerStreet = emptyToNull(data.customerStreet)
    if ('customerHouseNumber' in data) updateData.customerHouseNumber = emptyToNull(data.customerHouseNumber)
    if ('customerPostalCode' in data) updateData.customerPostalCode = emptyToNull(data.customerPostalCode)
    if ('customerCity' in data) updateData.customerCity = emptyToNull(data.customerCity)
    if ('customerCountry' in data) updateData.customerCountry = emptyToNull(data.customerCountry)
    if ('customerVatId' in data) updateData.customerVatId = emptyToNull(data.customerVatId)

    const [doc] = await db
      .update(documents)
      .set(updateData)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .returning()

    return doc ?? null
  },

  async delete(tenantId: string, docId: string): Promise<boolean> {
    // Only draft documents can be deleted
    const existing = await db
      .select({ status: documents.status })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .limit(1)
      .then(r => r[0])

    if (!existing) return false
    if (existing.status !== 'draft') {
      throw new Error('Nur Dokumente im Status "Entwurf" können gelöscht werden')
    }

    const result = await db
      .delete(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .returning({ id: documents.id })

    return result.length > 0
  },

  async list(
    tenantId: string,
    filters: DocumentFilters = {}
  ): Promise<PaginatedResult<DocumentListItem>> {
    const { type, status, companyId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(documents.tenantId, tenantId)]

    if (type) conditions.push(eq(documents.type, type))

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(sql`${documents.status} = ANY(${status})`)
      } else {
        conditions.push(eq(documents.status, status))
      }
    }

    if (companyId) conditions.push(eq(documents.companyId, companyId))

    if (dateFrom) conditions.push(sql`${documents.issueDate} >= ${new Date(dateFrom)}`)
    if (dateTo) conditions.push(sql`${documents.issueDate} <= ${new Date(dateTo)}`)

    if (search) {
      conditions.push(
        or(
          ilike(documents.number, `%${search}%`),
          ilike(documents.customerName, `%${search}%`)
        )!
      )
    }

    const whereClause = and(...conditions)

    const [rows, [{ count: total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(documents),
          company: {
            id: companies.id,
            name: companies.name,
          },
          contactPerson: {
            id: persons.id,
            firstName: persons.firstName,
            lastName: persons.lastName,
          },
        })
        .from(documents)
        .leftJoin(companies, eq(documents.companyId, companies.id))
        .leftJoin(persons, eq(documents.contactPersonId, persons.id))
        .where(whereClause)
        .orderBy(desc(documents.issueDate))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(documents).where(whereClause),
    ])

    const items: DocumentListItem[] = rows.map((row) => ({
      ...row,
      company: row.company?.id ? row.company : null,
      contactPerson: row.contactPerson?.id ? row.contactPerson : null,
    }))

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

  async updateStatus(tenantId: string, docId: string, newStatus: string): Promise<Document | null> {
    const existing = await db
      .select({ status: documents.status, type: documents.type })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .limit(1)
      .then(r => r[0])

    if (!existing) return null

    const transitions = existing.type === 'invoice' ? INVOICE_TRANSITIONS : OFFER_TRANSITIONS
    const allowed = transitions[existing.status || 'draft'] || []

    if (!allowed.includes(newStatus)) {
      throw new Error(`Statuswechsel von "${existing.status}" zu "${newStatus}" ist nicht erlaubt`)
    }

    const [doc] = await db
      .update(documents)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(documents.tenantId, tenantId), eq(documents.id, docId)))
      .returning()

    return doc ?? null
  },

  async convertOfferToInvoice(tenantId: string, offerId: string, createdBy?: string): Promise<Document | null> {
    const offer = await this.getById(tenantId, offerId)
    if (!offer) return null
    if (offer.type !== 'offer') throw new Error('Nur Angebote können umgewandelt werden')
    if (offer.status !== 'accepted' && offer.status !== 'sent') {
      throw new Error('Nur versendete oder angenommene Angebote können umgewandelt werden')
    }

    const number = await this.generateNumber(tenantId, 'invoice')

    const [invoice] = await db
      .insert(documents)
      .values({
        tenantId,
        type: 'invoice',
        number,
        companyId: offer.companyId,
        contactPersonId: offer.contactPersonId,
        status: 'draft',
        issueDate: new Date(),
        subtotal: offer.subtotal,
        taxTotal: offer.taxTotal,
        total: offer.total,
        discount: offer.discount,
        discountType: offer.discountType,
        notes: offer.notes,
        paymentTerms: offer.paymentTerms,
        customerName: offer.customerName,
        customerStreet: offer.customerStreet,
        customerHouseNumber: offer.customerHouseNumber,
        customerPostalCode: offer.customerPostalCode,
        customerCity: offer.customerCity,
        customerCountry: offer.customerCountry,
        customerVatId: offer.customerVatId,
        convertedFromId: offerId,
        createdBy,
      })
      .returning()

    // Copy items
    if (offer.items.length > 0) {
      await db.insert(documentItems).values(
        offer.items.map((item) => ({
          documentId: invoice.id,
          tenantId,
          position: item.position,
          productId: item.productId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          discountType: item.discountType,
          lineTotal: item.lineTotal,
        }))
      )
    }

    return invoice
  },

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

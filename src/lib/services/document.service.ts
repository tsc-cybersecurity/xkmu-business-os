import { db } from '@/lib/db'
import { documents, documentItems, companies, persons } from '@/lib/db/schema'
import { eq, and, ilike, count, sql, or, desc, getTableColumns } from 'drizzle-orm'
import type { Document, NewDocument, DocumentItem } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import { DocumentCalculationService, emptyToNull } from './document-calculation.service'

// Re-export types so existing imports continue to work
export type {
  DocumentWithDetails,
  DocumentListItem,
  DocumentFilters,
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateDocumentItemInput,
  UpdateDocumentItemInput,
} from './document.types'

// Re-export calculation utilities for direct usage
export { calculateLineTotal, emptyToNull } from './document-calculation.service'

import type {
  DocumentWithDetails,
  DocumentListItem,
  DocumentFilters,
  CreateDocumentInput,
  UpdateDocumentInput,
} from './document.types'

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

const CONTRACT_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['signed', 'rejected'],
  signed: ['active'],
  active: ['terminated', 'expired'],
}

export const DocumentService = {
  async generateNumber(type: string, year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear()
    const prefix = type === 'invoice' ? 'RE' : type === 'contract' ? 'VT' : 'AN'
    const pattern = `${prefix}-${currentYear}-%`

    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(
        and(
          eq(documents.type, type),
          sql`${documents.number} LIKE ${pattern}`
        )
      )

    const nextNum = (Number(result?.count) || 0) + 1
    return `${prefix}-${currentYear}-${String(nextNum).padStart(4, '0')}`
  },

  async getNextNumber(type: string): Promise<string> {
    return this.generateNumber(type)
  },

  async create(data: CreateDocumentInput,
    createdBy?: string
  ): Promise<Document> {
    // Auto-generate number if not provided
    const number = data.number || await this.generateNumber(data.type)

    // Snapshot company address if companyId provided and no customer address given
    let customerSnapshot: Partial<NewDocument> = {}
    if (data.companyId && !data.customerName) {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, data.companyId))
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
        // Contract-specific fields
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        contractRenewalType: data.contractRenewalType || null,
        contractRenewalPeriod: data.contractRenewalPeriod || null,
        contractNoticePeriodDays: data.contractNoticePeriodDays ?? null,
        contractTemplateId: emptyToNull(data.contractTemplateId),
        projectId: emptyToNull(data.projectId),
        contractBodyHtml: emptyToNull(data.contractBodyHtml),
        createdBy,
      })
      .returning()

    return doc
  },

  async getById(docId: string): Promise<DocumentWithDetails | null> {
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
      .where(eq(documents.id, docId))
      .limit(1)

    if (!row) return null

    const items = await db
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, docId))
      .orderBy(documentItems.position)

    return {
      ...row,
      company: row.company?.id ? row.company : null,
      contactPerson: row.contactPerson?.id ? row.contactPerson : null,
      items,
    }
  },

  async update(docId: string,
    data: UpdateDocumentInput
  ): Promise<Document | null> {
    // Check document exists. Draft-only guard applies to invoices/offers
    // (legal/accounting implications once sent). Contracts can be edited
    // in any status — workflow may still go on after they were sent/signed.
    const existing = await db
      .select({ status: documents.status, type: documents.type })
      .from(documents)
      .where(eq(documents.id, docId))
      .limit(1)
      .then(r => r[0])

    if (!existing) return null
    if (existing.type !== 'contract' && existing.status !== 'draft') {
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

    // Contract-specific fields
    if ('contractStartDate' in data) {
      updateData.contractStartDate = data.contractStartDate ? new Date(data.contractStartDate) : null
    }
    if ('contractEndDate' in data) {
      updateData.contractEndDate = data.contractEndDate ? new Date(data.contractEndDate) : null
    }
    if ('contractRenewalType' in data) updateData.contractRenewalType = (data.contractRenewalType as 'none'|'manual'|'auto') ?? null
    if ('contractRenewalPeriod' in data) updateData.contractRenewalPeriod = (data.contractRenewalPeriod as 'monthly'|'quarterly'|'yearly') ?? null
    if ('contractNoticePeriodDays' in data) {
      updateData.contractNoticePeriodDays = typeof data.contractNoticePeriodDays === 'number' ? data.contractNoticePeriodDays : null
    }
    if ('contractTemplateId' in data) updateData.contractTemplateId = emptyToNull(data.contractTemplateId)
    if ('projectId' in data) updateData.projectId = emptyToNull(data.projectId)
    if ('contractBodyHtml' in data) updateData.contractBodyHtml = emptyToNull(data.contractBodyHtml)

    const [doc] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, docId))
      .returning()

    return doc ?? null
  },

  async delete(docId: string): Promise<boolean> {
    // Only draft documents can be deleted
    const existing = await db
      .select({ status: documents.status })
      .from(documents)
      .where(eq(documents.id, docId))
      .limit(1)
      .then(r => r[0])

    if (!existing) return false
    if (existing.status !== 'draft') {
      throw new Error('Nur Dokumente im Status "Entwurf" können gelöscht werden')
    }

    const result = await db
      .delete(documents)
      .where(eq(documents.id, docId))
      .returning({ id: documents.id })

    return result.length > 0
  },

  async list(filters: DocumentFilters = {}
  ): Promise<PaginatedResult<DocumentListItem>> {
    const { type, status, companyId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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

  async updateStatus(docId: string, newStatus: string): Promise<Document | null> {
    const existing = await db
      .select({ status: documents.status, type: documents.type })
      .from(documents)
      .where(eq(documents.id, docId))
      .limit(1)
      .then(r => r[0])

    if (!existing) return null

    const transitions = existing.type === 'invoice'
      ? INVOICE_TRANSITIONS
      : existing.type === 'contract'
        ? CONTRACT_TRANSITIONS
        : OFFER_TRANSITIONS
    const allowed = transitions[existing.status || 'draft'] || []

    if (!allowed.includes(newStatus)) {
      throw new Error(`Statuswechsel von "${existing.status}" zu "${newStatus}" ist nicht erlaubt`)
    }

    const [doc] = await db
      .update(documents)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(documents.id, docId))
      .returning()

    return doc ?? null
  },

  async convertOfferToInvoice(offerId: string, createdBy?: string): Promise<Document | null> {
    const offer = await this.getById(offerId)
    if (!offer) return null
    if (offer.type !== 'offer') throw new Error('Nur Angebote können umgewandelt werden')
    if (offer.status !== 'accepted' && offer.status !== 'sent') {
      throw new Error('Nur versendete oder angenommene Angebote können umgewandelt werden')
    }

    const number = await this.generateNumber('invoice')

    const [invoice] = await db
      .insert(documents)
      .values({
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

  async convertContractToDocument(contractId: string,
    targetType: 'offer' | 'invoice',
    createdBy?: string
  ): Promise<Document | null> {
    const contract = await this.getById(contractId)
    if (!contract) return null
    if (contract.type !== 'contract') throw new Error('Nur Vertraege koennen umgewandelt werden')

    const number = await this.generateNumber(targetType)

    const [newDoc] = await db
      .insert(documents)
      .values({
        type: targetType,
        number,
        companyId: contract.companyId,
        contactPersonId: contract.contactPersonId,
        status: 'draft',
        issueDate: new Date(),
        subtotal: contract.subtotal,
        taxTotal: contract.taxTotal,
        total: contract.total,
        discount: contract.discount,
        discountType: contract.discountType,
        notes: contract.notes,
        paymentTerms: contract.paymentTerms,
        customerName: contract.customerName,
        customerStreet: contract.customerStreet,
        customerHouseNumber: contract.customerHouseNumber,
        customerPostalCode: contract.customerPostalCode,
        customerCity: contract.customerCity,
        customerCountry: contract.customerCountry,
        customerVatId: contract.customerVatId,
        convertedFromId: contractId,
        createdBy,
      })
      .returning()

    // Copy items
    if (contract.items.length > 0) {
      await db.insert(documentItems).values(
        contract.items.map((item) => ({
          documentId: newDoc.id,
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

    return newDoc
  },

  // Delegate calculation and item methods to DocumentCalculationService
  recalculateTotals: DocumentCalculationService.recalculateTotals.bind(DocumentCalculationService),
  addItem: DocumentCalculationService.addItem.bind(DocumentCalculationService),
  updateItem: DocumentCalculationService.updateItem.bind(DocumentCalculationService),
  removeItem: DocumentCalculationService.removeItem.bind(DocumentCalculationService),
  reorderItems: DocumentCalculationService.reorderItems.bind(DocumentCalculationService),
  getItems: DocumentCalculationService.getItems.bind(DocumentCalculationService),
}

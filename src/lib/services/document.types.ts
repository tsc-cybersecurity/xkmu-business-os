import type { Document, DocumentItem } from '@/lib/db/schema'

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
  // Contract-specific fields
  contractStartDate?: string
  contractEndDate?: string
  contractRenewalType?: string
  contractRenewalPeriod?: string
  contractNoticePeriodDays?: number
  contractTemplateId?: string | null
  projectId?: string | null
  contractBodyHtml?: string
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

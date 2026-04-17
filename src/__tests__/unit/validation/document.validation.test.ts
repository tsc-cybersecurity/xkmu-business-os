import { describe, it, expect } from 'vitest'
import { documentTypeSchema,
  invoiceStatusSchema,
  offerStatusSchema,
  discountTypeSchema,
  createDocumentSchema,
  updateDocumentSchema,
  createDocumentItemSchema,
  updateDocumentItemSchema,
  updateDocumentStatusSchema,
} from '@/lib/utils/validation'

describe('documentTypeSchema', () => {
  it('accepts invoice', () => {
    expect(documentTypeSchema.safeParse('invoice').success).toBe(true)
  })

  it('accepts offer', () => {
    expect(documentTypeSchema.safeParse('offer').success).toBe(true)
  })

  it('rejects unknown type', () => {
    expect(documentTypeSchema.safeParse('receipt').success).toBe(false)
  })
})

describe('invoiceStatusSchema', () => {
  it('accepts draft', () => {
    expect(invoiceStatusSchema.safeParse('draft').success).toBe(true)
  })

  it('accepts sent', () => {
    expect(invoiceStatusSchema.safeParse('sent').success).toBe(true)
  })

  it('accepts paid', () => {
    expect(invoiceStatusSchema.safeParse('paid').success).toBe(true)
  })

  it('accepts overdue', () => {
    expect(invoiceStatusSchema.safeParse('overdue').success).toBe(true)
  })

  it('accepts cancelled', () => {
    expect(invoiceStatusSchema.safeParse('cancelled').success).toBe(true)
  })

  it('rejects unknown status', () => {
    expect(invoiceStatusSchema.safeParse('archived').success).toBe(false)
  })
})

describe('offerStatusSchema', () => {
  it('accepts draft', () => {
    expect(offerStatusSchema.safeParse('draft').success).toBe(true)
  })

  it('accepts sent', () => {
    expect(offerStatusSchema.safeParse('sent').success).toBe(true)
  })

  it('accepts accepted', () => {
    expect(offerStatusSchema.safeParse('accepted').success).toBe(true)
  })

  it('accepts rejected', () => {
    expect(offerStatusSchema.safeParse('rejected').success).toBe(true)
  })

  it('accepts expired', () => {
    expect(offerStatusSchema.safeParse('expired').success).toBe(true)
  })

  it('rejects unknown status', () => {
    expect(offerStatusSchema.safeParse('cancelled').success).toBe(false)
  })
})

describe('discountTypeSchema', () => {
  it('accepts percent', () => {
    expect(discountTypeSchema.safeParse('percent').success).toBe(true)
  })

  it('accepts fixed', () => {
    expect(discountTypeSchema.safeParse('fixed').success).toBe(true)
  })

  it('rejects unknown discount type', () => {
    expect(discountTypeSchema.safeParse('absolute').success).toBe(false)
  })
})

describe('createDocumentSchema', () => {
  it('accepts valid minimal input (invoice)', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('invoice')
    }
  })

  it('accepts valid minimal input (offer)', () => {
    const result = createDocumentSchema.safeParse({ type: 'offer' })
    expect(result.success).toBe(true)
  })

  it('accepts valid full invoice input', () => {
    const result = createDocumentSchema.safeParse({
      type: 'invoice',
      number: 'RE-2024-001',
      issueDate: '2024-01-15',
      dueDate: '2024-02-15',
      notes: 'Bitte überweisen Sie den Betrag innerhalb von 30 Tagen.',
      paymentTerms: '30 Tage netto',
      discount: 10,
      discountType: 'percent',
      customerName: 'Muster GmbH',
      customerStreet: 'Hauptstraße',
      customerHouseNumber: '1',
      customerPostalCode: '80331',
      customerCity: 'München',
      customerCountry: 'DE',
      customerVatId: 'DE123456789',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid full offer input', () => {
    const result = createDocumentSchema.safeParse({
      type: 'offer',
      number: 'AN-2024-001',
      issueDate: '2024-01-15',
      validUntil: '2024-02-15',
      discount: 5.5,
      discountType: 'fixed',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = createDocumentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createDocumentSchema.safeParse({ type: 'receipt' })
    expect(result.success).toBe(false)
  })

  it('rejects number exceeding 50 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', number: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string number', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', number: '' })
    expect(result.success).toBe(true)
  })

  it('rejects negative discount', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', discount: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts null discount', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', discount: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid discountType', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', discountType: 'absolute' })
    expect(result.success).toBe(false)
  })

  it('accepts null discountType', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', discountType: null })
    expect(result.success).toBe(true)
  })

  it('rejects paymentTerms exceeding 255 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', paymentTerms: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string paymentTerms', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', paymentTerms: '' })
    expect(result.success).toBe(true)
  })

  it('rejects customerName exceeding 255 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerName: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects customerCountry exceeding 2 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerCountry: 'DEU' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string customerCountry', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerCountry: '' })
    expect(result.success).toBe(true)
  })

  it('rejects customerPostalCode exceeding 20 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerPostalCode: 'A'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('rejects customerCity exceeding 100 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerCity: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects customerVatId exceeding 50 chars', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', customerVatId: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('accepts null companyId', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', companyId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid companyId (not uuid)', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', companyId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null contactPersonId', () => {
    const result = createDocumentSchema.safeParse({ type: 'invoice', contactPersonId: null })
    expect(result.success).toBe(true)
  })
})

describe('updateDocumentSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateDocumentSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with type only', () => {
    const result = updateDocumentSchema.safeParse({ type: 'offer' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with notes only', () => {
    const result = updateDocumentSchema.safeParse({ notes: 'Aktualisierte Notiz' })
    expect(result.success).toBe(true)
  })

  it('still validates type enum constraint', () => {
    const result = updateDocumentSchema.safeParse({ type: 'receipt' })
    expect(result.success).toBe(false)
  })

  it('still validates number length constraint', () => {
    const result = updateDocumentSchema.safeParse({ number: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })
})

describe('createDocumentItemSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Beratungsleistung' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Beratungsleistung')
      expect(result.data.quantity).toBe(1)
      expect(result.data.unit).toBe('Stück')
      expect(result.data.unitPrice).toBe(0)
      expect(result.data.vatRate).toBe(19)
    }
  })

  it('accepts valid full input', () => {
    const result = createDocumentItemSchema.safeParse({
      name: 'IT-Beratung',
      description: 'Professionelle IT-Beratung',
      quantity: 8,
      unit: 'Stunde',
      unitPrice: 150.0,
      vatRate: 19,
      discount: 10,
      discountType: 'percent',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createDocumentItemSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createDocumentItemSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('defaults quantity to 1', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.quantity).toBe(1)
  })

  it('defaults unit to Stück', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.unit).toBe('Stück')
  })

  it('defaults unitPrice to 0', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.unitPrice).toBe(0)
  })

  it('defaults vatRate to 19', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.vatRate).toBe(19)
  })

  it('rejects negative quantity', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', quantity: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts zero quantity', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', quantity: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects negative unitPrice', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', unitPrice: -0.01 })
    expect(result.success).toBe(false)
  })

  it('rejects negative vatRate', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', vatRate: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects vatRate exceeding 100', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', vatRate: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects negative discount', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', discount: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts null discount', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', discount: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid discountType', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', discountType: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts null discountType', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', discountType: null })
    expect(result.success).toBe(true)
  })

  it('rejects unit exceeding 30 chars', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', unit: 'A'.repeat(31) })
    expect(result.success).toBe(false)
  })

  it('accepts null productId', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', productId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid productId (not uuid)', () => {
    const result = createDocumentItemSchema.safeParse({ name: 'Test', productId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('updateDocumentItemSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateDocumentItemSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateDocumentItemSchema.safeParse({ name: 'Neuer Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with quantity only', () => {
    const result = updateDocumentItemSchema.safeParse({ quantity: 5 })
    expect(result.success).toBe(true)
  })

  it('still validates name length constraint', () => {
    const result = updateDocumentItemSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates vatRate range', () => {
    const result = updateDocumentItemSchema.safeParse({ vatRate: 150 })
    expect(result.success).toBe(false)
  })
})

describe('updateDocumentStatusSchema', () => {
  it('accepts valid status string', () => {
    const result = updateDocumentStatusSchema.safeParse({ status: 'paid' })
    expect(result.success).toBe(true)
  })

  it('rejects missing status', () => {
    const result = updateDocumentStatusSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty status string', () => {
    const result = updateDocumentStatusSchema.safeParse({ status: '' })
    expect(result.success).toBe(false)
  })
})

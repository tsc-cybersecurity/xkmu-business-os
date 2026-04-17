import { describe, it, expect } from 'vitest'
import { productTypeSchema,
  productStatusSchema,
  createProductSchema,
  updateProductSchema,
} from '@/lib/utils/validation'

describe('productTypeSchema', () => {
  it('accepts product', () => {
    expect(productTypeSchema.safeParse('product').success).toBe(true)
  })

  it('accepts service', () => {
    expect(productTypeSchema.safeParse('service').success).toBe(true)
  })

  it('rejects unknown type', () => {
    expect(productTypeSchema.safeParse('digital').success).toBe(false)
  })
})

describe('productStatusSchema', () => {
  it('accepts active', () => {
    expect(productStatusSchema.safeParse('active').success).toBe(true)
  })

  it('accepts inactive', () => {
    expect(productStatusSchema.safeParse('inactive').success).toBe(true)
  })

  it('accepts draft', () => {
    expect(productStatusSchema.safeParse('draft').success).toBe(true)
  })

  it('rejects unknown status', () => {
    expect(productStatusSchema.safeParse('archived').success).toBe(false)
  })
})

describe('createProductSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test Produkt' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('product')
      expect(result.data.name).toBe('Test Produkt')
      expect(result.data.vatRate).toBe(19)
      expect(result.data.unit).toBe('Stück')
      expect(result.data.status).toBe('active')
      expect(result.data.tags).toEqual([])
      expect(result.data.customFields).toEqual({})
      expect(result.data.isPublic).toBe(false)
      expect(result.data.isHighlight).toBe(false)
      expect(result.data.images).toEqual([])
      expect(result.data.minOrderQuantity).toBe(1)
    }
  })

  it('accepts valid full input', () => {
    const result = createProductSchema.safeParse({
      type: 'service',
      name: 'Beratungsleistung',
      description: 'Professionelle IT-Beratung',
      sku: 'SERV-001',
      priceNet: 150.0,
      vatRate: 19,
      unit: 'Stunde',
      status: 'active',
      tags: ['beratung', 'it'],
      notes: 'Mindestabnahme 4 Stunden',
      customFields: { department: 'IT' },
      isPublic: true,
      isHighlight: true,
      shortDescription: 'IT-Beratung vom Profi',
      slug: 'beratungsleistung',
      seoTitle: 'IT Beratung',
      seoDescription: 'Professionelle IT-Beratung für Ihr Unternehmen',
      images: [{ url: 'https://example.com/img.jpg', alt: 'Produkt', sortOrder: 0 }],
      weight: 0,
      manufacturer: 'xKMU GmbH',
      ean: '1234567890123',
      minOrderQuantity: 4,
      deliveryTime: '1-2 Werktage',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = createProductSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createProductSchema.safeParse({ type: 'product' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createProductSchema.safeParse({ type: 'digital', name: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', status: 'archived' })
    expect(result.success).toBe(false)
  })

  it('defaults status to active', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('active')
  })

  it('defaults vatRate to 19', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.vatRate).toBe(19)
  })

  it('defaults unit to Stück', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.unit).toBe('Stück')
  })

  it('defaults minOrderQuantity to 1', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.minOrderQuantity).toBe(1)
  })

  it('rejects minOrderQuantity less than 1', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', minOrderQuantity: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative vatRate', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', vatRate: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects vatRate exceeding 100', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', vatRate: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects negative priceNet', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', priceNet: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts null priceNet', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', priceNet: null })
    expect(result.success).toBe(true)
  })

  it('rejects negative weight', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', weight: -0.1 })
    expect(result.success).toBe(false)
  })

  it('accepts null weight', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', weight: null })
    expect(result.success).toBe(true)
  })

  it('rejects sku exceeding 50 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', sku: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string sku', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', sku: '' })
    expect(result.success).toBe(true)
  })

  it('rejects seoTitle exceeding 70 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', seoTitle: 'A'.repeat(71) })
    expect(result.success).toBe(false)
  })

  it('rejects seoDescription exceeding 160 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', seoDescription: 'A'.repeat(161) })
    expect(result.success).toBe(false)
  })

  it('rejects ean exceeding 13 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', ean: '12345678901234' })
    expect(result.success).toBe(false)
  })

  it('rejects unit exceeding 30 chars', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', unit: 'A'.repeat(31) })
    expect(result.success).toBe(false)
  })

  it('accepts valid image with url', () => {
    const result = createProductSchema.safeParse({
      type: 'product',
      name: 'Test',
      images: [{ url: 'https://example.com/img.jpg' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects image url exceeding 500 chars', () => {
    const result = createProductSchema.safeParse({
      type: 'product',
      name: 'Test',
      images: [{ url: 'https://example.com/' + 'a'.repeat(485) }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid dimensions object', () => {
    const result = createProductSchema.safeParse({
      type: 'product',
      name: 'Test',
      dimensions: { length: 10, width: 5, height: 3, unit: 'cm' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid dimensions unit', () => {
    const result = createProductSchema.safeParse({
      type: 'product',
      name: 'Test',
      dimensions: { unit: 'inch' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts null dimensions', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', dimensions: null })
    expect(result.success).toBe(true)
  })

  it('accepts custom fields', () => {
    const result = createProductSchema.safeParse({
      type: 'product',
      name: 'Test',
      customFields: { color: 'red', size: 'XL' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts null categoryId', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', categoryId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid categoryId (not uuid)', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test', categoryId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('defaults isPublic to false', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isPublic).toBe(false)
  })

  it('defaults isHighlight to false', () => {
    const result = createProductSchema.safeParse({ type: 'product', name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isHighlight).toBe(false)
  })
})

describe('updateProductSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateProductSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateProductSchema.safeParse({ name: 'Neuer Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with status only', () => {
    const result = updateProductSchema.safeParse({ status: 'inactive' })
    expect(result.success).toBe(true)
  })

  it('still validates name length constraint', () => {
    const result = updateProductSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates type enum constraint', () => {
    const result = updateProductSchema.safeParse({ type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates vatRate range', () => {
    const result = updateProductSchema.safeParse({ vatRate: 150 })
    expect(result.success).toBe(false)
  })
})

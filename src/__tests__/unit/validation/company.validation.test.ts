import { describe, it, expect } from 'vitest'
import { createCompanySchema, updateCompanySchema } from '@/lib/utils/validation'

describe('createCompanySchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCompanySchema.safeParse({ name: 'Test GmbH' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test GmbH')
      expect(result.data.country).toBe('DE')
      expect(result.data.status).toBe('prospect')
      expect(result.data.tags).toEqual([])
      expect(result.data.customFields).toEqual({})
    }
  })

  it('accepts valid full input', () => {
    const result = createCompanySchema.safeParse({
      name: 'Muster AG',
      legalForm: 'AG',
      street: 'Hauptstraße',
      houseNumber: '1a',
      postalCode: '80331',
      city: 'München',
      country: 'DE',
      phone: '+49 89 12345',
      email: 'info@muster.de',
      website: 'https://muster.de',
      industry: 'Consulting',
      employeeCount: 50,
      annualRevenue: 5000000,
      vatId: 'DE987654321',
      status: 'customer',
      tags: ['premium', 'enterprise'],
      notes: 'Important client',
      customFields: { sector: 'B2B' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createCompanySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string email', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid website URL', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', website: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects website URL exceeding 255 chars', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(240)
    const result = createCompanySchema.safeParse({ name: 'Test', website: longUrl })
    expect(result.success).toBe(false)
  })

  it('rejects negative employee count', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', employeeCount: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects country exceeding 2 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', country: 'DEU' })
    expect(result.success).toBe(false)
  })

  it('defaults country to DE', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.country).toBe('DE')
  })

  it('defaults status to prospect', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('prospect')
  })

  it('defaults tags to empty array', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('rejects invalid status', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts custom fields', () => {
    const result = createCompanySchema.safeParse({
      name: 'Test',
      customFields: { key: 'value', nested: { a: 1 } },
    })
    expect(result.success).toBe(true)
  })

  it('accepts null employeeCount', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', employeeCount: null })
    expect(result.success).toBe(true)
  })

  it('accepts null annualRevenue', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', annualRevenue: null })
    expect(result.success).toBe(true)
  })
})

describe('updateCompanySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCompanySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateCompanySchema.safeParse({ name: 'New Name', city: 'Hamburg' })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    const result = updateCompanySchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })
})

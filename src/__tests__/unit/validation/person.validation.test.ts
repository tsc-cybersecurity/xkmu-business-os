import { describe, it, expect } from 'vitest'
import { createPersonSchema, updatePersonSchema } from '@/lib/utils/validation'

describe('createPersonSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'Mustermann' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.firstName).toBe('Max')
      expect(result.data.lastName).toBe('Mustermann')
      expect(result.data.country).toBe('DE')
      expect(result.data.status).toBe('active')
      expect(result.data.isPrimaryContact).toBe(false)
      expect(result.data.tags).toEqual([])
      expect(result.data.customFields).toEqual({})
    }
  })

  it('accepts valid full input', () => {
    const result = createPersonSchema.safeParse({
      companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      salutation: 'Herr',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@example.de',
      phone: '+49 89 12345',
      mobile: '+49 151 12345678',
      jobTitle: 'Geschäftsführer',
      department: 'Vertrieb',
      street: 'Hauptstraße',
      houseNumber: '1a',
      postalCode: '80331',
      city: 'München',
      country: 'DE',
      status: 'active',
      isPrimaryContact: true,
      tags: ['vip', 'key-account'],
      notes: 'Wichtiger Kontakt',
      customFields: { linkedin: 'https://linkedin.com/in/max' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing firstName', () => {
    const result = createPersonSchema.safeParse({ lastName: 'Mustermann' })
    expect(result.success).toBe(false)
  })

  it('rejects missing lastName', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max' })
    expect(result.success).toBe(false)
  })

  it('rejects empty firstName', () => {
    const result = createPersonSchema.safeParse({ firstName: '', lastName: 'Mustermann' })
    expect(result.success).toBe(false)
  })

  it('rejects empty lastName', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects firstName exceeding 100 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'A'.repeat(101), lastName: 'Mustermann' })
    expect(result.success).toBe(false)
  })

  it('rejects lastName exceeding 100 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string email', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects country exceeding 2 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', country: 'DEU' })
    expect(result.success).toBe(false)
  })

  it('defaults country to DE', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.country).toBe('DE')
  })

  it('defaults status to active', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('active')
  })

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive', 'do_not_contact']) {
      const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('defaults isPrimaryContact to false', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isPrimaryContact).toBe(false)
  })

  it('accepts isPrimaryContact true', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', isPrimaryContact: true })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isPrimaryContact).toBe(true)
  })

  it('defaults tags to empty array', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('accepts null companyId', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', companyId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid companyId UUID', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', companyId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts salutation up to 20 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', salutation: 'Prof. Dr.' })
    expect(result.success).toBe(true)
  })

  it('rejects salutation exceeding 20 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', salutation: 'A'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string salutation', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', salutation: '' })
    expect(result.success).toBe(true)
  })

  it('rejects phone exceeding 50 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', phone: '+49'.repeat(20) })
    expect(result.success).toBe(false)
  })

  it('rejects mobile exceeding 50 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', mobile: '0'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('rejects jobTitle exceeding 100 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', jobTitle: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects department exceeding 100 chars', () => {
    const result = createPersonSchema.safeParse({ firstName: 'Max', lastName: 'M', department: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts custom fields', () => {
    const result = createPersonSchema.safeParse({
      firstName: 'Max',
      lastName: 'M',
      customFields: { key: 'value', nested: { a: 1 } },
    })
    expect(result.success).toBe(true)
  })
})

describe('updatePersonSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updatePersonSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with firstName only', () => {
    const result = updatePersonSchema.safeParse({ firstName: 'Anna' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with status only', () => {
    const result = updatePersonSchema.safeParse({ status: 'inactive' })
    expect(result.success).toBe(true)
  })

  it('still validates firstName max length', () => {
    const result = updatePersonSchema.safeParse({ firstName: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates email format', () => {
    const result = updatePersonSchema.safeParse({ email: 'invalid-email' })
    expect(result.success).toBe(false)
  })

  it('still validates invalid status', () => {
    const result = updatePersonSchema.safeParse({ status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('still validates country max length', () => {
    const result = updatePersonSchema.safeParse({ country: 'DEU' })
    expect(result.success).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { createTenantSchema, updateTenantSchema } from '@/lib/utils/validation'

describe('createTenantSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createTenantSchema.safeParse({
      name: 'Muster GmbH',
      slug: 'muster-gmbh',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Muster GmbH')
      expect(result.data.slug).toBe('muster-gmbh')
    }
  })

  it('accepts slug with only lowercase letters', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'testcompany',
    })
    expect(result.success).toBe(true)
  })

  it('accepts slug with numbers', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'company123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts slug with dashes', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'my-company-name',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createTenantSchema.safeParse({ slug: 'muster-gmbh' })
    expect(result.success).toBe(false)
  })

  it('rejects missing slug', () => {
    const result = createTenantSchema.safeParse({ name: 'Muster GmbH' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createTenantSchema.safeParse({ name: '', slug: 'muster-gmbh' })
    expect(result.success).toBe(false)
  })

  it('rejects empty slug', () => {
    const result = createTenantSchema.safeParse({ name: 'Muster GmbH', slug: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createTenantSchema.safeParse({
      name: 'A'.repeat(256),
      slug: 'muster-gmbh',
    })
    expect(result.success).toBe(false)
  })

  it('accepts name of exactly 255 chars', () => {
    const result = createTenantSchema.safeParse({
      name: 'A'.repeat(255),
      slug: 'muster-gmbh',
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug exceeding 100 chars', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts slug of exactly 100 chars', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'a'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug with uppercase letters', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'MyCompany',
    })
    expect(result.success).toBe(false)
  })

  it('rejects slug with underscores', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'my_company',
    })
    expect(result.success).toBe(false)
  })

  it('rejects slug with spaces', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'my company',
    })
    expect(result.success).toBe(false)
  })

  it('rejects slug with special characters', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'my@company',
    })
    expect(result.success).toBe(false)
  })

  it('rejects slug with dots', () => {
    const result = createTenantSchema.safeParse({
      name: 'Test',
      slug: 'my.company',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateTenantSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateTenantSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateTenantSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with slug only', () => {
    const result = updateTenantSchema.safeParse({ slug: 'new-slug' })
    expect(result.success).toBe(true)
  })

  it('still validates name length', () => {
    const result = updateTenantSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates slug pattern', () => {
    const result = updateTenantSchema.safeParse({ slug: 'Invalid_Slug' })
    expect(result.success).toBe(false)
  })

  it('still validates slug length', () => {
    const result = updateTenantSchema.safeParse({ slug: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { createProductCategorySchema, updateProductCategorySchema } from '@/lib/utils/validation'

describe('createProductCategorySchema', () => {
  it('accepts valid minimal input', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Electronics')
      expect(result.data.sortOrder).toBe(0)
    }
  })

  it('accepts valid full input', () => {
    const result = createProductCategorySchema.safeParse({
      name: 'Laptops',
      description: 'All laptop computers',
      parentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 5,
    })
    expect(result.success).toBe(true)
  })

  it('defaults sortOrder to 0', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sortOrder).toBe(0)
  })

  it('rejects missing name', () => {
    const result = createProductCategorySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createProductCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = createProductCategorySchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts name of exactly 100 chars', () => {
    const result = createProductCategorySchema.safeParse({ name: 'A'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('accepts description as optional', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.description).toBeUndefined()
  })

  it('accepts empty string description', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', description: '' })
    expect(result.success).toBe(true)
  })

  it('accepts parentId as null', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', parentId: null })
    expect(result.success).toBe(true)
  })

  it('accepts parentId omitted', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.parentId).toBeUndefined()
  })

  it('rejects parentId that is not a valid UUID', () => {
    const result = createProductCategorySchema.safeParse({
      name: 'Electronics',
      parentId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUID parentId', () => {
    const result = createProductCategorySchema.safeParse({
      name: 'Electronics',
      parentId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative sortOrder', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', sortOrder: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts sortOrder of 0', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', sortOrder: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts positive sortOrder', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', sortOrder: 99 })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer sortOrder', () => {
    const result = createProductCategorySchema.safeParse({ name: 'Electronics', sortOrder: 1.5 })
    expect(result.success).toBe(false)
  })
})

describe('updateProductCategorySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateProductCategorySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateProductCategorySchema.safeParse({ name: 'New Category Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with description only', () => {
    const result = updateProductCategorySchema.safeParse({ description: 'Updated description' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with sortOrder only', () => {
    const result = updateProductCategorySchema.safeParse({ sortOrder: 10 })
    expect(result.success).toBe(true)
  })

  it('still validates name length', () => {
    const result = updateProductCategorySchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates empty name is rejected', () => {
    const result = updateProductCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('still validates parentId as UUID', () => {
    const result = updateProductCategorySchema.safeParse({ parentId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('still validates sortOrder is non-negative', () => {
    const result = updateProductCategorySchema.safeParse({ sortOrder: -5 })
    expect(result.success).toBe(false)
  })

  it('accepts null parentId in update', () => {
    const result = updateProductCategorySchema.safeParse({ parentId: null })
    expect(result.success).toBe(true)
  })
})

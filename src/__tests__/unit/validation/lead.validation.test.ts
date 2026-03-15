import { describe, it, expect } from 'vitest'
import { createLeadSchema, updateLeadSchema } from '@/lib/utils/validation'

describe('createLeadSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createLeadSchema.safeParse({ source: 'manual' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('manual')
      expect(result.data.status).toBe('new')
      expect(result.data.score).toBe(0)
      expect(result.data.tags).toEqual([])
    }
  })

  it('accepts valid full input', () => {
    const result = createLeadSchema.safeParse({
      companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      personId: 'd3b07384-d113-4ec9-8b6d-6bb9bd380a22',
      title: 'Enterprise Software Deal',
      source: 'website',
      sourceDetail: 'Contact form on /products page',
      status: 'qualifying',
      score: 75,
      assignedTo: 'e4c08495-e224-4f0a-9c7e-7cc0ce491b33',
      tags: ['hot', 'enterprise'],
      notes: 'Very promising lead',
      rawData: { utmSource: 'google', utmCampaign: 'spring2026' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing source', () => {
    const result = createLeadSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid source', () => {
    const result = createLeadSchema.safeParse({ source: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid source values', () => {
    for (const source of ['api', 'form', 'import', 'manual', 'idea', 'website']) {
      const result = createLeadSchema.safeParse({ source })
      expect(result.success).toBe(true)
    }
  })

  it('defaults status to new', () => {
    const result = createLeadSchema.safeParse({ source: 'manual' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('new')
  })

  it('accepts all valid status values', () => {
    for (const status of ['new', 'qualifying', 'qualified', 'contacted', 'meeting_scheduled', 'proposal_sent', 'won', 'lost']) {
      const result = createLeadSchema.safeParse({ source: 'manual', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('defaults score to 0', () => {
    const result = createLeadSchema.safeParse({ source: 'manual' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.score).toBe(0)
  })

  it('accepts score at boundaries (0 and 100)', () => {
    expect(createLeadSchema.safeParse({ source: 'manual', score: 0 }).success).toBe(true)
    expect(createLeadSchema.safeParse({ source: 'manual', score: 100 }).success).toBe(true)
  })

  it('rejects score below 0', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', score: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects score above 100', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', score: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer score', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', score: 50.5 })
    expect(result.success).toBe(false)
  })

  it('defaults tags to empty array', () => {
    const result = createLeadSchema.safeParse({ source: 'manual' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('accepts null companyId', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', companyId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid companyId UUID', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', companyId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null personId', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', personId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid personId UUID', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', personId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null assignedTo', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', assignedTo: null })
    expect(result.success).toBe(true)
  })

  it('rejects title exceeding 255 chars', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string title', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', title: '' })
    expect(result.success).toBe(true)
  })

  it('rejects sourceDetail exceeding 255 chars', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', sourceDetail: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string sourceDetail', () => {
    const result = createLeadSchema.safeParse({ source: 'manual', sourceDetail: '' })
    expect(result.success).toBe(true)
  })

  it('accepts rawData as arbitrary record', () => {
    const result = createLeadSchema.safeParse({
      source: 'api',
      rawData: { key: 'value', nested: { a: 1 }, arr: [1, 2, 3] },
    })
    expect(result.success).toBe(true)
  })
})

describe('updateLeadSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateLeadSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with status only', () => {
    const result = updateLeadSchema.safeParse({ status: 'won' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with score only', () => {
    const result = updateLeadSchema.safeParse({ score: 80 })
    expect(result.success).toBe(true)
  })

  it('still validates score boundaries', () => {
    const result = updateLeadSchema.safeParse({ score: 101 })
    expect(result.success).toBe(false)
  })

  it('still validates invalid status', () => {
    const result = updateLeadSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates invalid source', () => {
    const result = updateLeadSchema.safeParse({ source: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('still validates title max length', () => {
    const result = updateLeadSchema.safeParse({ title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })
})

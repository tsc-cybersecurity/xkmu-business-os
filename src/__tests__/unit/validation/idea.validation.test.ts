import { describe, it, expect } from 'vitest'
import { createIdeaSchema, updateIdeaSchema } from '@/lib/utils/validation'

describe('createIdeaSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'A great business idea' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rawContent).toBe('A great business idea')
      expect(result.data.type).toBe('text')
      expect(result.data.status).toBe('backlog')
      expect(result.data.tags).toEqual([])
    }
  })

  it('accepts valid full input', () => {
    const result = createIdeaSchema.safeParse({
      rawContent: 'Launch a new SaaS product for SMEs',
      type: 'voice',
      status: 'in_progress',
      tags: ['saas', 'b2b', 'priority'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing rawContent', () => {
    const result = createIdeaSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty string rawContent', () => {
    const result = createIdeaSchema.safeParse({ rawContent: '' })
    expect(result.success).toBe(false)
  })

  it('defaults type to text', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.type).toBe('text')
  })

  it('accepts all valid type values', () => {
    for (const type of ['text', 'voice']) {
      const result = createIdeaSchema.safeParse({ rawContent: 'Some idea', type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea', type: 'video' })
    expect(result.success).toBe(false)
  })

  it('defaults status to backlog', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('backlog')
  })

  it('accepts all valid status values', () => {
    for (const status of ['backlog', 'in_progress', 'converted']) {
      const result = createIdeaSchema.safeParse({ rawContent: 'Some idea', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea', status: 'archived' })
    expect(result.success).toBe(false)
  })

  it('defaults tags to empty array', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('accepts tags array', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'Some idea', tags: ['innovation', 'mvp'] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual(['innovation', 'mvp'])
  })

  it('accepts long rawContent', () => {
    const result = createIdeaSchema.safeParse({ rawContent: 'A'.repeat(10000) })
    expect(result.success).toBe(true)
  })
})

describe('updateIdeaSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateIdeaSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with rawContent only', () => {
    const result = updateIdeaSchema.safeParse({ rawContent: 'Updated idea content' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with status only', () => {
    const result = updateIdeaSchema.safeParse({ status: 'converted' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with structuredContent', () => {
    const result = updateIdeaSchema.safeParse({
      structuredContent: { title: 'My Idea', summary: 'Short summary', actions: ['action1'] },
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with tags', () => {
    const result = updateIdeaSchema.safeParse({ tags: ['new-tag'] })
    expect(result.success).toBe(true)
  })

  it('still validates empty string rawContent', () => {
    const result = updateIdeaSchema.safeParse({ rawContent: '' })
    expect(result.success).toBe(false)
  })

  it('still validates invalid type', () => {
    const result = updateIdeaSchema.safeParse({ type: 'video' })
    expect(result.success).toBe(false)
  })

  it('still validates invalid status', () => {
    const result = updateIdeaSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(false)
  })
})

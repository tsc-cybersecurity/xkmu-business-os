import { describe, it, expect } from 'vitest'
import {
  createLessonBlockSchema,
  updateLessonBlockSchema,
  reorderLessonBlocksSchema,
} from '@/lib/utils/validation'

describe('createLessonBlockSchema', () => {
  it('accepts valid markdown block', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown', markdownBody: '# Hi' })
    expect(r.success).toBe(true)
  })

  it('accepts valid cms_block', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'cms_block', blockType: 'course-callout' })
    expect(r.success).toBe(true)
  })

  it('rejects markdown without markdownBody', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown' })
    expect(r.success).toBe(false)
  })

  it('rejects cms_block without blockType', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'cms_block' })
    expect(r.success).toBe(false)
  })

  it('rejects unknown kind', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'banana', markdownBody: 'x' })
    expect(r.success).toBe(false)
  })

  it('accepts optional position', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown', markdownBody: 'x', position: 5 })
    expect(r.success).toBe(true)
  })
})

describe('updateLessonBlockSchema', () => {
  it('accepts partial update', () => {
    const r = updateLessonBlockSchema.safeParse({ markdownBody: 'new' })
    expect(r.success).toBe(true)
  })

  it('accepts isVisible toggle', () => {
    const r = updateLessonBlockSchema.safeParse({ isVisible: false })
    expect(r.success).toBe(true)
  })

  it('accepts content + settings', () => {
    const r = updateLessonBlockSchema.safeParse({
      content: { variant: 'tip', body: 'x' },
      settings: { backgroundColor: '#fff' },
    })
    expect(r.success).toBe(true)
  })
})

describe('reorderLessonBlocksSchema', () => {
  it('accepts valid array', () => {
    const r = reorderLessonBlocksSchema.safeParse([
      { id: '11111111-1111-4111-8111-111111111111', position: 1 },
      { id: '22222222-2222-4222-8222-222222222222', position: 2 },
    ])
    expect(r.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const r = reorderLessonBlocksSchema.safeParse([{ id: 'not-a-uuid', position: 1 }])
    expect(r.success).toBe(false)
  })

  it('rejects negative position', () => {
    const r = reorderLessonBlocksSchema.safeParse([
      { id: '11111111-1111-4111-8111-111111111111', position: -1 },
    ])
    expect(r.success).toBe(false)
  })
})

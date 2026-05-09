import { describe, it, expect } from 'vitest'
import { IterationOutputSchema } from '@/lib/services/agents/smart-worker/iteration-types'

describe('IterationOutputSchema', () => {
  it('akzeptiert toolCall-Variante', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'memory:search', input: { query: 'foo' } }, reasoning: 'such was' })
    expect(r.success).toBe(true)
  })

  it('akzeptiert final-Variante', () => {
    const r = IterationOutputSchema.safeParse({ final: 'done', reasoning: 'fertig' })
    expect(r.success).toBe(true)
  })

  it('lehnt Mischform ab (toolCall + final)', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'memory:search', input: {} }, final: 'done' })
    expect(r.success).toBe(false)
  })

  it('lehnt leeres Objekt ab', () => {
    const r = IterationOutputSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('lehnt toolCall ohne ref ab', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { input: {} } })
    expect(r.success).toBe(false)
  })

  it('lehnt invaliden Namespace im ref ab', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'invalid_format', input: {} } })
    expect(r.success).toBe(false)
  })
})

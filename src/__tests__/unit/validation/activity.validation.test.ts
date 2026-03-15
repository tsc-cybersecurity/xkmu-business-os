import { describe, it, expect } from 'vitest'
import { createActivitySchema, updateActivitySchema } from '@/lib/utils/validation'

describe('createActivitySchema', () => {
  it('accepts valid minimal input', () => {
    const result = createActivitySchema.safeParse({ type: 'note' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('note')
      expect(result.data.metadata).toEqual({})
    }
  })

  it('accepts valid full input', () => {
    const result = createActivitySchema.safeParse({
      leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      companyId: 'd3b07384-d113-4ec9-8b6d-6bb9bd380a22',
      personId: 'e4c08495-e224-4f0a-9c7e-7cc0ce491b33',
      type: 'email',
      subject: 'Follow-up nach Demo',
      content: 'Sehr geehrter Herr Mustermann, vielen Dank für Ihre Zeit...',
      metadata: { emailId: 'abc123', opened: true },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = createActivitySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createActivitySchema.safeParse({ type: 'sms' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['email', 'call', 'note', 'meeting', 'ai_outreach']) {
      const result = createActivitySchema.safeParse({ type })
      expect(result.success).toBe(true)
    }
  })

  it('defaults metadata to empty object', () => {
    const result = createActivitySchema.safeParse({ type: 'call' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.metadata).toEqual({})
  })

  it('accepts null leadId', () => {
    const result = createActivitySchema.safeParse({ type: 'note', leadId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid leadId UUID', () => {
    const result = createActivitySchema.safeParse({ type: 'note', leadId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null companyId', () => {
    const result = createActivitySchema.safeParse({ type: 'note', companyId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid companyId UUID', () => {
    const result = createActivitySchema.safeParse({ type: 'note', companyId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null personId', () => {
    const result = createActivitySchema.safeParse({ type: 'note', personId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid personId UUID', () => {
    const result = createActivitySchema.safeParse({ type: 'note', personId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects subject exceeding 255 chars', () => {
    const result = createActivitySchema.safeParse({ type: 'email', subject: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string subject', () => {
    const result = createActivitySchema.safeParse({ type: 'email', subject: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string content', () => {
    const result = createActivitySchema.safeParse({ type: 'note', content: '' })
    expect(result.success).toBe(true)
  })

  it('accepts long content string', () => {
    const result = createActivitySchema.safeParse({ type: 'note', content: 'A'.repeat(10000) })
    expect(result.success).toBe(true)
  })

  it('accepts metadata as arbitrary record', () => {
    const result = createActivitySchema.safeParse({
      type: 'meeting',
      metadata: { location: 'Zoom', duration: 60, attendees: ['alice', 'bob'] },
    })
    expect(result.success).toBe(true)
  })

  it('accepts meeting type with subject and content', () => {
    const result = createActivitySchema.safeParse({
      type: 'meeting',
      subject: 'Produktpräsentation',
      content: 'Agenda: Produkt vorstellen, Preise besprechen',
    })
    expect(result.success).toBe(true)
  })

  it('accepts ai_outreach type', () => {
    const result = createActivitySchema.safeParse({
      type: 'ai_outreach',
      subject: 'KI generierter Erstkontakt',
      content: 'Sehr geehrte Damen und Herren...',
      metadata: { aiModel: 'gemini-2.5-flash', prompt: 'cold-outreach' },
    })
    expect(result.success).toBe(true)
  })
})

describe('updateActivitySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateActivitySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with type only', () => {
    const result = updateActivitySchema.safeParse({ type: 'call' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with subject only', () => {
    const result = updateActivitySchema.safeParse({ subject: 'Updated Subject' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with content only', () => {
    const result = updateActivitySchema.safeParse({ content: 'Updated content text' })
    expect(result.success).toBe(true)
  })

  it('still validates invalid type', () => {
    const result = updateActivitySchema.safeParse({ type: 'sms' })
    expect(result.success).toBe(false)
  })

  it('still validates subject max length', () => {
    const result = updateActivitySchema.safeParse({ subject: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates invalid leadId UUID', () => {
    const result = updateActivitySchema.safeParse({ leadId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  webhookEventSchema,
  createWebhookSchema,
  updateWebhookSchema,
} from '@/lib/utils/validation'

describe('webhookEventSchema', () => {
  const validEvents = [
    'lead.created',
    'lead.status_changed',
    'lead.won',
    'lead.lost',
    'research.completed',
    'idea.converted',
    'company.created',
  ]

  for (const event of validEvents) {
    it(`accepts ${event}`, () => {
      expect(webhookEventSchema.safeParse(event).success).toBe(true)
    })
  }

  it('rejects unknown event', () => {
    expect(webhookEventSchema.safeParse('contact.created').success).toBe(false)
  })

  it('rejects empty string event', () => {
    expect(webhookEventSchema.safeParse('').success).toBe(false)
  })
})

describe('createWebhookSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Mein Webhook',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Mein Webhook')
      expect(result.data.url).toBe('https://example.com/webhook')
      expect(result.data.events).toEqual(['lead.created'])
      expect(result.data.isActive).toBe(true)
    }
  })

  it('accepts valid full input', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Vollständiger Webhook',
      url: 'https://hooks.example.com/incoming',
      events: ['lead.created', 'lead.won', 'company.created'],
      secret: 'my-secret-token',
      isActive: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.events).toHaveLength(3)
      expect(result.data.isActive).toBe(false)
    }
  })

  it('rejects missing name', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createWebhookSchema.safeParse({
      name: '',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = createWebhookSchema.safeParse({
      name: 'A'.repeat(101),
      url: 'https://example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing url', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      events: ['lead.created'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid url (spaces make it invalid even after transform)', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'just some text with spaces',
      events: ['lead.created'],
    })
    expect(result.success).toBe(false)
  })

  it('auto-prepends https:// to bare domain', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.url).toBe('https://example.com/webhook')
    }
  })

  it('does not modify already https:// url', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/hook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.url).toBe('https://example.com/hook')
    }
  })

  it('accepts http:// url', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'http://localhost:3000/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.url).toBe('http://localhost:3000/webhook')
    }
  })

  it('rejects missing events', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty events array', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects events array with invalid event', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: ['lead.created', 'contact.deleted'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid events at once', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: [
        'lead.created',
        'lead.status_changed',
        'lead.won',
        'lead.lost',
        'research.completed',
        'idea.converted',
        'company.created',
      ],
    })
    expect(result.success).toBe(true)
  })

  it('defaults isActive to true', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isActive).toBe(true)
  })

  it('accepts empty string secret and transforms to undefined', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
      secret: '',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.secret).toBeUndefined()
  })

  it('accepts non-empty secret and keeps it', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
      secret: 'my-secret-key',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.secret).toBe('my-secret-key')
  })

  it('rejects secret exceeding 255 chars', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Test',
      url: 'https://example.com/webhook',
      events: ['lead.created'],
      secret: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateWebhookSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateWebhookSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateWebhookSchema.safeParse({ name: 'Neuer Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with isActive only', () => {
    const result = updateWebhookSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with events only', () => {
    const result = updateWebhookSchema.safeParse({ events: ['lead.won', 'lead.lost'] })
    expect(result.success).toBe(true)
  })

  it('still validates name length constraint', () => {
    const result = updateWebhookSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates events enum constraint', () => {
    const result = updateWebhookSchema.safeParse({ events: ['invalid.event'] })
    expect(result.success).toBe(false)
  })

  it('still validates url format when provided', () => {
    const result = updateWebhookSchema.safeParse({ url: 'just some text with spaces' })
    expect(result.success).toBe(false)
  })
})

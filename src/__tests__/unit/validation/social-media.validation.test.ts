import { describe, it, expect } from 'vitest'
import { createSocialMediaPostSchema,
  updateSocialMediaPostSchema,
  createSocialMediaTopicSchema,
  updateSocialMediaTopicSchema,
} from '@/lib/utils/validation'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================
// Social Media Topic Schemas
// ============================================

describe('createSocialMediaTopicSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'Tech News' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Tech News')
      expect(result.data.color).toBe('#3b82f6')
    }
  })

  it('accepts valid full input', () => {
    const result = createSocialMediaTopicSchema.safeParse({
      name: 'Product Updates',
      description: 'Posts about product updates and releases',
      color: '#ef4444',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createSocialMediaTopicSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string description', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'Test', description: '' })
    expect(result.success).toBe(true)
  })

  it('rejects color exceeding 7 chars', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'Test', color: '#ffffffff' })
    expect(result.success).toBe(false)
  })

  it('defaults color to #3b82f6', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.color).toBe('#3b82f6')
  })

  it('accepts custom color', () => {
    const result = createSocialMediaTopicSchema.safeParse({ name: 'Test', color: '#ff0000' })
    expect(result.success).toBe(true)
  })
})

describe('updateSocialMediaTopicSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateSocialMediaTopicSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateSocialMediaTopicSchema.safeParse({ name: 'Updated Topic', color: '#00ff00' })
    expect(result.success).toBe(true)
  })

  it('still validates name max length', () => {
    const result = updateSocialMediaTopicSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates color max length', () => {
    const result = updateSocialMediaTopicSchema.safeParse({ color: '#ffffffff' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Social Media Post Schemas
// ============================================

describe('createSocialMediaPostSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Exciting news from our team!',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platform).toBe('linkedin')
      expect(result.data.content).toBe('Exciting news from our team!')
      expect(result.data.status).toBe('draft')
      expect(result.data.hashtags).toEqual([])
    }
  })

  it('accepts valid full input', () => {
    const result = createSocialMediaPostSchema.safeParse({
      topicId: VALID_UUID,
      platform: 'instagram',
      title: 'Product Launch',
      content: 'We are excited to announce our new product!',
      hashtags: ['#launch', '#product', '#innovation'],
      imageUrl: 'https://example.com/image.jpg',
      scheduledAt: '2026-04-01T10:00:00Z',
      status: 'scheduled',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing platform', () => {
    const result = createSocialMediaPostSchema.safeParse({ content: 'Hello world' })
    expect(result.success).toBe(false)
  })

  it('rejects missing content', () => {
    const result = createSocialMediaPostSchema.safeParse({ platform: 'linkedin' })
    expect(result.success).toBe(false)
  })

  it('rejects empty content', () => {
    const result = createSocialMediaPostSchema.safeParse({ platform: 'linkedin', content: '' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid platform values', () => {
    for (const platform of ['linkedin', 'x', 'instagram', 'facebook', 'xing']) {
      const result = createSocialMediaPostSchema.safeParse({ platform, content: 'Hello!' })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid platform', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'tiktok',
      content: 'Hello!',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null topicId', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      topicId: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid UUID for topicId', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      topicId: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for topicId', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      topicId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 255 chars', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      title: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string title', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      title: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects imageUrl exceeding 500 chars', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      imageUrl: 'https://example.com/' + 'a'.repeat(490),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string imageUrl', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      imageUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string scheduledAt', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      scheduledAt: '',
    })
    expect(result.success).toBe(true)
  })

  it('defaults status to draft', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('accepts all valid status values', () => {
    for (const status of ['draft', 'scheduled', 'posted', 'failed']) {
      const result = createSocialMediaPostSchema.safeParse({
        platform: 'linkedin',
        content: 'Hello!',
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  it('defaults hashtags to empty array', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.hashtags).toEqual([])
  })

  it('accepts hashtags array', () => {
    const result = createSocialMediaPostSchema.safeParse({
      platform: 'linkedin',
      content: 'Hello!',
      hashtags: ['#tech', '#ai', '#innovation'],
    })
    expect(result.success).toBe(true)
  })
})

describe('updateSocialMediaPostSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateSocialMediaPostSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateSocialMediaPostSchema.safeParse({
      content: 'Updated content',
      status: 'posted',
    })
    expect(result.success).toBe(true)
  })

  it('still validates platform enum', () => {
    const result = updateSocialMediaPostSchema.safeParse({ platform: 'tiktok' })
    expect(result.success).toBe(false)
  })

  it('still validates status enum', () => {
    const result = updateSocialMediaPostSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates title max length', () => {
    const result = updateSocialMediaPostSchema.safeParse({ title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })
})

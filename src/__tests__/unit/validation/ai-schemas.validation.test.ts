import { describe, it, expect } from 'vitest'
import {
  generateMarketingContentSchema,
  improveSocialPostSchema,
  generateSocialPostSchema,
  generateContentPlanSchema,
  generateTopicsSchema,
} from '@/lib/utils/validation'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================
// generateMarketingContentSchema
// ============================================

describe('generateMarketingContentSchema', () => {
  it('accepts valid minimal input', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('email')
      expect(result.data.tone).toBe('professional')
      expect(result.data.language).toBe('de')
    }
  })

  it('accepts valid full input', () => {
    const result = generateMarketingContentSchema.safeParse({
      type: 'sms',
      recipientIds: [VALID_UUID],
      tone: 'casual',
      language: 'en',
      context: 'Focus on our spring promotion',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = generateMarketingContentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['email', 'call', 'sms']) {
      const result = generateMarketingContentSchema.safeParse({ type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'push' })
    expect(result.success).toBe(false)
  })

  it('defaults tone to professional', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tone).toBe('professional')
  })

  it('accepts all valid tone values', () => {
    for (const tone of ['professional', 'casual', 'persuasive']) {
      const result = generateMarketingContentSchema.safeParse({ type: 'email', tone })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid tone', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email', tone: 'aggressive' })
    expect(result.success).toBe(false)
  })

  it('defaults language to de', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('de')
  })

  it('accepts language en', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email', language: 'en' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('en')
  })

  it('rejects invalid language', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email', language: 'fr' })
    expect(result.success).toBe(false)
  })

  it('accepts recipientIds array of valid UUIDs', () => {
    const result = generateMarketingContentSchema.safeParse({
      type: 'email',
      recipientIds: [VALID_UUID, VALID_UUID],
    })
    expect(result.success).toBe(true)
  })

  it('rejects recipientIds with invalid UUID', () => {
    const result = generateMarketingContentSchema.safeParse({
      type: 'email',
      recipientIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty context string', () => {
    const result = generateMarketingContentSchema.safeParse({ type: 'email', context: '' })
    expect(result.success).toBe(true)
  })

  it('accepts context string', () => {
    const result = generateMarketingContentSchema.safeParse({
      type: 'email',
      context: 'Target audience: SME owners in Germany',
    })
    expect(result.success).toBe(true)
  })
})

// ============================================
// improveSocialPostSchema
// ============================================

describe('improveSocialPostSchema', () => {
  it('accepts valid instructions', () => {
    const result = improveSocialPostSchema.safeParse({
      instructions: 'Make it more engaging and add a call to action',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.instructions).toBe('Make it more engaging and add a call to action')
    }
  })

  it('rejects missing instructions', () => {
    const result = improveSocialPostSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty instructions', () => {
    const result = improveSocialPostSchema.safeParse({ instructions: '' })
    expect(result.success).toBe(false)
  })

  it('rejects instructions exceeding 500 chars', () => {
    const result = improveSocialPostSchema.safeParse({ instructions: 'A'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts instructions of exactly 500 chars', () => {
    const result = improveSocialPostSchema.safeParse({ instructions: 'A'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('accepts instructions of exactly 1 char', () => {
    const result = improveSocialPostSchema.safeParse({ instructions: 'X' })
    expect(result.success).toBe(true)
  })
})

// ============================================
// generateSocialPostSchema
// ============================================

describe('generateSocialPostSchema', () => {
  const validBase = {
    platform: 'linkedin' as const,
    topic: 'Die Zukunft der KI im Mittelstand',
  }

  it('accepts valid minimal input', () => {
    const result = generateSocialPostSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platform).toBe('linkedin')
      expect(result.data.topic).toBe('Die Zukunft der KI im Mittelstand')
      expect(result.data.tone).toBe('professional')
      expect(result.data.language).toBe('de')
      expect(result.data.includeHashtags).toBe(true)
      expect(result.data.includeEmoji).toBe(true)
    }
  })

  it('accepts valid full input', () => {
    const result = generateSocialPostSchema.safeParse({
      platform: 'instagram',
      topicId: VALID_UUID,
      topic: 'New product launch tips',
      tone: 'casual',
      language: 'en',
      includeHashtags: false,
      includeEmoji: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing platform', () => {
    const result = generateSocialPostSchema.safeParse({ topic: 'Some topic' })
    expect(result.success).toBe(false)
  })

  it('rejects missing topic', () => {
    const result = generateSocialPostSchema.safeParse({ platform: 'linkedin' })
    expect(result.success).toBe(false)
  })

  it('rejects empty topic', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topic: '' })
    expect(result.success).toBe(false)
  })

  it('rejects topic exceeding 500 chars', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topic: 'A'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts topic of exactly 500 chars', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topic: 'A'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('accepts all valid platform values', () => {
    for (const platform of ['linkedin', 'twitter', 'instagram', 'facebook', 'xing']) {
      const result = generateSocialPostSchema.safeParse({ ...validBase, platform })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid platform', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, platform: 'tiktok' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid tone values', () => {
    for (const tone of ['professional', 'casual', 'humorous', 'inspirational']) {
      const result = generateSocialPostSchema.safeParse({ ...validBase, tone })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid tone', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, tone: 'aggressive' })
    expect(result.success).toBe(false)
  })

  it('defaults tone to professional', () => {
    const result = generateSocialPostSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tone).toBe('professional')
  })

  it('accepts language en', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, language: 'en' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('en')
  })

  it('rejects invalid language', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, language: 'fr' })
    expect(result.success).toBe(false)
  })

  it('accepts null topicId', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topicId: null })
    expect(result.success).toBe(true)
  })

  it('accepts valid UUID topicId', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topicId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID topicId', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, topicId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('defaults includeHashtags to true', () => {
    const result = generateSocialPostSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.includeHashtags).toBe(true)
  })

  it('defaults includeEmoji to true', () => {
    const result = generateSocialPostSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.includeEmoji).toBe(true)
  })

  it('accepts includeHashtags false', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, includeHashtags: false })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.includeHashtags).toBe(false)
  })

  it('accepts includeEmoji false', () => {
    const result = generateSocialPostSchema.safeParse({ ...validBase, includeEmoji: false })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.includeEmoji).toBe(false)
  })
})

// ============================================
// generateContentPlanSchema
// ============================================

describe('generateContentPlanSchema', () => {
  const validBase = {
    platforms: ['linkedin'],
  }

  it('accepts valid minimal input', () => {
    const result = generateContentPlanSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platforms).toEqual(['linkedin'])
      expect(result.data.count).toBe(7)
      expect(result.data.tone).toBe('professional')
      expect(result.data.language).toBe('de')
    }
  })

  it('accepts valid full input', () => {
    const result = generateContentPlanSchema.safeParse({
      platforms: ['linkedin', 'twitter', 'instagram'],
      topicIds: [VALID_UUID],
      topics: ['AI trends', 'Product updates'],
      count: 14,
      tone: 'casual',
      language: 'en',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing platforms', () => {
    const result = generateContentPlanSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty platforms array', () => {
    const result = generateContentPlanSchema.safeParse({ platforms: [] })
    expect(result.success).toBe(false)
  })

  it('accepts all valid platform values', () => {
    for (const platform of ['linkedin', 'twitter', 'instagram', 'facebook', 'xing']) {
      const result = generateContentPlanSchema.safeParse({ platforms: [platform] })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid platform in array', () => {
    const result = generateContentPlanSchema.safeParse({ platforms: ['tiktok'] })
    expect(result.success).toBe(false)
  })

  it('defaults count to 7', () => {
    const result = generateContentPlanSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(7)
  })

  it('rejects count less than 1', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, count: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects count greater than 30', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, count: 31 })
    expect(result.success).toBe(false)
  })

  it('accepts count of exactly 1', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, count: 1 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(1)
  })

  it('accepts count of exactly 30', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, count: 30 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(30)
  })

  it('rejects non-integer count', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, count: 7.5 })
    expect(result.success).toBe(false)
  })

  it('accepts all valid tone values', () => {
    for (const tone of ['professional', 'casual', 'humorous', 'inspirational']) {
      const result = generateContentPlanSchema.safeParse({ ...validBase, tone })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid tone', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, tone: 'aggressive' })
    expect(result.success).toBe(false)
  })

  it('accepts language en', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, language: 'en' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('en')
  })

  it('rejects invalid language', () => {
    const result = generateContentPlanSchema.safeParse({ ...validBase, language: 'fr' })
    expect(result.success).toBe(false)
  })

  it('accepts topicIds array of valid UUIDs', () => {
    const result = generateContentPlanSchema.safeParse({
      ...validBase,
      topicIds: [VALID_UUID, VALID_UUID],
    })
    expect(result.success).toBe(true)
  })

  it('rejects topicIds with invalid UUID', () => {
    const result = generateContentPlanSchema.safeParse({
      ...validBase,
      topicIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts topics string array', () => {
    const result = generateContentPlanSchema.safeParse({
      ...validBase,
      topics: ['Leadership', 'Innovation'],
    })
    expect(result.success).toBe(true)
  })
})

// ============================================
// generateTopicsSchema
// ============================================

describe('generateTopicsSchema', () => {
  it('accepts valid input', () => {
    const result = generateTopicsSchema.safeParse({ count: 10 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(10)
  })

  it('defaults count to 5', () => {
    const result = generateTopicsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(5)
  })

  it('accepts count of exactly 1', () => {
    const result = generateTopicsSchema.safeParse({ count: 1 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(1)
  })

  it('accepts count of exactly 20', () => {
    const result = generateTopicsSchema.safeParse({ count: 20 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.count).toBe(20)
  })

  it('rejects count less than 1', () => {
    const result = generateTopicsSchema.safeParse({ count: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects count greater than 20', () => {
    const result = generateTopicsSchema.safeParse({ count: 21 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer count', () => {
    const result = generateTopicsSchema.safeParse({ count: 5.5 })
    expect(result.success).toBe(false)
  })

  it('rejects count of -1', () => {
    const result = generateTopicsSchema.safeParse({ count: -1 })
    expect(result.success).toBe(false)
  })
})

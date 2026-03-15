import { describe, it, expect } from 'vitest'
import {
  createMarketingCampaignSchema,
  updateMarketingCampaignSchema,
  createMarketingTaskSchema,
  updateMarketingTaskSchema,
  createMarketingTemplateSchema,
  updateMarketingTemplateSchema,
} from '@/lib/utils/validation'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================
// Marketing Campaign Schemas
// ============================================

describe('createMarketingCampaignSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: 'Summer Campaign', type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Summer Campaign')
      expect(result.data.type).toBe('email')
      expect(result.data.status).toBe('draft')
      expect(result.data.settings).toEqual({})
    }
  })

  it('accepts valid full input', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Q1 Campaign',
      description: 'First quarter campaign',
      type: 'multi',
      status: 'active',
      targetAudience: 'SME businesses',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      settings: { trackClicks: true, sendTime: '09:00' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createMarketingCampaignSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: 'Campaign' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: '', type: 'email' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'A'.repeat(256),
      type: 'email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['email', 'call', 'sms', 'multi']) {
      const result = createMarketingCampaignSchema.safeParse({ name: 'Test', type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: 'Test', type: 'push' })
    expect(result.success).toBe(false)
  })

  it('defaults status to draft', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: 'Test', type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('accepts all valid status values', () => {
    for (const status of ['draft', 'active', 'paused', 'completed', 'archived']) {
      const result = createMarketingCampaignSchema.safeParse({ name: 'Test', type: 'email', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string description', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      description: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string targetAudience', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      targetAudience: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string startDate', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      startDate: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string endDate', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      endDate: '',
    })
    expect(result.success).toBe(true)
  })

  it('defaults settings to empty object', () => {
    const result = createMarketingCampaignSchema.safeParse({ name: 'Test', type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.settings).toEqual({})
  })

  it('accepts settings record', () => {
    const result = createMarketingCampaignSchema.safeParse({
      name: 'Test',
      type: 'email',
      settings: { key: 'value', count: 5 },
    })
    expect(result.success).toBe(true)
  })
})

describe('updateMarketingCampaignSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateMarketingCampaignSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateMarketingCampaignSchema.safeParse({ name: 'Updated', status: 'active' })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    const result = updateMarketingCampaignSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates type enum', () => {
    const result = updateMarketingCampaignSchema.safeParse({ type: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Marketing Task Schemas
// ============================================

describe('createMarketingTaskSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('email')
      expect(result.data.status).toBe('draft')
    }
  })

  it('accepts valid full input', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      recipientEmail: 'john@example.com',
      recipientName: 'John Doe',
      recipientCompany: 'Acme GmbH',
      personId: VALID_UUID,
      companyId: VALID_UUID,
      subject: 'Special Offer',
      content: 'Dear John, ...',
      scheduledAt: '2026-04-01T09:00:00Z',
      status: 'scheduled',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = createMarketingTaskSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['email', 'call', 'sms']) {
      const result = createMarketingTaskSchema.safeParse({ type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'push' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid recipientEmail', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      recipientEmail: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string recipientEmail', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', recipientEmail: '' })
    expect(result.success).toBe(true)
  })

  it('accepts valid email recipientEmail', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      recipientEmail: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects recipientName exceeding 255 chars', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      recipientName: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string recipientName', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', recipientName: '' })
    expect(result.success).toBe(true)
  })

  it('rejects recipientCompany exceeding 255 chars', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      recipientCompany: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string recipientCompany', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', recipientCompany: '' })
    expect(result.success).toBe(true)
  })

  it('accepts valid UUID for personId', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', personId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it('accepts null personId', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', personId: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for personId', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', personId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null companyId', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', companyId: null })
    expect(result.success).toBe(true)
  })

  it('rejects subject exceeding 255 chars', () => {
    const result = createMarketingTaskSchema.safeParse({
      type: 'email',
      subject: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string subject', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', subject: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string content', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', content: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string scheduledAt', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', scheduledAt: '' })
    expect(result.success).toBe(true)
  })

  it('defaults status to draft', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('accepts all valid status values', () => {
    for (const status of ['draft', 'scheduled', 'sent', 'failed']) {
      const result = createMarketingTaskSchema.safeParse({ type: 'email', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createMarketingTaskSchema.safeParse({ type: 'email', status: 'pending' })
    expect(result.success).toBe(false)
  })
})

describe('updateMarketingTaskSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateMarketingTaskSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateMarketingTaskSchema.safeParse({ status: 'sent', subject: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('still validates type enum', () => {
    const result = updateMarketingTaskSchema.safeParse({ type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates email format', () => {
    const result = updateMarketingTaskSchema.safeParse({ recipientEmail: 'bad-email' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Marketing Template Schemas
// ============================================

describe('createMarketingTemplateSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Welcome Email',
      type: 'email',
      content: 'Hello {{name}}, welcome!',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Welcome Email')
      expect(result.data.type).toBe('email')
      expect(result.data.isDefault).toBe(false)
    }
  })

  it('accepts valid full input', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Sales Call Script',
      type: 'call',
      subject: 'Follow-up call',
      content: 'Introduction script...',
      isDefault: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createMarketingTemplateSchema.safeParse({ type: 'email', content: 'Hello' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = createMarketingTemplateSchema.safeParse({ name: 'Test', content: 'Hello' })
    expect(result.success).toBe(false)
  })

  it('rejects missing content', () => {
    const result = createMarketingTemplateSchema.safeParse({ name: 'Test', type: 'email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: '',
      type: 'email',
      content: 'Hello',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty content', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'email',
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'A'.repeat(256),
      type: 'email',
      content: 'Hello',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['email', 'call', 'sms']) {
      const result = createMarketingTemplateSchema.safeParse({
        name: 'Test',
        type,
        content: 'Content',
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'push',
      content: 'Hello',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subject exceeding 255 chars', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'email',
      content: 'Hello',
      subject: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string subject', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'email',
      content: 'Hello',
      subject: '',
    })
    expect(result.success).toBe(true)
  })

  it('defaults isDefault to false', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'email',
      content: 'Hello',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isDefault).toBe(false)
  })

  it('accepts isDefault true', () => {
    const result = createMarketingTemplateSchema.safeParse({
      name: 'Test',
      type: 'email',
      content: 'Hello',
      isDefault: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateMarketingTemplateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateMarketingTemplateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateMarketingTemplateSchema.safeParse({ isDefault: true, content: 'New content' })
    expect(result.success).toBe(true)
  })

  it('still validates name max length', () => {
    const result = updateMarketingTemplateSchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates type enum', () => {
    const result = updateMarketingTemplateSchema.safeParse({ type: 'invalid' })
    expect(result.success).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  generateBlogPostSchema,
} from '@/lib/utils/validation'

describe('createBlogPostSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test Post' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Post')
      expect(result.data.status).toBe('draft')
      expect(result.data.source).toBe('manual')
      expect(result.data.tags).toEqual([])
    }
  })

  it('accepts valid full input', () => {
    const result = createBlogPostSchema.safeParse({
      title: 'Full Blog Post',
      slug: 'full-blog-post',
      excerpt: 'A short summary',
      content: '<p>Full content here</p>',
      featuredImage: 'https://example.com/image.jpg',
      featuredImageAlt: 'An image',
      seoTitle: 'SEO Title',
      seoDescription: 'SEO description text',
      seoKeywords: 'keyword1, keyword2',
      tags: ['tech', 'news'],
      category: 'Technology',
      status: 'published',
      source: 'ai',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = createBlogPostSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createBlogPostSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 255 chars', () => {
    const result = createBlogPostSchema.safeParse({ title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects slug exceeding 255 chars', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', slug: 'a'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string slug', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', slug: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string excerpt', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', excerpt: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string content', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', content: '' })
    expect(result.success).toBe(true)
  })

  it('rejects featuredImage exceeding 500 chars', () => {
    const result = createBlogPostSchema.safeParse({
      title: 'Test',
      featuredImage: 'https://example.com/' + 'a'.repeat(490),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string featuredImage', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', featuredImage: '' })
    expect(result.success).toBe(true)
  })

  it('rejects featuredImageAlt exceeding 255 chars', () => {
    const result = createBlogPostSchema.safeParse({
      title: 'Test',
      featuredImageAlt: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string featuredImageAlt', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', featuredImageAlt: '' })
    expect(result.success).toBe(true)
  })

  it('rejects seoTitle exceeding 70 chars', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', seoTitle: 'A'.repeat(71) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoTitle', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', seoTitle: '' })
    expect(result.success).toBe(true)
  })

  it('rejects seoDescription exceeding 160 chars', () => {
    const result = createBlogPostSchema.safeParse({
      title: 'Test',
      seoDescription: 'A'.repeat(161),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoDescription', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', seoDescription: '' })
    expect(result.success).toBe(true)
  })

  it('rejects seoKeywords exceeding 255 chars', () => {
    const result = createBlogPostSchema.safeParse({
      title: 'Test',
      seoKeywords: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoKeywords', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', seoKeywords: '' })
    expect(result.success).toBe(true)
  })

  it('rejects category exceeding 100 chars', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', category: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts empty string category', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', category: '' })
    expect(result.success).toBe(true)
  })

  it('defaults status to draft', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('accepts all valid status values', () => {
    for (const status of ['draft', 'published', 'archived']) {
      const result = createBlogPostSchema.safeParse({ title: 'Test', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('defaults source to manual', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.source).toBe('manual')
  })

  it('accepts all valid source values', () => {
    for (const source of ['manual', 'ai', 'api']) {
      const result = createBlogPostSchema.safeParse({ title: 'Test', source })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid source', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', source: 'rss' })
    expect(result.success).toBe(false)
  })

  it('defaults tags to empty array', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('accepts tags array', () => {
    const result = createBlogPostSchema.safeParse({ title: 'Test', tags: ['a', 'b', 'c'] })
    expect(result.success).toBe(true)
  })
})

describe('updateBlogPostSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateBlogPostSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateBlogPostSchema.safeParse({ title: 'Updated Title', status: 'published' })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    const result = updateBlogPostSchema.safeParse({ title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates status enum', () => {
    const result = updateBlogPostSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('generateBlogPostSchema', () => {
  it('accepts valid minimal input', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'AI in Business' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.language).toBe('de')
      expect(result.data.tone).toBe('professional')
      expect(result.data.length).toBe('medium')
    }
  })

  it('accepts valid full input', () => {
    const result = generateBlogPostSchema.safeParse({
      topic: 'Cloud Computing Trends',
      language: 'en',
      tone: 'casual',
      length: 'long',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing topic', () => {
    const result = generateBlogPostSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty topic', () => {
    const result = generateBlogPostSchema.safeParse({ topic: '' })
    expect(result.success).toBe(false)
  })

  it('rejects topic exceeding 500 chars', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'A'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('defaults language to de', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('de')
  })

  it('accepts all valid language values', () => {
    for (const language of ['de', 'en']) {
      const result = generateBlogPostSchema.safeParse({ topic: 'Test', language })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid language', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'Test', language: 'fr' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid tone values', () => {
    for (const tone of ['professional', 'casual', 'technical']) {
      const result = generateBlogPostSchema.safeParse({ topic: 'Test', tone })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid tone', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'Test', tone: 'funny' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid length values', () => {
    for (const length of ['short', 'medium', 'long']) {
      const result = generateBlogPostSchema.safeParse({ topic: 'Test', length })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid length', () => {
    const result = generateBlogPostSchema.safeParse({ topic: 'Test', length: 'extra-long' })
    expect(result.success).toBe(false)
  })
})

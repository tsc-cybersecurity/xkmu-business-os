import { describe, it, expect } from 'vitest'
import { createCmsPageSchema,
  updateCmsPageSchema,
  createCmsBlockSchema,
  updateCmsBlockSchema,
  reorderCmsBlocksSchema,
  createCmsNavigationItemSchema,
  updateCmsNavigationItemSchema,
} from '@/lib/utils/validation'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================
// CMS Page Schemas
// ============================================

describe('createCmsPageSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/about', title: 'About Us' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slug).toBe('/about')
      expect(result.data.title).toBe('About Us')
      expect(result.data.status).toBe('draft')
    }
  })

  it('accepts valid full input', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/products/overview',
      title: 'Products Overview',
      seoTitle: 'Our Products',
      seoDescription: 'Browse all our products',
      seoKeywords: 'products, shop, buy',
      ogImage: 'https://example.com/og.jpg',
      status: 'published',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing slug', () => {
    const result = createCmsPageSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test' })
    expect(result.success).toBe(false)
  })

  it('rejects empty slug', () => {
    const result = createCmsPageSchema.safeParse({ slug: '', title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects slug not starting with /', () => {
    const result = createCmsPageSchema.safeParse({ slug: 'about', title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with uppercase letters', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/About', title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('accepts slug with nested path', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/blog/my-post-123', title: 'Test' })
    expect(result.success).toBe(true)
  })

  it('rejects slug exceeding 255 chars', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/' + 'a'.repeat(255), title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 255 chars', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects seoTitle exceeding 70 chars', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      seoTitle: 'A'.repeat(71),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoTitle', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'Test', seoTitle: '' })
    expect(result.success).toBe(true)
  })

  it('rejects seoDescription exceeding 160 chars', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      seoDescription: 'A'.repeat(161),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoDescription', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      seoDescription: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects seoKeywords exceeding 255 chars', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      seoKeywords: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string seoKeywords', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      seoKeywords: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects ogImage exceeding 500 chars', () => {
    const result = createCmsPageSchema.safeParse({
      slug: '/test',
      title: 'Test',
      ogImage: 'https://example.com/' + 'a'.repeat(490),
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string ogImage', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'Test', ogImage: '' })
    expect(result.success).toBe(true)
  })

  it('defaults status to draft', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('accepts all valid status values', () => {
    for (const status of ['draft', 'published']) {
      const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'Test', status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createCmsPageSchema.safeParse({ slug: '/test', title: 'Test', status: 'archived' })
    expect(result.success).toBe(false)
  })
})

describe('updateCmsPageSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCmsPageSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateCmsPageSchema.safeParse({ title: 'New Title', status: 'published' })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    const result = updateCmsPageSchema.safeParse({ title: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('still validates slug pattern', () => {
    const result = updateCmsPageSchema.safeParse({ slug: 'no-slash' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// CMS Block Schemas
// ============================================

describe('createCmsBlockSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.blockType).toBe('hero')
      expect(result.data.sortOrder).toBe(0)
      expect(result.data.content).toEqual({})
      expect(result.data.settings).toEqual({})
      expect(result.data.isVisible).toBe(true)
    }
  })

  it('accepts valid full input', () => {
    const result = createCmsBlockSchema.safeParse({
      blockType: 'text',
      sortOrder: 3,
      content: { body: 'Some text', heading: 'Title' },
      settings: { bgColor: '#fff', padding: 20 },
      isVisible: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing blockType', () => {
    const result = createCmsBlockSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty blockType', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: '' })
    expect(result.success).toBe(false)
  })

  it('rejects blockType exceeding 50 chars', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('rejects negative sortOrder', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero', sortOrder: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer sortOrder', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero', sortOrder: 1.5 })
    expect(result.success).toBe(false)
  })

  it('defaults sortOrder to 0', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sortOrder).toBe(0)
  })

  it('defaults content to empty object', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toEqual({})
  })

  it('defaults settings to empty object', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.settings).toEqual({})
  })

  it('defaults isVisible to true', () => {
    const result = createCmsBlockSchema.safeParse({ blockType: 'hero' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isVisible).toBe(true)
  })

  it('accepts complex content record', () => {
    const result = createCmsBlockSchema.safeParse({
      blockType: 'gallery',
      content: { images: ['url1', 'url2'], columns: 3, showCaptions: true },
    })
    expect(result.success).toBe(true)
  })
})

describe('updateCmsBlockSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCmsBlockSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateCmsBlockSchema.safeParse({ isVisible: false, sortOrder: 2 })
    expect(result.success).toBe(true)
  })

  it('still validates blockType constraints', () => {
    const result = updateCmsBlockSchema.safeParse({ blockType: '' })
    expect(result.success).toBe(false)
  })

  it('still validates sortOrder min', () => {
    const result = updateCmsBlockSchema.safeParse({ sortOrder: -1 })
    expect(result.success).toBe(false)
  })
})

describe('reorderCmsBlocksSchema', () => {
  it('accepts valid blockIds array', () => {
    const result = reorderCmsBlocksSchema.safeParse({ blockIds: [VALID_UUID] })
    expect(result.success).toBe(true)
  })

  it('accepts multiple valid UUIDs', () => {
    const uuid2 = '550e8400-e29b-41d4-a716-446655440001'
    const result = reorderCmsBlocksSchema.safeParse({ blockIds: [VALID_UUID, uuid2] })
    expect(result.success).toBe(true)
  })

  it('rejects empty blockIds array', () => {
    const result = reorderCmsBlocksSchema.safeParse({ blockIds: [] })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID in array', () => {
    const result = reorderCmsBlocksSchema.safeParse({ blockIds: ['not-a-uuid'] })
    expect(result.success).toBe(false)
  })

  it('rejects missing blockIds', () => {
    const result = reorderCmsBlocksSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================
// CMS Navigation Schemas
// ============================================

describe('createCmsNavigationItemSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.location).toBe('header')
      expect(result.data.label).toBe('Home')
      expect(result.data.href).toBe('/')
      expect(result.data.sortOrder).toBe(0)
      expect(result.data.openInNewTab).toBe(false)
      expect(result.data.isVisible).toBe(true)
    }
  })

  it('accepts valid full input', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'footer',
      label: 'Privacy Policy',
      href: '/privacy',
      pageId: VALID_UUID,
      sortOrder: 5,
      openInNewTab: true,
      isVisible: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing location', () => {
    const result = createCmsNavigationItemSchema.safeParse({ label: 'Home', href: '/' })
    expect(result.success).toBe(false)
  })

  it('rejects missing label', () => {
    const result = createCmsNavigationItemSchema.safeParse({ location: 'header', href: '/' })
    expect(result.success).toBe(false)
  })

  it('rejects missing href', () => {
    const result = createCmsNavigationItemSchema.safeParse({ location: 'header', label: 'Home' })
    expect(result.success).toBe(false)
  })

  it('rejects empty label', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: '',
      href: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty href', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects label exceeding 100 chars', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'A'.repeat(101),
      href: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects href exceeding 500 chars', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: 'https://example.com/' + 'a'.repeat(490),
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid location values', () => {
    for (const location of ['header', 'footer']) {
      const result = createCmsNavigationItemSchema.safeParse({
        location,
        label: 'Link',
        href: '/link',
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid location', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'sidebar',
      label: 'Home',
      href: '/',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null pageId', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
      pageId: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for pageId', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
      pageId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('defaults sortOrder to 0', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sortOrder).toBe(0)
  })

  it('rejects negative sortOrder', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
      sortOrder: -1,
    })
    expect(result.success).toBe(false)
  })

  it('defaults openInNewTab to false', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.openInNewTab).toBe(false)
  })

  it('defaults isVisible to true', () => {
    const result = createCmsNavigationItemSchema.safeParse({
      location: 'header',
      label: 'Home',
      href: '/',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isVisible).toBe(true)
  })
})

describe('updateCmsNavigationItemSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCmsNavigationItemSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateCmsNavigationItemSchema.safeParse({ label: 'New Label', isVisible: false })
    expect(result.success).toBe(true)
  })

  it('still validates location enum', () => {
    const result = updateCmsNavigationItemSchema.safeParse({ location: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates label max length', () => {
    const result = updateCmsNavigationItemSchema.safeParse({ label: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

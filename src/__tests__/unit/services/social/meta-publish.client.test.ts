import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('MetaPublishClient.publishToFacebookPage', () => {
  it('POSTs message + link to /{page-id}/feed', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: '123_456' }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({
      pageId: 'p1', pageAccessToken: 'tok', message: 'Hello', imageUrl: null,
    })
    expect(r).toEqual({ ok: true, externalPostId: '123_456', externalUrl: 'https://www.facebook.com/123_456' })
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/p1/feed')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(URLSearchParams)
    expect((init.body as URLSearchParams).get('message')).toBe('Hello')
    expect((init.body as URLSearchParams).get('access_token')).toBe('tok')
  })

  it('POSTs to /{page-id}/photos when imageUrl is present', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: '999_888', post_id: '999_777' }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({
      pageId: 'p1', pageAccessToken: 'tok', message: 'with pic', imageUrl: 'https://cdn/x.jpg',
    })
    expect(r).toEqual({ ok: true, externalPostId: '999_777', externalUrl: 'https://www.facebook.com/999_777' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/p1/photos')
    expect((init.body as URLSearchParams).get('url')).toBe('https://cdn/x.jpg')
    expect((init.body as URLSearchParams).get('caption')).toBe('with pic')
  })

  it('returns failure with revokeAccount=true on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { message: 'token revoked' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'token revoked', revokeAccount: true })
  })

  it('returns failure with revokeAccount=false on 500', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'server error' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'server error', revokeAccount: false })
  })

  it('does not throw on non-JSON error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new Error('not json') } })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r.ok).toBe(false)
    expect((r as any).error).toMatch(/meta_http_502/)
  })
})

describe('MetaPublishClient.publishToInstagram', () => {
  it('two-step: create container then publish', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_1' }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'media_999' }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({
      igUserId: 'ig1', pageAccessToken: 'tok', caption: 'Caption', imageUrl: 'https://cdn/x.jpg',
    })
    expect(r).toEqual({ ok: true, externalPostId: 'media_999', externalUrl: null })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [step1Url, step1Init] = mockFetch.mock.calls[0]
    expect(step1Url).toContain('/ig1/media')
    expect((step1Init.body as URLSearchParams).get('image_url')).toBe('https://cdn/x.jpg')
    expect((step1Init.body as URLSearchParams).get('caption')).toBe('Caption')

    const [step2Url, step2Init] = mockFetch.mock.calls[1]
    expect(step2Url).toContain('/ig1/media_publish')
    expect((step2Init.body as URLSearchParams).get('creation_id')).toBe('container_1')
  })

  it('rejects when imageUrl is missing', async () => {
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'instagram_requires_image', revokeAccount: false })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns failure when container creation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'invalid image_url' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: 'https://cdn/y.jpg' })
    expect(r).toEqual({ ok: false, error: 'invalid image_url', revokeAccount: false })
  })

  it('returns failure when media_publish step fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_1' }) })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'rate_limited' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: 'https://cdn/y.jpg' })
    expect(r).toEqual({ ok: false, error: 'rate_limited', revokeAccount: false })
  })
})

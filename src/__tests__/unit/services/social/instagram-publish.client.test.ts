import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('InstagramPublishClient.publishImage', () => {
  it('happy path: two-step container then publish, returns ok with externalPostId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_ig_1' }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'media_ig_999' }) })
    const { InstagramPublishClient } = await import('@/lib/services/social/instagram-publish.client')
    const r = await InstagramPublishClient.publishImage({
      igUserId: 'ig_user_1',
      accessToken: 'tok_long',
      caption: 'Test caption',
      imageUrl: 'https://cdn.example.com/photo.jpg',
    })
    expect(r).toEqual({ ok: true, externalPostId: 'media_ig_999', externalUrl: null })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    const [step1Url, step1Init] = mockFetch.mock.calls[0]
    expect(step1Url).toContain('graph.instagram.com')
    expect(step1Url).toContain('/ig_user_1/media')
    expect(step1Init.method).toBe('POST')
    expect(step1Init.body).toBeInstanceOf(URLSearchParams)
    expect((step1Init.body as URLSearchParams).get('image_url')).toBe('https://cdn.example.com/photo.jpg')
    expect((step1Init.body as URLSearchParams).get('caption')).toBe('Test caption')
    expect((step1Init.body as URLSearchParams).get('access_token')).toBe('tok_long')

    const [step2Url, step2Init] = mockFetch.mock.calls[1]
    expect(step2Url).toContain('/ig_user_1/media_publish')
    expect((step2Init.body as URLSearchParams).get('creation_id')).toBe('container_ig_1')
  })

  it('rejects when imageUrl is missing → returns instagram_requires_image', async () => {
    const { InstagramPublishClient } = await import('@/lib/services/social/instagram-publish.client')
    const r = await InstagramPublishClient.publishImage({
      igUserId: 'ig_user_1',
      accessToken: 'tok_long',
      caption: 'No image',
      imageUrl: null,
    })
    expect(r).toEqual({ ok: false, error: 'instagram_requires_image', revokeAccount: false })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('container creation fails → returns failure with error from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'invalid image_url format' } }),
    })
    const { InstagramPublishClient } = await import('@/lib/services/social/instagram-publish.client')
    const r = await InstagramPublishClient.publishImage({
      igUserId: 'ig_user_1',
      accessToken: 'tok_long',
      caption: 'x',
      imageUrl: 'https://cdn.example.com/bad.jpg',
    })
    expect(r).toEqual({ ok: false, error: 'invalid image_url format', revokeAccount: false })
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('media_publish step fails → returns failure with revokeAccount=true on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_ig_2' }) })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'token expired' } }),
    })
    const { InstagramPublishClient } = await import('@/lib/services/social/instagram-publish.client')
    const r = await InstagramPublishClient.publishImage({
      igUserId: 'ig_user_1',
      accessToken: 'expired_tok',
      caption: 'x',
      imageUrl: 'https://cdn.example.com/photo.jpg',
    })
    expect(r).toEqual({ ok: false, error: 'token expired', revokeAccount: true })
  })
})

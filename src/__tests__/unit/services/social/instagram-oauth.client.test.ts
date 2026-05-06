import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  process.env.INSTAGRAM_APP_ID = 'ig_app1'
  process.env.INSTAGRAM_APP_SECRET = 'ig_sec1'
  process.env.INSTAGRAM_OAUTH_REDIRECT_URI = 'https://example.com/ig/cb'
})

describe('InstagramOAuthClient.buildAuthorizeUrl', () => {
  it('contains client_id, state, scopes, and response_type=code', async () => {
    const { InstagramOAuthClient } = await import('@/lib/services/social/instagram-oauth.client')
    const url = InstagramOAuthClient.buildAuthorizeUrl('STATE_XYZ')
    expect(url).toContain('client_id=ig_app1')
    expect(url).toContain('state=STATE_XYZ')
    expect(url).toContain('instagram_business_basic')
    expect(url).toContain('instagram_business_content_publish')
    expect(url).toContain('response_type=code')
    expect(url).toContain('www.instagram.com/oauth/authorize')
  })
})

describe('InstagramOAuthClient.exchangeCode', () => {
  it('POSTs to api.instagram.com/oauth/access_token with form body and returns short token + user_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'short_ig_token', user_id: 98765, permissions: [] }),
    })
    const { InstagramOAuthClient } = await import('@/lib/services/social/instagram-oauth.client')
    const r = await InstagramOAuthClient.exchangeCode('AUTH_CODE_123')
    expect(r.accessToken).toBe('short_ig_token')
    expect(r.igUserId).toBe('98765')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('api.instagram.com/oauth/access_token')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(URLSearchParams)
    expect((init.body as URLSearchParams).get('client_id')).toBe('ig_app1')
    expect((init.body as URLSearchParams).get('code')).toBe('AUTH_CODE_123')
    expect((init.body as URLSearchParams).get('grant_type')).toBe('authorization_code')
  })

  it('throws on Instagram error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error_message: 'Invalid code' }),
    })
    const { InstagramOAuthClient } = await import('@/lib/services/social/instagram-oauth.client')
    await expect(InstagramOAuthClient.exchangeCode('BAD_CODE')).rejects.toThrow(/Invalid code/)
  })
})

describe('InstagramOAuthClient.exchangeForLongLived', () => {
  it('GETs graph.instagram.com/access_token and returns long token + expires_in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'long_ig_token', token_type: 'bearer', expires_in: 5184000 }),
    })
    const { InstagramOAuthClient } = await import('@/lib/services/social/instagram-oauth.client')
    const r = await InstagramOAuthClient.exchangeForLongLived('short_ig_token')
    expect(r.accessToken).toBe('long_ig_token')
    expect(r.expiresInSec).toBe(5184000)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('graph.instagram.com/access_token')
    expect(url).toContain('grant_type=ig_exchange_token')
    expect(url).toContain('ig_sec1')
  })
})

describe('InstagramOAuthClient.getUserInfo', () => {
  it('GETs graph.instagram.com/me and returns igUserId and igUsername', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '112233', username: 'my_ig_account' }),
    })
    const { InstagramOAuthClient } = await import('@/lib/services/social/instagram-oauth.client')
    const r = await InstagramOAuthClient.getUserInfo('long_ig_token')
    expect(r.igUserId).toBe('112233')
    expect(r.igUsername).toBe('my_ig_account')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('graph.instagram.com/me')
    expect(url).toContain('fields=id%2Cusername')
  })
})

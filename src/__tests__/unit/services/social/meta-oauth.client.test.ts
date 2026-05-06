import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  process.env.META_APP_ID = 'app1'
  process.env.META_APP_SECRET = 'sec1'
  process.env.META_OAUTH_REDIRECT_URI = 'https://example.com/cb'
})

describe('MetaOAuthClient.buildAuthorizeUrl', () => {
  it('includes required scopes and state', async () => {
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const url = MetaOAuthClient.buildAuthorizeUrl('STATE123')
    expect(url).toContain('client_id=app1')
    expect(url).toContain('state=STATE123')
    expect(url).toContain('pages_manage_posts')
    expect(url).toContain('instagram_business_basic')
    expect(url).toContain('instagram_business_content_publish')
    expect(url).toContain('pages_show_list')
  })
})

describe('MetaOAuthClient.exchangeCode', () => {
  it('exchanges code for short-lived token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short_at', expires_in: 3600 }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.exchangeCode('CODE')
    expect(r.accessToken).toBe('short_at')
    expect(r.expiresInSec).toBe(3600)
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch.mock.calls[0][0]).toContain('client_id=app1')
    expect(mockFetch.mock.calls[0][0]).toContain('code=CODE')
  })

  it('throws on Meta error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'bad code' } }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    await expect(MetaOAuthClient.exchangeCode('BAD')).rejects.toThrow(/bad code/)
  })
})

describe('MetaOAuthClient.exchangeForLongLived', () => {
  it('upgrades short-lived to long-lived (60d)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'long_at', expires_in: 5184000 }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.exchangeForLongLived('short_at')
    expect(r.accessToken).toBe('long_at')
    expect(r.expiresInSec).toBe(5184000)
  })
})

describe('MetaOAuthClient.listPagesWithIg', () => {
  it('returns pages with optional ig_user_id from /me/accounts + per-page lookup', async () => {
    // /me/accounts
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [
      { id: 'p1', name: 'Page One', access_token: 'tok_p1' },
      { id: 'p2', name: 'Page Two', access_token: 'tok_p2' },
    ] }) })
    // /{p1}?fields=instagram_business_account
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ instagram_business_account: { id: 'ig1' } }) })
    // /{p2}?fields=instagram_business_account
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })  // no IG linked
    // /{ig1}?fields=username
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'page_one_ig' }) })

    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.listPagesWithIg('long_user_token')
    expect(r).toEqual([
      { pageId: 'p1', pageName: 'Page One', pageAccessToken: 'tok_p1', igUserId: 'ig1', igUsername: 'page_one_ig' },
      { pageId: 'p2', pageName: 'Page Two', pageAccessToken: 'tok_p2', igUserId: null, igUsername: null },
    ])
  })
})

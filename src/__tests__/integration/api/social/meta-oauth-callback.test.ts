import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

const accountSvc = { connectMeta: vi.fn() }
vi.mock('@/lib/services/social/social-account.service', () => ({ SocialAccountService: accountSvc }))

const meta = { exchangeCode: vi.fn(), exchangeForLongLived: vi.fn(), listPagesWithIg: vi.fn() }
vi.mock('@/lib/services/social/meta-oauth.client', () => ({ MetaOAuthClient: meta }))

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ appointmentTokenSecret: 's'.repeat(64) }) },
}))

beforeEach(() => {
  vi.resetModules()
  accountSvc.connectMeta.mockReset()
  meta.exchangeCode.mockReset()
  meta.exchangeForLongLived.mockReset()
  meta.listPagesWithIg.mockReset()
})

function buildValidState(secret: string, uid = 'u1'): string {
  const stateRaw = JSON.stringify({ uid, n: 'nonce', t: Date.now() })
  const sig = createHmac('sha256', secret).update(stateRaw).digest('hex')
  return `${Buffer.from(stateRaw).toString('base64url')}.${sig}`
}

describe('GET /api/social/meta/oauth/callback', () => {
  it('redirects with error if Meta returned ?error', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request('https://app/x?error=user_denied&state=abc') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=user_denied')
  })

  it('returns missing_code_or_state when state or code is absent', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request('https://app/x?code=onlycode') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=missing_code_or_state')
  })

  it('returns invalid_state for bad signature', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request('https://app/x?code=CODE&state=garbage') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('auto-selects single page and connects', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'X', pageAccessToken: 't', igUserId: null, igUsername: null },
    ])
    accountSvc.connectMeta.mockResolvedValue({ connected: [{ provider: 'facebook' }] })
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('connected=meta')
    expect(accountSvc.connectMeta).toHaveBeenCalledWith({
      longUserToken: 'l', expiresInSec: 5184000, selectedPageId: 'p1', userId: 'u1',
    })
  })

  it('redirects with no_pages_found when 0 pages', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([])
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.headers.get('location')).toContain('error=no_pages_found')
  })

  it('redirects with multiple_pages_unsupported_v1 when >1 page', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'A', pageAccessToken: 't1', igUserId: null, igUsername: null },
      { pageId: 'p2', pageName: 'B', pageAccessToken: 't2', igUserId: null, igUsername: null },
    ])
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.headers.get('location')).toContain('error=multiple_pages_unsupported_v1')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

const accountSvc = { connectMeta: vi.fn() }
vi.mock('@/lib/services/social/social-account.service', () => ({ SocialAccountService: accountSvc }))

const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))

const meta = { exchangeCode: vi.fn(), exchangeForLongLived: vi.fn(), listPagesWithIg: vi.fn() }
vi.mock('@/lib/services/social/meta-oauth.client', () => ({ MetaOAuthClient: meta }))

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ appointmentTokenSecret: 's'.repeat(64) }) },
}))

vi.mock('@/lib/services/cms-design.service', () => ({
  CmsDesignService: { getAppUrl: vi.fn().mockResolvedValue('https://app.example.com') },
}))

beforeEach(() => {
  vi.resetModules()
  accountSvc.connectMeta.mockReset()
  audit.log.mockReset()
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
    accountSvc.connectMeta.mockResolvedValue({ connected: [
      { id: 'acc1', provider: 'facebook', externalAccountId: 'p1', accountName: 'Test FB', status: 'connected', tokenExpiresAt: null }
    ] })
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('connected=meta')
    expect(accountSvc.connectMeta).toHaveBeenCalledWith({
      page: { pageId: 'p1', pageName: 'X', pageAccessToken: 't', igUserId: null, igUsername: null },
      expiresInSec: 5184000,
      userId: 'u1',
    })
    expect(audit.log).toHaveBeenCalledTimes(1)
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_account_connected',
      entityType: 'social_oauth_accounts',
      entityId: 'acc1',
      payload: expect.objectContaining({ provider: 'facebook', externalAccountId: 'p1' }),
    }))
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

  it('with >1 page, prefers a page whose name matches /xkmu/i', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'YABIS AI', pageAccessToken: 't1', igUserId: null, igUsername: null },
      { pageId: 'p2', pageName: 'XKMU', pageAccessToken: 't2', igUserId: null, igUsername: null },
      { pageId: 'p3', pageName: 'pc-helpline.me', pageAccessToken: 't3', igUserId: null, igUsername: null },
    ])
    accountSvc.connectMeta.mockResolvedValue({ connected: [{ id: 'acc1', provider: 'facebook', externalAccountId: 'p2', accountName: 'XKMU', status: 'connected', tokenExpiresAt: null }] })
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.headers.get('location')).toContain('connected=meta')
    expect(accountSvc.connectMeta).toHaveBeenCalledWith(expect.objectContaining({
      page: expect.objectContaining({ pageId: 'p2', pageName: 'XKMU' }),
    }))
  })

  it('with >1 page and no xkmu match, falls back to the first page', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'Page A', pageAccessToken: 't1', igUserId: null, igUsername: null },
      { pageId: 'p2', pageName: 'Page B', pageAccessToken: 't2', igUserId: null, igUsername: null },
    ])
    accountSvc.connectMeta.mockResolvedValue({ connected: [{ id: 'acc1', provider: 'facebook', externalAccountId: 'p1', accountName: 'Page A', status: 'connected', tokenExpiresAt: null }] })
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.headers.get('location')).toContain('connected=meta')
    expect(accountSvc.connectMeta).toHaveBeenCalledWith(expect.objectContaining({
      page: expect.objectContaining({ pageId: 'p1' }),
    }))
  })

  it('does not call audit.log when no pages found (error path)', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([])
    const validState = buildValidState('s'.repeat(64))

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.headers.get('location')).toContain('error=no_pages_found')
    expect(audit.log).not.toHaveBeenCalled()
  })

  it('sanitizes raw error messages before redirecting', async () => {
    meta.exchangeCode.mockRejectedValue(new Error('Token "abc:secret-leak" failed at https://graph.facebook.com'))
    const validState = buildValidState('s'.repeat(64))
    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    const loc = res.headers.get('location') ?? ''
    const errorParam = new URL(loc).searchParams.get('error') ?? ''
    // secret-leak must not appear verbatim
    expect(errorParam).not.toContain('secret-leak')
    // raw URL syntax must not appear verbatim
    expect(errorParam).not.toContain('://')
    // error value must be alphanumeric + underscore only
    expect(errorParam).toMatch(/^[a-zA-Z0-9_]+$/)
  })
})

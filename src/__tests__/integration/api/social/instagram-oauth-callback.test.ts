import { describe, it, expect, vi, beforeEach } from 'vitest'

const accountSvc = { connectInstagram: vi.fn() }
vi.mock('@/lib/services/social/social-account.service', () => ({ SocialAccountService: accountSvc }))

const ig = { exchangeCode: vi.fn(), exchangeForLongLived: vi.fn(), getUserInfo: vi.fn() }
vi.mock('@/lib/services/social/instagram-oauth.client', () => ({ InstagramOAuthClient: ig }))

const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ appointmentTokenSecret: 's'.repeat(64) }) },
}))

beforeEach(() => {
  vi.resetModules()
  accountSvc.connectInstagram.mockReset()
  audit.log.mockReset()
  Object.values(ig).forEach((fn: any) => fn.mockReset())
})

async function buildValidState(uid = 'u1'): Promise<string> {
  const { signState } = await import('@/lib/utils/oauth-state')
  return signState({ uid, n: 'nonce', t: Date.now() }, 's'.repeat(64))
}

describe('GET /api/social/instagram/oauth/callback', () => {
  it('redirects with error if Instagram returned ?error', async () => {
    const { GET } = await import('@/app/api/social/instagram/oauth/callback/route')
    const res = await GET(new Request('https://app/x?error=user_denied&state=abc') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=user_denied')
  })

  it('returns missing_code_or_state when code or state is absent', async () => {
    const { GET } = await import('@/app/api/social/instagram/oauth/callback/route')
    const res = await GET(new Request('https://app/x?code=onlycode') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=missing_code_or_state')
  })

  it('returns invalid_state for bad signature', async () => {
    const { GET } = await import('@/app/api/social/instagram/oauth/callback/route')
    const res = await GET(new Request('https://app/x?code=CODE&state=garbage') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('happy path: calls connectInstagram with correct args, writes audit log, redirects connected=instagram', async () => {
    ig.exchangeCode.mockResolvedValue({ accessToken: 'short_token', igUserId: 'ig123' })
    ig.exchangeForLongLived.mockResolvedValue({ accessToken: 'long_token', expiresInSec: 5184000 })
    ig.getUserInfo.mockResolvedValue({ igUserId: 'ig123', igUsername: 'testuser' })
    accountSvc.connectInstagram.mockResolvedValue({
      connected: [
        { id: 'acc1', provider: 'instagram', externalAccountId: 'ig123', accountName: 'testuser', status: 'connected', tokenExpiresAt: null },
      ],
    })
    const validState = await buildValidState('u1')

    const { GET } = await import('@/app/api/social/instagram/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('connected=instagram')
    expect(accountSvc.connectInstagram).toHaveBeenCalledWith({
      longLivedToken: 'long_token',
      expiresInSec: 5184000,
      igUserId: 'ig123',
      igUsername: 'testuser',
      userId: 'u1',
    })
    expect(audit.log).toHaveBeenCalledTimes(1)
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_account_connected',
      entityType: 'social_oauth_accounts',
      entityId: 'acc1',
      payload: expect.objectContaining({ provider: 'instagram', externalAccountId: 'ig123', source: 'instagram_direct' }),
    }))
  })

  it('sanitizes raw error messages before redirecting when exchangeCode throws', async () => {
    ig.exchangeCode.mockRejectedValue(new Error('Token "abc:secret-leak" failed at https://graph.instagram.com'))
    const validState = await buildValidState('u1')
    const { GET } = await import('@/app/api/social/instagram/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${encodeURIComponent(validState)}`) as any)
    const loc = res.headers.get('location') ?? ''
    const errorParam = new URL(loc).searchParams.get('error') ?? ''
    expect(errorParam).not.toContain('secret-leak')
    expect(errorParam).not.toContain('://')
    expect(errorParam).toMatch(/^[a-zA-Z0-9_]+$/)
  })
})

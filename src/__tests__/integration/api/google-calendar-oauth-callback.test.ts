import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    exchangeCode: vi.fn(),
    listCalendars: vi.fn(),
    revokeToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    storeNewAccount: vi.fn(),
    getActiveAccount: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      id: 'cfg-1',
      clientId: 'cid',
      clientSecret: 'secret',
      redirectUri: 'https://app.x/cb',
      appPublicUrl: 'https://app.x',
      tokenEncryptionKeyHex: '0'.repeat(64),
      appointmentTokenSecret: 'S'.repeat(40),
    }),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}))

function makeStateCookie(secret: string, userId = 'u-1'): { cookieValue: string; queryState: string } {
  const { createHmac } = require('node:crypto')
  const raw = JSON.stringify({ uid: userId, n: 'noncexx', t: Date.now() })
  const sig = createHmac('sha256', secret).update(raw).digest('hex')
  const state = `${Buffer.from(raw).toString('base64url')}.${sig}`
  return { cookieValue: state, queryState: state }
}

describe('GET /api/google-calendar/oauth/callback', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('happy path: exchanges code, stores account, redirects', async () => {
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarGoogleClient.exchangeCode).mockResolvedValueOnce({
      accessToken: 'AT', refreshToken: 'RT', expiresInSec: 3600,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    vi.mocked(CalendarGoogleClient.listCalendars).mockResolvedValueOnce([
      { id: 'primary', summary: 'X', isPrimary: true },
    ])
    vi.mocked(CalendarAccountService.storeNewAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)

    const { cookieValue, queryState } = makeStateCookie('S'.repeat(40))
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=${encodeURIComponent(queryState)}`, {
      headers: { cookie: `calendar_oauth_state=${cookieValue}` },
    })
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/intern/settings/profile?calendar=connected')
    expect(CalendarAccountService.storeNewAccount).toHaveBeenCalled()
  })

  it('redirects with store_failed when storeNewAccount throws', async () => {
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarGoogleClient.exchangeCode).mockResolvedValueOnce({
      accessToken: 'AT', refreshToken: 'RT', expiresInSec: 3600,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    vi.mocked(CalendarGoogleClient.listCalendars).mockResolvedValueOnce([
      { id: 'primary', summary: 'X', isPrimary: true },
    ])
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)
    vi.mocked(CalendarAccountService.storeNewAccount).mockRejectedValueOnce(new Error('db error'))

    const { cookieValue, queryState } = makeStateCookie('S'.repeat(40))
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=${encodeURIComponent(queryState)}`, {
      headers: { cookie: `calendar_oauth_state=${cookieValue}` },
    })
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=store_failed')
    expect(CalendarGoogleClient.revokeToken).toHaveBeenCalledWith('RT')
  })

  it('returns 302 feature_disabled redirect when not configured', async () => {
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(false)
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=anything`)
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=feature_disabled')
  })

  it('rejects mismatched state', async () => {
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=wrong`, {
      headers: { cookie: `calendar_oauth_state=different` },
    })
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('rejects when state cookie is missing', async () => {
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=anything`)
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })
})

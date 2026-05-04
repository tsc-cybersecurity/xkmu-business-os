import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
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
      appointmentTokenSecret: '0'.repeat(40),
    }),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}))

describe('GET /api/google-calendar/oauth/start', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects to Google with state cookie set', async () => {
    const { getAuthContext } = await import('@/lib/auth/auth-context')
    vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'u-1', role: 'owner' } as never)
    const { GET } = await import('@/app/api/google-calendar/oauth/start/route')
    const req = new Request('https://app.x/api/google-calendar/oauth/start')
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    const location = res.headers.get('location')!
    expect(location).toMatch(/^https:\/\/accounts\.google\.com\//)
    expect(location).toContain('access_type=offline')
    expect(location).toContain('prompt=consent')
    expect(location).toContain('client_id=cid')
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/calendar_oauth_state=/)
    expect(setCookie).toMatch(/HttpOnly/)
  })

  it('returns 401 when not authenticated', async () => {
    const { getAuthContext } = await import('@/lib/auth/auth-context')
    vi.mocked(getAuthContext).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/google-calendar/oauth/start/route')
    const res = await GET(new Request('https://app.x/api/google-calendar/oauth/start') as never)
    expect(res.status).toBe(401)
  })

  it('returns 503 feature_not_configured when credentials missing', async () => {
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(false)
    const { getAuthContext } = await import('@/lib/auth/auth-context')
    vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'u-1', role: 'owner' } as never)
    const { GET } = await import('@/app/api/google-calendar/oauth/start/route')
    const res = await GET(new Request('https://app.x/api/google-calendar/oauth/start') as never)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('feature_not_configured')
  })
})

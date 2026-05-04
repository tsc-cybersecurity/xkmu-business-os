import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
}))

describe('GET /api/google-calendar/oauth/start', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret'
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.x/cb'
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    process.env.APPOINTMENT_TOKEN_SECRET = '0'.repeat(40)
    process.env.APP_PUBLIC_URL = 'https://app.x'
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
})

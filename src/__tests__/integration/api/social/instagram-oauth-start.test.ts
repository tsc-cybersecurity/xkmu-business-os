import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req: unknown, mod: unknown, action: unknown, handler: (auth: { userId: string; role: string }) => unknown) =>
    handler({ userId: 'u1', role: 'owner' }),
  ),
}))

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      appointmentTokenSecret: 's'.repeat(64),
      tokenEncryptionKeyHex: 'a'.repeat(64),
    }),
  },
}))

describe('GET /api/social/instagram/oauth/start', () => {
  beforeEach(() => {
    process.env.INSTAGRAM_APP_ID = 'ig_app_1'
    process.env.INSTAGRAM_APP_SECRET = 'ig_sec_1'
    process.env.INSTAGRAM_OAUTH_REDIRECT_URI = 'https://example.com/cb'
    vi.resetModules()
  })

  it('returns 302 to instagram.com/oauth/authorize with state when env set', async () => {
    const { GET } = await import('@/app/api/social/instagram/oauth/start/route')
    const res = await GET(new Request('https://app/api/social/instagram/oauth/start') as never)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('instagram.com')
    expect(loc).toContain('client_id=ig_app_1')
    expect(loc).toMatch(/state=[A-Za-z0-9_\-.%]+/)
  })

  it('returns 302 redirect to settings with instagram_not_configured when env missing', async () => {
    delete process.env.INSTAGRAM_APP_ID
    const { GET } = await import('@/app/api/social/instagram/oauth/start/route')
    const res = await GET(new Request('https://app/api/social/instagram/oauth/start') as never)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=instagram_not_configured')
  })
})

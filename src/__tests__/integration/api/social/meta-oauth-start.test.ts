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

vi.mock('@/lib/services/cms-design.service', () => ({
  CmsDesignService: { getAppUrl: vi.fn().mockResolvedValue('https://app.example.com') },
}))

describe('GET /api/social/meta/oauth/start', () => {
  beforeEach(() => {
    process.env.META_APP_ID = 'app1'
    process.env.META_APP_SECRET = 'sec1'
    process.env.META_OAUTH_REDIRECT_URI = 'https://example.com/cb'
    vi.resetModules()
  })

  it('returns 302 to facebook.com/.../dialog/oauth with state', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/start/route')
    const res = await GET(new Request('https://app/api/social/meta/oauth/start') as never)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('facebook.com')
    expect(loc).toContain('client_id=app1')
    expect(loc).toMatch(/state=[A-Za-z0-9_\-.]+/)
  })
})

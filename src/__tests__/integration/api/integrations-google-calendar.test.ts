import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: {
    getConfig: vi.fn(),
    updateCredentials: vi.fn(),
    isConfigured: vi.fn(),
  },
}))

import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { GET, PUT } from '@/app/api/v1/integrations/google-calendar/route'

const baseConfig = {
  id: 'cfg-1',
  clientId: 'cid', clientSecret: 'longsecretXYZ',
  redirectUri: 'https://x/cb', appPublicUrl: 'https://x',
  tokenEncryptionKeyHex: '0'.repeat(64),
  appointmentTokenSecret: '0'.repeat(96),
}

describe('GET /api/v1/integrations/google-calendar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns masked secret', async () => {
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(baseConfig as never)
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(true)
    const res = await GET(new Request('https://x/api/v1/integrations/google-calendar') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clientId).toBe('cid')
    expect(body.clientSecretMasked).toBe('••••••••tXYZ')
    expect(body.isConfigured).toBe(true)
  })
})

describe('PUT /api/v1/integrations/google-calendar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates credentials when fully provided', async () => {
    vi.mocked(CalendarConfigService.updateCredentials).mockResolvedValueOnce({
      ...baseConfig, clientSecret: 'NEW',
    } as never)
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(true)
    const req = new Request('https://x/api/v1/integrations/google-calendar', {
      method: 'PUT',
      body: JSON.stringify({
        clientId: 'cid', clientSecret: 'NEW',
        redirectUri: 'https://x/cb', appPublicUrl: 'https://x',
      }),
    })
    const res = await PUT(req as never)
    expect(res.status).toBe(200)
    expect(CalendarConfigService.updateCredentials).toHaveBeenCalledWith({
      clientId: 'cid', clientSecret: 'NEW',
      redirectUri: 'https://x/cb', appPublicUrl: 'https://x',
    })
  })

  it('keeps existing secret when masked sentinel is sent back', async () => {
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(baseConfig as never)
    vi.mocked(CalendarConfigService.updateCredentials).mockResolvedValueOnce(baseConfig as never)
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(true)
    const req = new Request('https://x/api/v1/integrations/google-calendar', {
      method: 'PUT',
      body: JSON.stringify({
        clientId: 'cid', clientSecret: '••••••••tXYZ',
        redirectUri: 'https://x/cb', appPublicUrl: 'https://x',
      }),
    })
    const res = await PUT(req as never)
    expect(res.status).toBe(200)
    expect(vi.mocked(CalendarConfigService.updateCredentials).mock.calls[0][0].clientSecret).toBe('longsecretXYZ')
  })

  it('returns 400 on invalid body', async () => {
    const req = new Request('https://x/api/v1/integrations/google-calendar', {
      method: 'PUT',
      body: JSON.stringify({ redirectUri: 'not-a-url' }),
    })
    const res = await PUT(req as never)
    expect(res.status).toBe(400)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getActiveAccount: vi.fn(),
    setPrimaryCalendar: vi.fn(),
    setReadForBusy: vi.fn(),
    revoke: vi.fn(),
    listWatchedCalendars: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: {
    getConfig: vi.fn(),
    isConfigured: vi.fn(),
  },
}))

describe('GET /api/v1/calendar-account', () => {
  beforeEach(() => vi.resetModules())

  it('includes configured field in response', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce({
      id: 'cfg-1', clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://x/cb',
      appPublicUrl: 'https://x', tokenEncryptionKeyHex: '0'.repeat(64), appointmentTokenSecret: '0'.repeat(96),
    } as never)
    vi.mocked(CalendarConfigService.isConfigured).mockReturnValueOnce(true)
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account')
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(true)
  })
})

describe('PATCH /api/v1/calendar-account', () => {
  beforeEach(() => vi.resetModules())

  it('sets primary calendar', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setPrimary', googleCalendarId: 'cal-1' }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.setPrimaryCalendar).toHaveBeenCalledWith('acc-1', 'cal-1')
  })

  it('toggles read_for_busy', async () => {
    const watchedId = crypto.randomUUID()
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setReadForBusy', watchedId, readForBusy: false }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.setReadForBusy).toHaveBeenCalledWith(watchedId, 'acc-1', false)
  })

  it('returns 400 for invalid body', async () => {
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'unknown' }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 404 when no active account', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setPrimary', googleCalendarId: 'x' }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/calendar-account', () => {
  beforeEach(() => vi.resetModules())

  it('revokes active account', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { DELETE } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', { method: 'DELETE' })
    const res = await DELETE(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.revoke).toHaveBeenCalledWith('acc-1')
  })
})

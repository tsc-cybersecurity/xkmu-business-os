import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/db', () => ({ db: setupDbMock().db }))
vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    refreshAccessToken: vi.fn(),
    revokeToken: vi.fn(),
    exchangeCode: vi.fn(),
    listCalendars: vi.fn(),
  },
}))

describe('CalendarAccountService', () => {
  beforeEach(() => {
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    vi.resetModules()
  })

  it('storeNewAccount encrypts both tokens and inserts watched calendars', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'acc-1' }])
    helper.insertMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const acc = await CalendarAccountService.storeNewAccount({
      userId: 'u-1',
      googleEmail: 'tino@x.de',
      accessToken: 'AT', refreshToken: 'RT', expiresInSec: 3600,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      calendars: [
        { id: 'primary', summary: 'Tino', isPrimary: true },
        { id: 'foo', summary: 'Team', isPrimary: false },
      ],
    })
    expect(acc.id).toBe('acc-1')
    expect(helper.db.insert).toHaveBeenCalledTimes(2)
  })

  it('getValidAccessToken returns stored token when not near expiry', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      accessTokenEnc: encryptToken('AT_VALID'),
      refreshTokenEnc: encryptToken('RT'),
      tokenExpiresAt: new Date(Date.now() + 10 * 60_000), // 10 min in Zukunft
      revokedAt: null,
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const tok = await CalendarAccountService.getValidAccessToken('acc-1')
    expect(tok).toBe('AT_VALID')
  })

  it('getValidAccessToken refreshes when expiry < 60s away', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      accessTokenEnc: encryptToken('AT_OLD'),
      refreshTokenEnc: encryptToken('RT'),
      tokenExpiresAt: new Date(Date.now() + 30_000), // 30s
      revokedAt: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.refreshAccessToken).mockResolvedValueOnce({
      accessToken: 'AT_NEW', expiresInSec: 3600,
    })
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const tok = await CalendarAccountService.getValidAccessToken('acc-1')
    expect(tok).toBe('AT_NEW')
    expect(helper.db.update).toHaveBeenCalled()
  })

  it('revoke marks revoked_at and best-effort revokes upstream', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      refreshTokenEnc: encryptToken('RT'),
      revokedAt: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    await CalendarAccountService.revoke('acc-1')
    expect(helper.db.update).toHaveBeenCalled()
  })
})

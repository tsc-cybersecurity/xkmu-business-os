import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getValidAccessToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-sync.service', () => ({
  CalendarSyncService: {
    setupWatch: vi.fn(),
    stopWatch: vi.fn(),
  },
}))

describe('runCalendarSyncMaintenance', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('counts accounts touched + renews expiring channels', async () => {
    const helper = setupDbMock()
    const now = Date.now()
    helper.selectMock.mockResolvedValueOnce([
      // Token near expiry, channel still valid → refresh-only
      {
        id: 'acc-1',
        revokedAt: null,
        tokenExpiresAt: new Date(now + 5 * 60_000),
        watchChannelId: 'ch-1',
        watchExpiresAt: new Date(now + 5 * 86400_000),
      },
      // Channel expiring soon → renewed
      {
        id: 'acc-2',
        revokedAt: null,
        tokenExpiresAt: new Date(now + 3600_000),
        watchChannelId: 'ch-2',
        watchExpiresAt: new Date(now + 3600_000),
      },
    ])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    vi.mocked(CalendarSyncService.stopWatch).mockResolvedValue()
    vi.mocked(CalendarSyncService.setupWatch).mockResolvedValue()

    const { runCalendarSyncMaintenance } = await import('@/lib/services/calendar-cron.handler')
    const result = await runCalendarSyncMaintenance()

    expect(result.total).toBe(2)
    expect(result.renewed).toBe(1)
    expect(result.failed).toBe(0)
    expect(CalendarSyncService.setupWatch).toHaveBeenCalledTimes(1)
  })

  it('counts failures per account but keeps processing', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([
      { id: 'acc-1', revokedAt: null, tokenExpiresAt: new Date(Date.now() + 86400_000), watchChannelId: 'ch-1', watchExpiresAt: new Date(Date.now() + 86400_000) },
      { id: 'acc-2', revokedAt: null, tokenExpiresAt: new Date(Date.now() + 86400_000), watchChannelId: 'ch-2', watchExpiresAt: new Date(Date.now() + 86400_000) },
    ])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('AT')

    const { runCalendarSyncMaintenance } = await import('@/lib/services/calendar-cron.handler')
    const result = await runCalendarSyncMaintenance()

    expect(result.total).toBe(2)
    expect(result.failed).toBe(1)
  })
})

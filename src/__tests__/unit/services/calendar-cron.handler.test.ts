import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getValidAccessToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-sync.service', () => ({
  CalendarSyncService: {
    setupWatchCalendar: vi.fn(),
    stopWatchCalendar: vi.fn(),
  },
}))

describe('runCalendarSyncMaintenance', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('counts accounts + calendars touched + renews expiring channels (per Kalender)', async () => {
    const helper = setupDbMock()
    const now = Date.now()
    // 1. select: accounts
    helper.selectMock.mockResolvedValueOnce([
      { id: 'acc-1', revokedAt: null, tokenExpiresAt: new Date(now + 5 * 60_000) },
      { id: 'acc-2', revokedAt: null, tokenExpiresAt: new Date(now + 3600_000) },
    ])
    // 2. select watched calendars for acc-1: 1 OK channel
    helper.selectMock.mockResolvedValueOnce([
      { id: 'cal-1a', accountId: 'acc-1', readForBusy: true, watchChannelId: 'ch-1', watchExpiresAt: new Date(now + 5 * 86400_000) },
    ])
    // 3. select watched calendars for acc-2: 1 expiring channel
    helper.selectMock.mockResolvedValueOnce([
      { id: 'cal-2a', accountId: 'acc-2', readForBusy: true, watchChannelId: 'ch-2', watchExpiresAt: new Date(now + 3600_000) },
    ])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    vi.mocked(CalendarSyncService.stopWatchCalendar).mockResolvedValue()
    vi.mocked(CalendarSyncService.setupWatchCalendar).mockResolvedValue()

    const { runCalendarSyncMaintenance } = await import('@/lib/services/calendar-cron.handler')
    const result = await runCalendarSyncMaintenance()

    expect(result.totalAccounts).toBe(2)
    expect(result.totalCalendars).toBe(2)
    expect(result.renewed).toBe(1)
    expect(result.failed).toBe(0)
    expect(CalendarSyncService.setupWatchCalendar).toHaveBeenCalledTimes(1)
    expect(CalendarSyncService.setupWatchCalendar).toHaveBeenCalledWith('cal-2a')
  })

  it('counts failures per account but keeps processing', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([
      { id: 'acc-1', revokedAt: null, tokenExpiresAt: new Date(Date.now() + 86400_000) },
      { id: 'acc-2', revokedAt: null, tokenExpiresAt: new Date(Date.now() + 86400_000) },
    ])
    // acc-2 watched calendars (acc-1 wirft vor dem watched-select)
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('AT')

    const { runCalendarSyncMaintenance } = await import('@/lib/services/calendar-cron.handler')
    const result = await runCalendarSyncMaintenance()

    expect(result.totalAccounts).toBe(2)
    expect(result.failed).toBe(1)
  })
})

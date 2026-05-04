import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getById: vi.fn(),
    getValidAccessToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: {
    getConfig: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    eventsList: vi.fn(),
    channelsWatch: vi.fn(),
    channelsStop: vi.fn(),
  },
}))

const ev = (over: Partial<{ id: string; status: string; transparency: string; xkmuApptId: string | null }>) => ({
  id: over.id ?? 'e1',
  status: over.status ?? 'confirmed',
  start: new Date('2026-05-04T09:00:00Z'),
  end: new Date('2026-05-04T10:00:00Z'),
  isAllDay: false,
  transparency: (over.transparency ?? 'opaque') as 'opaque' | 'transparent',
  etag: 'tag',
  summary: 'Test',
  extendedXkmuAppointmentId: over.xkmuApptId ?? null,
})

describe('CalendarSyncService.fullSync', () => {
  beforeEach(() => vi.resetModules())

  it('paginates and persists nextSyncToken', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce(undefined)
    helper.deleteMock.mockResolvedValueOnce(undefined)
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList)
      .mockResolvedValueOnce({ events: [ev({ id: 'e1' }), ev({ id: 'e2' })] as never, nextPageToken: 'p2', nextSyncToken: null, status: 'ok' })
      .mockResolvedValueOnce({ events: [ev({ id: 'e3' })] as never, nextPageToken: null, nextSyncToken: 'tok-final', status: 'ok' })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.fullSync('acc-1', 'primary')
    expect(out.syncToken).toBe('tok-final')
    expect(out.eventCount).toBe(3)
    expect(CalendarGoogleClient.eventsList).toHaveBeenCalledTimes(2)
  })
})

describe('CalendarSyncService.incrementalSync', () => {
  beforeEach(() => vi.resetModules())

  it('returns reSynced=true on sync_token_expired and triggers fullSync', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1', primaryCalendarId: 'primary', syncToken: 'old-tok', revokedAt: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getById).mockResolvedValueOnce({
      id: 'acc-1', primaryCalendarId: 'primary', syncToken: 'old-tok', revokedAt: null,
    } as never)
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList)
      .mockResolvedValueOnce({ events: [], nextPageToken: null, nextSyncToken: null, status: 'sync_token_expired' })
      // fullSync inner call
      .mockResolvedValueOnce({ events: [ev({ id: 'e1' })] as never, nextPageToken: null, nextSyncToken: 'fresh', status: 'ok' })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.incrementalSync('acc-1')
    expect(out.reSynced).toBe(true)
  })

  it('upserts and persists new sync token on normal change', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getById).mockResolvedValueOnce({
      id: 'acc-1', primaryCalendarId: 'primary', syncToken: 'tok', revokedAt: null,
    } as never)
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList).mockResolvedValueOnce({
      events: [ev({ id: 'e1' })] as never, nextPageToken: null, nextSyncToken: 'tok-2', status: 'ok',
    })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.incrementalSync('acc-1')
    expect(out.events).toBe(1)
    expect(out.reSynced).toBe(false)
  })
})

describe('CalendarSyncService.upsertEvents', () => {
  beforeEach(() => vi.resetModules())

  it('skips events with extendedXkmuAppointmentId set', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.upsertEvents('acc-1', 'primary', [
      ev({ id: 'e1', xkmuApptId: 'appt-123' }) as never,
    ])
    expect(out.skipped).toBe(1)
    expect(out.inserted).toBe(0)
    expect(helper.db.insert).not.toHaveBeenCalled()
  })

  it('deletes events with cancelled status', async () => {
    const helper = setupDbMock()
    helper.deleteMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.upsertEvents('acc-1', 'primary', [
      ev({ id: 'e1', status: 'cancelled' }) as never,
    ])
    expect(out.deleted).toBe(1)
  })
})

describe('CalendarSyncService.setupWatch', () => {
  beforeEach(() => vi.resetModules())

  it('throws when appPublicUrl missing', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce({
      id: 'c', clientId: 'cid', clientSecret: 'sec', redirectUri: 'r',
      appPublicUrl: null, tokenEncryptionKeyHex: '0'.repeat(64), appointmentTokenSecret: 's'.repeat(64),
    } as never)
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getById).mockResolvedValueOnce({
      id: 'acc-1', primaryCalendarId: 'primary', revokedAt: null,
    } as never)

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await expect(CalendarSyncService.setupWatch('acc-1')).rejects.toThrow(/app_public_url|appPublicUrl/i)
  })

  it('calls channelsWatch and persists IDs', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce({
      id: 'c', clientId: 'cid', clientSecret: 'sec', redirectUri: 'r',
      appPublicUrl: 'https://app.x', tokenEncryptionKeyHex: '0'.repeat(64), appointmentTokenSecret: 's'.repeat(64),
    } as never)
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getById).mockResolvedValueOnce({
      id: 'acc-1', primaryCalendarId: 'primary', revokedAt: null,
    } as never)
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValueOnce('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.channelsWatch).mockResolvedValueOnce({
      channelId: 'ch-X', resourceId: 'res-X', expirationMs: Date.now() + 7 * 86400_000,
    })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await CalendarSyncService.setupWatch('acc-1')
    expect(CalendarGoogleClient.channelsWatch).toHaveBeenCalled()
    expect(helper.db.update).toHaveBeenCalled()
  })
})

describe('CalendarSyncService.stopWatch', () => {
  beforeEach(() => vi.resetModules())

  it('is no-op when watchChannelId is null', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getById).mockResolvedValueOnce({
      id: 'acc-1', watchChannelId: null, watchResourceId: null,
    } as never)
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await CalendarSyncService.stopWatch('acc-1')
    expect(CalendarGoogleClient.channelsStop).not.toHaveBeenCalled()
  })
})

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

// Watched-row helper — Migration 025 schema
const watchedRow = (over: Partial<{ id: string; accountId: string; googleCalendarId: string; syncToken: string | null; watchChannelId: string | null; watchResourceId: string | null; readForBusy: boolean }>) => ({
  id: over.id ?? 'cal-1',
  accountId: over.accountId ?? 'acc-1',
  googleCalendarId: over.googleCalendarId ?? 'primary',
  displayName: 'X',
  readForBusy: over.readForBusy ?? true,
  syncToken: over.syncToken ?? null,
  watchChannelId: over.watchChannelId ?? null,
  watchResourceId: over.watchResourceId ?? null,
  watchExpiresAt: null,
  lastMessageNumber: null,
  lastSyncedAt: null,
  createdAt: new Date(),
})

describe('CalendarSyncService.fullSyncCalendar', () => {
  beforeEach(() => vi.resetModules())

  it('paginates and persists nextSyncToken on the watched-calendar row', async () => {
    const helper = setupDbMock()
    // 1. select for getWatchedById in fullSyncCalendar
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', accountId: 'acc-1' })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList)
      .mockResolvedValueOnce({ events: [ev({ id: 'e1' }), ev({ id: 'e2' })] as never, nextPageToken: 'p2', nextSyncToken: null, status: 'ok' })
      .mockResolvedValueOnce({ events: [ev({ id: 'e3' })] as never, nextPageToken: null, nextSyncToken: 'tok-final', status: 'ok' })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.fullSyncCalendar('acc-1', 'cal-1')
    expect(out.events).toBe(3)
    expect(CalendarGoogleClient.eventsList).toHaveBeenCalledTimes(2)
    expect(helper.db.update).toHaveBeenCalled()
  })
})

describe('CalendarSyncService.incrementalSyncCalendar', () => {
  beforeEach(() => vi.resetModules())

  it('returns reSynced=true on sync_token_expired and triggers fullSync', async () => {
    const helper = setupDbMock()
    // 1. getWatchedById in incrementalSyncCalendar
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', accountId: 'acc-1', syncToken: 'old-tok' })])
    // 2. getWatchedById nested call in fullSyncCalendar (after re-sync trigger)
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', accountId: 'acc-1' })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList)
      .mockResolvedValueOnce({ events: [], nextPageToken: null, nextSyncToken: null, status: 'sync_token_expired' })
      .mockResolvedValueOnce({ events: [ev({ id: 'e1' })] as never, nextPageToken: null, nextSyncToken: 'fresh', status: 'ok' })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.incrementalSyncCalendar('cal-1')
    expect(out.reSynced).toBe(true)
  })

  it('upserts and persists new sync token on normal change', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', accountId: 'acc-1', syncToken: 'tok' })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList).mockResolvedValueOnce({
      events: [ev({ id: 'e1' })] as never, nextPageToken: null, nextSyncToken: 'tok-2', status: 'ok',
    })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.incrementalSyncCalendar('cal-1')
    expect(out.events).toBe(1)
    expect(out.reSynced).toBe(false)
  })
})

describe('CalendarSyncService.upsertEvents', () => {
  beforeEach(() => vi.resetModules())

  it('upserts auch Events mit extendedXkmuAppointmentId (orphaned-Schutz)', async () => {
    // Frueher hat upsertEvents Events mit xkmu_appointment_id geskipped.
    // Das fuehrte zu orphaned Slots: appointments-Row geloescht, Google-
    // Event blieb, sync schickte das Event nicht in external_busy →
    // Slot blieb buchbar. Heute syncen wir alle Events.
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.upsertEvents('acc-1', 'primary', [
      ev({ id: 'e1', xkmuApptId: 'appt-123' }) as never,
    ])
    expect(out.inserted).toBe(1)
    expect(out.skipped).toBe(0)
    expect(helper.db.insert).toHaveBeenCalled()
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

describe('CalendarSyncService.setupWatchCalendar', () => {
  beforeEach(() => vi.resetModules())

  it('throws when appPublicUrl missing', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1' })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce({
      id: 'c', clientId: 'cid', clientSecret: 'sec', redirectUri: 'r',
      appPublicUrl: null, tokenEncryptionKeyHex: '0'.repeat(64), appointmentTokenSecret: 's'.repeat(64),
    } as never)

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await expect(CalendarSyncService.setupWatchCalendar('cal-1')).rejects.toThrow(/app_public_url|appPublicUrl/i)
  })

  it('calls channelsWatch and persists IDs on the watched-calendar row', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1' })])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce({
      id: 'c', clientId: 'cid', clientSecret: 'sec', redirectUri: 'r',
      appPublicUrl: 'https://app.x', tokenEncryptionKeyHex: '0'.repeat(64), appointmentTokenSecret: 's'.repeat(64),
    } as never)
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValueOnce('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.channelsWatch).mockResolvedValueOnce({
      channelId: 'ch-X', resourceId: 'res-X', expirationMs: Date.now() + 7 * 86400_000,
    })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await CalendarSyncService.setupWatchCalendar('cal-1')
    expect(CalendarGoogleClient.channelsWatch).toHaveBeenCalled()
    expect(helper.db.update).toHaveBeenCalled()
  })
})

describe('CalendarSyncService.stopWatchCalendar', () => {
  beforeEach(() => vi.resetModules())

  it('is no-op when watchChannelId is null', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', watchChannelId: null })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    await CalendarSyncService.stopWatchCalendar('cal-1')
    expect(CalendarGoogleClient.channelsStop).not.toHaveBeenCalled()
  })
})

describe('CalendarSyncService account-shims iterieren ueber alle readForBusy=true Kalender', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('fullSyncAccount syncs jede watched-calendar, nicht nur primary', async () => {
    const helper = setupDbMock()
    // 1. listSyncableForAccount
    helper.selectMock.mockResolvedValueOnce([
      watchedRow({ id: 'cal-1', googleCalendarId: 'primary' }),
      watchedRow({ id: 'cal-2', googleCalendarId: 'private@gmail.com' }),
    ])
    // 2 + 3. getWatchedById in fullSyncCalendar — einmal pro Iteration
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-1', googleCalendarId: 'primary' })])
    helper.selectMock.mockResolvedValueOnce([watchedRow({ id: 'cal-2', googleCalendarId: 'private@gmail.com' })])

    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsList)
      .mockResolvedValueOnce({ events: [ev({ id: 'a' })] as never, nextPageToken: null, nextSyncToken: 'tok-A', status: 'ok' })
      .mockResolvedValueOnce({ events: [ev({ id: 'b' })] as never, nextPageToken: null, nextSyncToken: 'tok-B', status: 'ok' })

    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    const out = await CalendarSyncService.fullSyncAccount('acc-1')
    expect(out.calendars).toBe(2)
    expect(out.events).toBe(2)
    expect(CalendarGoogleClient.eventsList).toHaveBeenCalledTimes(2)
  })
})

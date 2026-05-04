import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn() },
}))
vi.mock('@/lib/services/calendar-sync.service', () => ({
  CalendarSyncService: { incrementalSync: vi.fn() },
}))

const mockConfig = {
  id: 'c', clientId: 'cid', clientSecret: 'sec', redirectUri: 'r',
  appPublicUrl: 'https://app.x',
  tokenEncryptionKeyHex: '0'.repeat(64),
  appointmentTokenSecret: 'CHANNEL-SECRET',
}

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://app.x/api/google-calendar/webhook', { method: 'POST', headers })
}

describe('POST /api/google-calendar/webhook', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns 200 silently on resource-state=sync (initial)', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'acc-1', watchChannelId: 'ch-1', lastMessageNumber: null }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(mockConfig as never)

    const { POST } = await import('@/app/api/google-calendar/webhook/route')
    const res = await POST(makeRequest({
      'X-Goog-Channel-Id': 'ch-1',
      'X-Goog-Channel-Token': 'CHANNEL-SECRET',
      'X-Goog-Resource-State': 'sync',
      'X-Goog-Resource-Id': 'res-1',
      'X-Goog-Message-Number': '1',
    }) as never)
    expect(res.status).toBe(200)
  })

  it('triggers incrementalSync on resource-state=exists', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'acc-1', watchChannelId: 'ch-1', lastMessageNumber: null }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(mockConfig as never)
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')
    vi.mocked(CalendarSyncService.incrementalSync).mockResolvedValueOnce({ events: 1, channelExpired: false, reSynced: false })

    const { POST } = await import('@/app/api/google-calendar/webhook/route')
    const res = await POST(makeRequest({
      'X-Goog-Channel-Id': 'ch-1',
      'X-Goog-Channel-Token': 'CHANNEL-SECRET',
      'X-Goog-Resource-State': 'exists',
      'X-Goog-Resource-Id': 'res-1',
      'X-Goog-Message-Number': '5',
    }) as never)
    expect(res.status).toBe(200)
    expect(CalendarSyncService.incrementalSync).toHaveBeenCalledWith('acc-1')
  })

  it('returns 404 when channel-id does not match an account', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])  // no account
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(mockConfig as never)

    const { POST } = await import('@/app/api/google-calendar/webhook/route')
    const res = await POST(makeRequest({
      'X-Goog-Channel-Id': 'ch-unknown',
      'X-Goog-Channel-Token': 'CHANNEL-SECRET',
      'X-Goog-Resource-State': 'exists',
      'X-Goog-Resource-Id': 'res-1',
      'X-Goog-Message-Number': '1',
    }) as never)
    expect(res.status).toBe(404)
  })

  it('returns 401 on token mismatch', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'acc-1', watchChannelId: 'ch-1', lastMessageNumber: null }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(mockConfig as never)

    const { POST } = await import('@/app/api/google-calendar/webhook/route')
    const res = await POST(makeRequest({
      'X-Goog-Channel-Id': 'ch-1',
      'X-Goog-Channel-Token': 'WRONG-SECRET',
      'X-Goog-Resource-State': 'exists',
      'X-Goog-Resource-Id': 'res-1',
      'X-Goog-Message-Number': '1',
    }) as never)
    expect(res.status).toBe(401)
  })

  it('skips when message-number <= lastMessageNumber (idempotency)', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'acc-1', watchChannelId: 'ch-1', lastMessageNumber: 10 }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarConfigService } = await import('@/lib/services/calendar-config.service')
    vi.mocked(CalendarConfigService.getConfig).mockResolvedValueOnce(mockConfig as never)
    const { CalendarSyncService } = await import('@/lib/services/calendar-sync.service')

    const { POST } = await import('@/app/api/google-calendar/webhook/route')
    const res = await POST(makeRequest({
      'X-Goog-Channel-Id': 'ch-1',
      'X-Goog-Channel-Token': 'CHANNEL-SECRET',
      'X-Goog-Resource-State': 'exists',
      'X-Goog-Resource-Id': 'res-1',
      'X-Goog-Message-Number': '8',  // older than 10
    }) as never)
    expect(res.status).toBe(200)
    expect(CalendarSyncService.incrementalSync).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const CONFIG = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'https://app.x/cb',
}

const fetchMock = vi.fn()

describe('calendar-google.client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('exchangeCode posts to Google token endpoint and returns parsed tokens', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: 'AT', refresh_token: 'RT', expires_in: 3600, scope: 'https://www.googleapis.com/auth/calendar',
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const tokens = await CalendarGoogleClient.exchangeCode('CODE', CONFIG)
    expect(tokens.accessToken).toBe('AT')
    expect(tokens.refreshToken).toBe('RT')
    expect(tokens.expiresInSec).toBe(3600)
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('https://oauth2.googleapis.com/token')
    expect(call[1].method).toBe('POST')
  })

  it('refreshAccessToken posts refresh_token grant', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: 'NEW_AT', expires_in: 3600,
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const out = await CalendarGoogleClient.refreshAccessToken('RT', { clientId: 'cid', clientSecret: 'secret' })
    expect(out.accessToken).toBe('NEW_AT')
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('RT')
  })

  it('listCalendars returns parsed items', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        { id: 'primary', summary: 'Tino', primary: true },
        { id: 'foo@group.calendar.google.com', summary: 'Team' },
      ],
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const cals = await CalendarGoogleClient.listCalendars('AT')
    expect(cals).toHaveLength(2)
    expect(cals[0].id).toBe('primary')
    expect(cals[0].isPrimary).toBe(true)
  })

  it('throws on non-2xx response with body excerpt', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"invalid_grant"}', { status: 400 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await expect(CalendarGoogleClient.refreshAccessToken('bad', { clientId: 'cid', clientSecret: 'secret' })).rejects.toThrow(/invalid_grant/)
  })

  it('revokeToken posts to revoke endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await CalendarGoogleClient.revokeToken('AT')
    expect(fetchMock.mock.calls[0][0]).toMatch(/revoke/)
  })
})

describe('CalendarGoogleClient.eventsList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('returns parsed events with start, end, transparency, summary', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        {
          id: 'ev1', status: 'confirmed', etag: 'tag1', summary: 'Meeting',
          start: { dateTime: '2026-05-04T09:00:00Z' },
          end:   { dateTime: '2026-05-04T10:00:00Z' },
          transparency: 'opaque',
        },
        {
          id: 'ev2', status: 'cancelled', etag: 'tag2',
        },
        {
          id: 'ev3', status: 'confirmed', etag: 'tag3', summary: 'All-day',
          start: { date: '2026-05-04' },
          end:   { date: '2026-05-05' },
        },
      ],
      nextSyncToken: 'sync-tok-1',
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const out = await CalendarGoogleClient.eventsList({ accessToken: 'AT', calendarId: 'primary' })
    expect(out.status).toBe('ok')
    expect(out.events).toHaveLength(3)
    expect(out.events[0].id).toBe('ev1')
    expect(out.events[0].start).toBeInstanceOf(Date)
    expect(out.events[1].status).toBe('cancelled')
    expect(out.events[1].start).toBeNull()
    expect(out.events[2].isAllDay).toBe(true)
    expect(out.nextSyncToken).toBe('sync-tok-1')
  })

  it('returns sync_token_expired status on 410', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"gone"}', { status: 410 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const out = await CalendarGoogleClient.eventsList({ accessToken: 'AT', calendarId: 'primary', syncToken: 'old' })
    expect(out.status).toBe('sync_token_expired')
    expect(out.events).toEqual([])
  })

  it('passes singleEvents=true and showDeleted=true', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await CalendarGoogleClient.eventsList({ accessToken: 'AT', calendarId: 'primary' })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('singleEvents=true')
    expect(url).toContain('showDeleted=true')
  })
})

describe('CalendarGoogleClient.channelsWatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('posts channel config and returns parsed result', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'ch-1', resourceId: 'res-abc', expiration: '1746360000000',
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const out = await CalendarGoogleClient.channelsWatch({
      accessToken: 'AT', calendarId: 'primary',
      channelId: 'ch-1', webhookUrl: 'https://app.x/api/google-calendar/webhook',
      channelToken: 'tok',
    })
    expect(out.channelId).toBe('ch-1')
    expect(out.resourceId).toBe('res-abc')
    expect(out.expirationMs).toBe(1746360000000)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.id).toBe('ch-1')
    expect(body.type).toBe('web_hook')
    expect(body.address).toBe('https://app.x/api/google-calendar/webhook')
    expect(body.token).toBe('tok')
  })
})

describe('CalendarGoogleClient.channelsStop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('accepts 200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await CalendarGoogleClient.channelsStop({ accessToken: 'AT', channelId: 'ch-1', resourceId: 'r-1' })
    expect(fetchMock.mock.calls[0][0]).toContain('/channels/stop')
  })

  it('silently accepts 404 (channel already gone)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await CalendarGoogleClient.channelsStop({ accessToken: 'AT', channelId: 'ch-1', resourceId: 'r-1' })
    // no throw
  })

  it('throws on other 4xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"forbidden"}', { status: 403 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await expect(
      CalendarGoogleClient.channelsStop({ accessToken: 'AT', channelId: 'ch-1', resourceId: 'r-1' })
    ).rejects.toThrow()
  })
})

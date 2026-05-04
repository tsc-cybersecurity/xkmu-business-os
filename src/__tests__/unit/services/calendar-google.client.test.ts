import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const CONFIG = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'https://app.x/cb',
}

describe('calendar-google.client', () => {
  const fetchMock = vi.fn()

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

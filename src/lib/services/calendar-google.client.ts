const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
const EVENTS_LIST_URL = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
const EVENTS_WATCH_URL = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`
const CHANNELS_STOP_URL = 'https://www.googleapis.com/calendar/v3/channels/stop'

export interface OauthClientConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface ExchangeResult {
  accessToken: string
  refreshToken: string
  expiresInSec: number
  scopes: string[]
}

export interface RefreshResult {
  accessToken: string
  expiresInSec: number
}

export interface CalendarListEntry {
  id: string
  summary: string
  isPrimary: boolean
}

export interface ExternalEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  start: Date | null
  end: Date | null
  isAllDay: boolean
  transparency: 'opaque' | 'transparent'
  etag: string
  summary: string | null
  extendedXkmuAppointmentId: string | null
}

export interface EventsListResult {
  events: ExternalEvent[]
  nextSyncToken: string | null
  nextPageToken: string | null
  status: 'ok' | 'sync_token_expired'
}

export interface WatchResult {
  channelId: string
  resourceId: string
  expirationMs: number
}

async function postForm(url: string, params: URLSearchParams): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`Google API ${res.status}: ${body.slice(0, 200)}`)
}

function parseEvent(raw: any): ExternalEvent {
  const isAllDay = !!(raw.start?.date && !raw.start?.dateTime)
  const start = raw.start?.dateTime
    ? new Date(raw.start.dateTime)
    : raw.start?.date
    ? new Date(raw.start.date + 'T00:00:00Z')
    : null
  const end = raw.end?.dateTime
    ? new Date(raw.end.dateTime)
    : raw.end?.date
    ? new Date(raw.end.date + 'T00:00:00Z')
    : null
  const extendedXkmuAppointmentId =
    raw.extendedProperties?.private?.xkmu_appointment_id ?? null
  return {
    id: raw.id,
    status: (raw.status ?? 'confirmed') as ExternalEvent['status'],
    start, end, isAllDay,
    transparency: (raw.transparency === 'transparent' ? 'transparent' : 'opaque'),
    etag: raw.etag ?? '',
    summary: raw.summary ?? null,
    extendedXkmuAppointmentId,
  }
}

export const CalendarGoogleClient = {
  async exchangeCode(code: string, config: OauthClientConfig): Promise<ExchangeResult> {
    const res = await postForm(TOKEN_URL, new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }))
    await ensureOk(res)
    const json = await res.json() as {
      access_token: string; refresh_token?: string; expires_in: number; scope: string
    }
    if (!json.refresh_token) {
      throw new Error('Google did not return a refresh_token (consent likely already given — re-run with prompt=consent)')
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresInSec: json.expires_in,
      scopes: json.scope.split(' ').filter(Boolean),
    }
  },

  async refreshAccessToken(refreshToken: string, config: { clientId: string; clientSecret: string }): Promise<RefreshResult> {
    const res = await postForm(TOKEN_URL, new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }))
    await ensureOk(res)
    const json = await res.json() as { access_token: string; expires_in: number }
    return { accessToken: json.access_token, expiresInSec: json.expires_in }
  },

  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    const res = await fetch(CALENDAR_LIST_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    await ensureOk(res)
    const json = await res.json() as {
      items: Array<{ id: string; summary: string; primary?: boolean }>
    }
    return json.items.map(i => ({ id: i.id, summary: i.summary, isPrimary: i.primary === true }))
  },

  async revokeToken(token: string): Promise<void> {
    const res = await postForm(REVOKE_URL, new URLSearchParams({ token }))
    // 200 wenn ok, 400 wenn schon revoked — beides akzeptieren
    if (res.status !== 200 && res.status !== 400) {
      await ensureOk(res)
    }
  },

  async eventsList(input: {
    accessToken: string
    calendarId: string
    syncToken?: string
    pageToken?: string
  }): Promise<EventsListResult> {
    const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true' })
    if (input.syncToken) params.set('syncToken', input.syncToken)
    if (input.pageToken) params.set('pageToken', input.pageToken)
    const url = `${EVENTS_LIST_URL(input.calendarId)}?${params}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${input.accessToken}` } })
    if (res.status === 410) {
      return { events: [], nextSyncToken: null, nextPageToken: null, status: 'sync_token_expired' }
    }
    await ensureOk(res)
    const json = await res.json() as {
      items?: any[]
      nextSyncToken?: string
      nextPageToken?: string
    }
    return {
      events: (json.items ?? []).map(parseEvent),
      nextSyncToken: json.nextSyncToken ?? null,
      nextPageToken: json.nextPageToken ?? null,
      status: 'ok',
    }
  },

  async channelsWatch(input: {
    accessToken: string
    calendarId: string
    channelId: string
    webhookUrl: string
    channelToken: string
    ttlSeconds?: number
  }): Promise<WatchResult> {
    const body = {
      id: input.channelId,
      type: 'web_hook',
      address: input.webhookUrl,
      token: input.channelToken,
      ...(input.ttlSeconds ? { params: { ttl: String(input.ttlSeconds) } } : {}),
    }
    const res = await fetch(EVENTS_WATCH_URL(input.calendarId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    await ensureOk(res)
    const json = await res.json() as { id: string; resourceId: string; expiration: string }
    return {
      channelId: json.id,
      resourceId: json.resourceId,
      expirationMs: parseInt(json.expiration, 10),
    }
  },

  async channelsStop(input: {
    accessToken: string
    channelId: string
    resourceId: string
  }): Promise<void> {
    const res = await fetch(CHANNELS_STOP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: input.channelId, resourceId: input.resourceId }),
    })
    if (res.status === 200 || res.status === 404) return
    await ensureOk(res)
  },
}

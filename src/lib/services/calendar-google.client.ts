const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'

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
}

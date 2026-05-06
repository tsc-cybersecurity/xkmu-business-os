const AUTHORIZE_BASE = 'https://www.instagram.com/oauth/authorize'
const TOKEN_BASE = 'https://api.instagram.com/oauth/access_token'
const GRAPH_IG = 'https://graph.instagram.com'

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
]

export interface InstagramAccountInfo {
  igUserId: string
  igUsername: string
}

function appConfig() {
  const id = process.env.INSTAGRAM_APP_ID
  const secret = process.env.INSTAGRAM_APP_SECRET
  const redirect = process.env.INSTAGRAM_OAUTH_REDIRECT_URI
  if (!id || !secret || !redirect) throw new Error('instagram_oauth_env_missing')
  return { id, secret, redirect }
}

async function igFetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error_message ?? `instagram_http_${res.status}`
    throw new Error(msg)
  }
  return body
}

export const InstagramOAuthClient = {
  buildAuthorizeUrl(state: string): string {
    const cfg = appConfig()
    const params = new URLSearchParams({
      client_id: cfg.id,
      redirect_uri: cfg.redirect,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    })
    return `${AUTHORIZE_BASE}?${params.toString()}`
  },

  async exchangeCode(code: string): Promise<{ accessToken: string; igUserId: string }> {
    const cfg = appConfig()
    const body = new URLSearchParams({
      client_id: cfg.id,
      client_secret: cfg.secret,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirect,
      code,
    })
    const json = await igFetchJson(TOKEN_BASE, { method: 'POST', body })
    return { accessToken: json.access_token, igUserId: String(json.user_id) }
  },

  async exchangeForLongLived(shortToken: string): Promise<{ accessToken: string; expiresInSec: number }> {
    const cfg = appConfig()
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: cfg.secret,
      access_token: shortToken,
    })
    const json = await igFetchJson(`${GRAPH_IG}/access_token?${params.toString()}`)
    return { accessToken: json.access_token, expiresInSec: Number(json.expires_in ?? 0) }
  },

  async getUserInfo(longToken: string): Promise<InstagramAccountInfo> {
    const params = new URLSearchParams({ fields: 'id,username', access_token: longToken })
    const json = await igFetchJson(`${GRAPH_IG}/me?${params.toString()}`)
    return { igUserId: String(json.id), igUsername: json.username }
  },
}

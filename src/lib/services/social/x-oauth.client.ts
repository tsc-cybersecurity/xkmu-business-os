// X (formerly Twitter) OAuth 2.0 with PKCE.
// Doku: https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/
// Wir nutzen den User-Context-Flow (3-legged) — same shape wie Instagram Direct
// Login, aber mit PKCE statt App-Secret-Exchange. Der Refresh-Token erlaubt
// laufendes Renewal des access_token (default 2h Lifetime).

import { createHash, randomBytes } from 'crypto'

const AUTHORIZE_BASE = 'https://x.com/i/oauth2/authorize'
const TOKEN_BASE = 'https://api.x.com/2/oauth2/token'
const API_BASE = 'https://api.x.com/2'

// tweet.write fuer Posten, users.read fuer Username-Resolution,
// offline.access fuer refresh_token. tweet.read ist nicht zwingend, vereinfacht
// aber lokales Debugging falls man mal einen Tweet rueckwaerts lesen will.
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
]

export interface XAccountInfo {
  userId: string
  username: string
  name: string | null
}

function appConfig() {
  const id = process.env.X_CLIENT_ID
  const secret = process.env.X_CLIENT_SECRET
  const redirect = process.env.X_OAUTH_REDIRECT_URI
  if (!id || !secret || !redirect) throw new Error('x_oauth_env_missing')
  return { id, secret, redirect }
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * PKCE-Verifier: 32 zufaellige Bytes → 43 Zeichen base64url.
 * Challenge: SHA-256-Hash des verifier, ebenfalls base64url.
 */
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32))
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

async function xFetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // X-API liefert teils {error}, teils {detail}, teils {errors:[{message}]}
    const msg = body?.error_description
      ?? body?.error
      ?? body?.detail
      ?? body?.errors?.[0]?.message
      ?? `x_http_${res.status}`
    throw new Error(String(msg))
  }
  return body
}

export const XOAuthClient = {
  buildAuthorizeUrl(state: string, codeChallenge: string): string {
    const cfg = appConfig()
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.id,
      redirect_uri: cfg.redirect,
      scope: SCOPES.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    return `${AUTHORIZE_BASE}?${params.toString()}`
  },

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string
    refreshToken: string | null
    expiresInSec: number
  }> {
    const cfg = appConfig()
    const basic = Buffer.from(`${cfg.id}:${cfg.secret}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirect,
      code_verifier: codeVerifier,
      client_id: cfg.id,
    })
    const json = await xFetchJson(TOKEN_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    })
    return {
      accessToken: String(json.access_token),
      refreshToken: json.refresh_token ? String(json.refresh_token) : null,
      expiresInSec: Number(json.expires_in ?? 0),
    }
  },

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    refreshToken: string | null
    expiresInSec: number
  }> {
    const cfg = appConfig()
    const basic = Buffer.from(`${cfg.id}:${cfg.secret}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: cfg.id,
    })
    const json = await xFetchJson(TOKEN_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    })
    return {
      accessToken: String(json.access_token),
      refreshToken: json.refresh_token ? String(json.refresh_token) : null,
      expiresInSec: Number(json.expires_in ?? 0),
    }
  },

  async getUserInfo(accessToken: string): Promise<XAccountInfo> {
    const json = await xFetchJson(`${API_BASE}/users/me?user.fields=username,name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = json?.data
    if (!data?.id) throw new Error('x_user_info_missing')
    return {
      userId: String(data.id),
      username: String(data.username),
      name: data.name ? String(data.name) : null,
    }
  },
}

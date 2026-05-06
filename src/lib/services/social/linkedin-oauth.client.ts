// LinkedIn OAuth 2.0 (3-legged) + OIDC userinfo.
// Doku: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
// Setup im LinkedIn-Developer-Portal: Produkt "Sign In with LinkedIn using
// OpenID Connect" + "Share on LinkedIn" hinzufuegen, damit die Scopes verfuegbar
// sind. Fuer reines Posten (keine Targeting-Daten/Marketing-API) reicht das.

const AUTHORIZE_BASE = 'https://www.linkedin.com/oauth/v2/authorization'
const TOKEN_BASE = 'https://www.linkedin.com/oauth/v2/accessToken'
const USERINFO_BASE = 'https://api.linkedin.com/v2/userinfo'

const SCOPES = [
  'openid',         // OIDC base
  'profile',        // Name, ID
  'email',          // E-Mail (Anzeige)
  'w_member_social' // Post on behalf of user
]

export interface LinkedInUserInfo {
  /** OIDC-sub == LinkedIn Member-ID. Wird als urn:li:person:{sub} fuer Posting verwendet. */
  sub: string
  name: string
  email?: string
  picture?: string
}

function appConfig() {
  const id = process.env.LINKEDIN_CLIENT_ID
  const secret = process.env.LINKEDIN_CLIENT_SECRET
  const redirect = process.env.LINKEDIN_OAUTH_REDIRECT_URI
  if (!id || !secret || !redirect) throw new Error('linkedin_oauth_env_missing')
  return { id, secret, redirect }
}

async function liFetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.error_description
      ?? body?.error
      ?? body?.message
      ?? `linkedin_http_${res.status}`
    throw new Error(String(msg))
  }
  return body
}

export const LinkedInOAuthClient = {
  buildAuthorizeUrl(state: string): string {
    const cfg = appConfig()
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.id,
      redirect_uri: cfg.redirect,
      state,
      scope: SCOPES.join(' '),
    })
    return `${AUTHORIZE_BASE}?${params.toString()}`
  },

  async exchangeCode(code: string): Promise<{
    accessToken: string
    expiresInSec: number
    refreshToken: string | null
    refreshTokenExpiresInSec: number | null
  }> {
    const cfg = appConfig()
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirect,
      client_id: cfg.id,
      client_secret: cfg.secret,
    })
    const json = await liFetchJson(TOKEN_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    return {
      accessToken: String(json.access_token),
      expiresInSec: Number(json.expires_in ?? 0),
      refreshToken: json.refresh_token ? String(json.refresh_token) : null,
      refreshTokenExpiresInSec: json.refresh_token_expires_in
        ? Number(json.refresh_token_expires_in)
        : null,
    }
  },

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const json = await liFetchJson(USERINFO_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!json?.sub) throw new Error('linkedin_userinfo_missing_sub')
    return {
      sub: String(json.sub),
      name: String(json.name ?? ''),
      email: json.email ? String(json.email) : undefined,
      picture: json.picture ? String(json.picture) : undefined,
    }
  },
}

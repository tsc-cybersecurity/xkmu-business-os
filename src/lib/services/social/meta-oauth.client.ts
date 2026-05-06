const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const DIALOG_BASE = 'https://www.facebook.com/v19.0/dialog/oauth'

// Meta renamed Instagram permissions in 2024:
//   instagram_basic           → instagram_business_basic
//   instagram_content_publish → instagram_business_content_publish
// Both must be enabled in the Meta App's "Berechtigungen und Features" page.
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_business_basic',
  'instagram_business_content_publish',
]

export interface MetaPageWithIg {
  pageId: string
  pageName: string
  pageAccessToken: string
  igUserId: string | null
  igUsername: string | null
}

function appConfig() {
  const id = process.env.META_APP_ID
  const secret = process.env.META_APP_SECRET
  const redirect = process.env.META_OAUTH_REDIRECT_URI
  if (!id || !secret || !redirect) throw new Error('meta_oauth_env_missing')
  return { id, secret, redirect }
}

async function metaFetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.error?.message ?? `meta_http_${res.status}`
    throw new Error(msg)
  }
  return body
}

export const MetaOAuthClient = {
  buildAuthorizeUrl(state: string): string {
    const cfg = appConfig()
    const params = new URLSearchParams({
      client_id: cfg.id,
      redirect_uri: cfg.redirect,
      state,
      response_type: 'code',
      scope: SCOPES.join(','),
    })
    return `${DIALOG_BASE}?${params.toString()}`
  },

  async exchangeCode(code: string): Promise<{ accessToken: string; expiresInSec: number }> {
    const cfg = appConfig()
    const params = new URLSearchParams({
      client_id: cfg.id,
      client_secret: cfg.secret,
      redirect_uri: cfg.redirect,
      code,
    })
    const body = await metaFetchJson(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`)
    return { accessToken: body.access_token, expiresInSec: Number(body.expires_in ?? 0) }
  },

  async exchangeForLongLived(shortLivedToken: string): Promise<{ accessToken: string; expiresInSec: number }> {
    const cfg = appConfig()
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: cfg.id,
      client_secret: cfg.secret,
      fb_exchange_token: shortLivedToken,
    })
    const body = await metaFetchJson(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`)
    return { accessToken: body.access_token, expiresInSec: Number(body.expires_in ?? 0) }
  },

  async listPagesWithIg(longUserToken: string): Promise<MetaPageWithIg[]> {
    const me = await metaFetchJson(`${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(longUserToken)}`)
    const pages = (me.data ?? []) as Array<{ id: string; name: string; access_token: string }>

    // Phase 1: fetch instagram_business_account for every page
    const igLinks = await Promise.all(
      pages.map((p) =>
        metaFetchJson(
          `${GRAPH_BASE}/${p.id}?fields=instagram_business_account&access_token=${encodeURIComponent(p.access_token)}`
        )
      )
    )

    // Phase 2: fetch IG usernames for pages that have a linked IG account
    const out: MetaPageWithIg[] = []
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]
      const igId: string | null = igLinks[i]?.instagram_business_account?.id ?? null
      let igUsername: string | null = null
      if (igId) {
        const ig = await metaFetchJson(
          `${GRAPH_BASE}/${igId}?fields=username&access_token=${encodeURIComponent(p.access_token)}`
        )
        igUsername = ig?.username ?? null
      }
      out.push({
        pageId: p.id, pageName: p.name, pageAccessToken: p.access_token,
        igUserId: igId, igUsername,
      })
    }
    return out
  },
}

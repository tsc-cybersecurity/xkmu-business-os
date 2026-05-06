const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const DIALOG_BASE = 'https://www.facebook.com/v19.0/dialog/oauth'

// FB-Page permissions only (V1).
// Instagram-Posten kommt in einer späteren Phase, wenn Meta-Use-Cases / App-Review
// klar sind. Aktuelles Setup: nur FB-Page-Connect (instagram_business_basic /
// instagram_business_content_publish werden von Meta für unsere App-Konfiguration
// nicht akzeptiert; der IG-Lookup unten funktioniert mit den page_*-Scopes).
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
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

    // Phase 1: fetch instagram_business_account for every page.
    // IG lookups may fail if the app lacks instagram_* permissions — treat those
    // as "no IG linked" instead of bubbling the error up. Connect should still
    // succeed with FB-only when IG isn't accessible.
    const igLinks = await Promise.all(
      pages.map((p) =>
        metaFetchJson(
          `${GRAPH_BASE}/${p.id}?fields=instagram_business_account&access_token=${encodeURIComponent(p.access_token)}`
        ).catch(() => ({}))
      )
    )

    // Phase 2: fetch IG usernames for pages that have a linked IG account
    const out: MetaPageWithIg[] = []
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]
      const igId: string | null = igLinks[i]?.instagram_business_account?.id ?? null
      let igUsername: string | null = null
      if (igId) {
        igUsername = await metaFetchJson(
          `${GRAPH_BASE}/${igId}?fields=username&access_token=${encodeURIComponent(p.access_token)}`
        ).then((ig) => ig?.username ?? null).catch(() => null)
      }
      out.push({
        pageId: p.id, pageName: p.name, pageAccessToken: p.access_token,
        igUserId: igId, igUsername,
      })
    }
    return out
  },
}

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const DIALOG_BASE = 'https://www.facebook.com/v19.0/dialog/oauth'

// FB-Page permissions only (V1).
// `business_management` ist nötig, um Pages aufzulisten, die der User über den
// Business-Manager verwaltet (nicht in `/me/accounts` enthalten).
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'business_management',
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
    // Pfad 1: direkte Page-Admin-Pages (Personal-Account-Setup)
    const me = await metaFetchJson(`${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(longUserToken)}`)
    const directPages = (me.data ?? []) as Array<{ id: string; name: string; access_token: string }>

    // Pfad 2: Business-Manager-verwaltete Pages (owned + client) — fail-soft falls
    // business_management permission fehlt oder kein Business-Account existiert.
    const businessPages: Array<{ id: string; name: string; access_token: string }> = []
    try {
      const businesses = await metaFetchJson(
        `${GRAPH_BASE}/me/businesses?fields=id,name&access_token=${encodeURIComponent(longUserToken)}`
      )
      const bizList = (businesses.data ?? []) as Array<{ id: string; name: string }>
      for (const biz of bizList) {
        for (const path of ['owned_pages', 'client_pages']) {
          try {
            const pageRes = await metaFetchJson(
              `${GRAPH_BASE}/${biz.id}/${path}?fields=id,name,access_token&access_token=${encodeURIComponent(longUserToken)}`
            )
            const items = (pageRes.data ?? []) as Array<{ id: string; name: string; access_token?: string }>
            for (const it of items) {
              // access_token ist nur enthalten, wenn der User Admin der Page ist
              if (it.access_token) businessPages.push({ id: it.id, name: it.name, access_token: it.access_token })
            }
          } catch { /* fail-soft per business path */ }
        }
      }
    } catch (e) {
      console.log('[meta-oauth] /me/businesses skipped:', e instanceof Error ? e.message : e)
    }

    // Merge + dedupe by page id (direct pages haben Vorrang, weil access_token zuverlässiger)
    const seen = new Set(directPages.map(p => p.id))
    const pages = [...directPages, ...businessPages.filter(p => !seen.has(p.id))]

    console.log('[meta-oauth] page sources — direct:', directPages.length, 'business:', businessPages.length, 'total:', pages.length)

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

import type { ApiService } from '../types'

export const socialService: ApiService = {
  name: 'Social-Media',
  slug: 'social',
  description:
    'Social-Media OAuth-Flows fuer LinkedIn, X (Twitter), Instagram und Meta (Facebook). Die start-Endpunkte werden vom Browser-Redirect aufgerufen und initiieren den OAuth-Authorization-Flow (signierter state, ggf. PKCE). Die callback-Endpunkte werden vom OAuth-Provider per Redirect angesprungen und persistieren die Access-Tokens. Daneben gibt es interne Verwaltungs-Endpunkte unter /api/v1/social.',
  basePath: '/api/social',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/social/linkedin/oauth/start',
      summary: 'LinkedIn-OAuth starten',
      description:
        'Initiiert den LinkedIn-OAuth-Flow und redirected zur LinkedIn-Authorize-URL. Signiert den state mit dem appointmentTokenSecret. Erfordert eine aktive Session und die Berechtigung social_media.update. Bei fehlender Env-Konfiguration (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_OAUTH_REDIRECT_URI) erfolgt ein Redirect zu /intern/integrations/social?error=linkedin_not_configured.',
      response: { status: 302, location: 'https://www.linkedin.com/oauth/v2/authorization?...' },
      curl: `curl -i https://example.com/api/social/linkedin/oauth/start \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/social/linkedin/oauth/callback',
      summary: 'LinkedIn-OAuth-Callback',
      description:
        'OAuth-Callback fuer LinkedIn. Verifiziert den signierten state, tauscht den code gegen Tokens, ruft die OIDC-User-Info ab und persistiert den verknuepften Account. Schreibt einen Audit-Log-Eintrag und redirected zu /intern/integrations/social?connected=linkedin (bzw. ?error=...). Public-Endpoint — wird vom OAuth-Provider aufgerufen.',
      params: [
        { name: 'code', in: 'query', required: false, type: 'string', description: 'OAuth-Authorization-Code', example: 'AQT4...' },
        { name: 'state', in: 'query', required: false, type: 'string', description: 'Signierter state-Parameter', example: 'eyJ1aWQiOi...' },
        { name: 'error', in: 'query', required: false, type: 'string', description: 'Fehler-Code, wenn der Provider den Flow abbricht', example: 'access_denied' },
      ],
      response: { status: 302, location: 'https://example.com/intern/integrations/social?connected=linkedin' },
      curl: `curl -i 'https://example.com/api/social/linkedin/oauth/callback?code=AQT4...&state=eyJ1aWQiOi...'`,
    },
    {
      method: 'GET',
      path: '/api/social/x/oauth/start',
      summary: 'X-OAuth starten',
      description:
        'Initiiert den X-OAuth-Flow (OAuth 2.0 + PKCE) und redirected zur X-Authorize-URL. Setzt den PKCE-Verifier als httpOnly-Cookie (Pfad /api/social/x/, TTL 600s). Erfordert eine aktive Session und die Berechtigung social_media.update. Bei fehlender Env-Konfiguration erfolgt ein Redirect mit ?error=x_not_configured.',
      response: { status: 302, location: 'https://twitter.com/i/oauth2/authorize?...' },
      curl: `curl -i https://example.com/api/social/x/oauth/start \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/social/x/oauth/callback',
      summary: 'X-OAuth-Callback',
      description:
        'OAuth-Callback fuer X (Twitter). Liest den PKCE-Verifier aus dem httpOnly-Cookie, verifiziert den state, tauscht den code gegen Tokens, ruft User-Info ab und persistiert den Account. Loescht das PKCE-Cookie und redirected zu /intern/integrations/social?connected=x (bzw. ?error=...). Public-Endpoint.',
      params: [
        { name: 'code', in: 'query', required: false, type: 'string', description: 'OAuth-Authorization-Code', example: 'TXkxYW...' },
        { name: 'state', in: 'query', required: false, type: 'string', description: 'Signierter state-Parameter', example: 'eyJ1aWQiOi...' },
        { name: 'error', in: 'query', required: false, type: 'string', description: 'Fehler-Code des Providers', example: 'access_denied' },
      ],
      response: { status: 302, location: 'https://example.com/intern/integrations/social?connected=x' },
      curl: `curl -i 'https://example.com/api/social/x/oauth/callback?code=TXkxYW...&state=eyJ1aWQiOi...'`,
    },
    {
      method: 'GET',
      path: '/api/social/instagram/oauth/start',
      summary: 'Instagram-OAuth starten',
      description:
        'Initiiert den Instagram-Direkt-OAuth-Flow. Erfordert eine aktive Session und die Berechtigung social_media.update. Bei fehlender Env-Konfiguration (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_OAUTH_REDIRECT_URI) erfolgt ein Redirect mit ?error=instagram_not_configured.',
      response: { status: 302, location: 'https://api.instagram.com/oauth/authorize?...' },
      curl: `curl -i https://example.com/api/social/instagram/oauth/start \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/social/instagram/oauth/callback',
      summary: 'Instagram-OAuth-Callback',
      description:
        'OAuth-Callback fuer Instagram-Direct. Tauscht code -> short-lived token -> long-lived token, ruft IG-User-Info ab, persistiert den Account und schreibt einen Audit-Log-Eintrag. Redirected zu /intern/integrations/social?connected=instagram (bzw. ?error=...). Public-Endpoint.',
      params: [
        { name: 'code', in: 'query', required: false, type: 'string', description: 'OAuth-Authorization-Code', example: 'AQB...' },
        { name: 'state', in: 'query', required: false, type: 'string', description: 'Signierter state-Parameter', example: 'eyJ1aWQiOi...' },
        { name: 'error', in: 'query', required: false, type: 'string', description: 'Fehler-Code des Providers', example: 'access_denied' },
      ],
      response: { status: 302, location: 'https://example.com/intern/integrations/social?connected=instagram' },
      curl: `curl -i 'https://example.com/api/social/instagram/oauth/callback?code=AQB...&state=eyJ1aWQiOi...'`,
    },
    {
      method: 'GET',
      path: '/api/social/meta/oauth/start',
      summary: 'Meta-OAuth starten',
      description:
        'Initiiert den Meta- (Facebook/Pages/IG-Business) OAuth-Flow. Erfordert eine aktive Session und die Berechtigung social_media.update. Bei fehlender Env-Konfiguration (META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI) erfolgt ein Redirect mit ?error=meta_not_configured.',
      response: { status: 302, location: 'https://www.facebook.com/v19.0/dialog/oauth?...' },
      curl: `curl -i https://example.com/api/social/meta/oauth/start \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/social/meta/oauth/callback',
      summary: 'Meta-OAuth-Callback',
      description:
        'OAuth-Callback fuer Meta. Tauscht code -> short-lived -> long-lived token, listet Pages (inkl. IG-Business) auf und waehlt automatisch die "xkmu"-Page (case-insensitive) oder die erste Page aus. Persistiert den Account und redirected zu /intern/integrations/social?connected=meta (bzw. ?error=no_pages_found/...). Public-Endpoint.',
      params: [
        { name: 'code', in: 'query', required: false, type: 'string', description: 'OAuth-Authorization-Code', example: 'AQD...' },
        { name: 'state', in: 'query', required: false, type: 'string', description: 'Signierter state-Parameter', example: 'eyJ1aWQiOi...' },
        { name: 'error', in: 'query', required: false, type: 'string', description: 'Fehler-Code des Providers', example: 'access_denied' },
      ],
      response: { status: 302, location: 'https://example.com/intern/integrations/social?connected=meta' },
      curl: `curl -i 'https://example.com/api/social/meta/oauth/callback?code=AQD...&state=eyJ1aWQiOi...'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/social/accounts/{id}',
      summary: 'Social-Account trennen',
      description:
        'Trennt einen verknuepften Social-Account (Provider-unabhaengig), revoked den Token bzw. markiert den Account als getrennt. Schreibt einen Audit-Log-Eintrag (social_account_revoked). Idempotent: bei bereits revoked-Status wird {ok:true, alreadyRevoked:true} zurueckgegeben. Erfordert social_media.update.',
      response: {
        ok: true,
      },
      curl: `curl -X DELETE https://example.com/api/v1/social/accounts/sa-9c0d1e2f-3a4b-5c6d-7e8f-901234567890 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/social/connection-status',
      summary: 'Verbindungs-Status pruefen',
      description:
        'Prueft, ob fuer den angegebenen Provider ein verknuepfter Account mit Status "connected" existiert. Erfordert social_media.read.',
      params: [
        { name: 'provider', in: 'query', required: true, type: 'string', description: 'facebook | instagram | linkedin | x', example: 'facebook' },
      ],
      response: { connected: true },
      curl: `curl 'https://example.com/api/v1/social/connection-status?provider=facebook' \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/social/diagnose',
      summary: 'Social-Integration Diagnose',
      description:
        'Liefert eine Diagnose-Ansicht: vorhandene Env-Variablen (booleans + Redirect-URIs), CMS-App-URL, Anzahl/letzte 10 Accounts und letzte 10 Audit-Log-Eintraege mit Action-Prefix "social_". Hilfsendpunkt fuer Owner/Admins bei OAuth-Setup-Problemen. Erfordert social_media.read.',
      response: {
        env: {
          META_APP_ID: true,
          META_APP_SECRET: true,
          META_OAUTH_REDIRECT_URI: 'https://example.com/api/social/meta/oauth/callback',
          INSTAGRAM_APP_ID: true,
          INSTAGRAM_APP_SECRET: true,
          INSTAGRAM_OAUTH_REDIRECT_URI: 'https://example.com/api/social/instagram/oauth/callback',
          NEXT_PUBLIC_APP_URL: 'https://example.com',
          NEXT_PUBLIC_SITE_URL: 'https://example.com',
        },
        cmsAppUrl: 'https://example.com',
        accounts: {
          total: 4,
          connected: 3,
          latest: [
            {
              id: 'sa-9c0d1e2f-3a4b-5c6d-7e8f-901234567890',
              provider: 'meta',
              status: 'connected',
              accountName: 'xKMU Page',
              tokenExpiresAt: '2026-07-10T00:00:00.000Z',
              createdAt: '2026-05-11T12:00:00.000Z',
              revokedAt: null,
            },
          ],
        },
        audit: {
          latest: [
            {
              action: 'social_account_connected',
              entityId: 'sa-9c0d1e2f-3a4b-5c6d-7e8f-901234567890',
              payload: { provider: 'meta', accountName: 'xKMU Page' },
              createdAt: '2026-05-11T12:00:01.000Z',
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/social/diagnose \\
  -b cookies.txt`,
    },
  ],
}

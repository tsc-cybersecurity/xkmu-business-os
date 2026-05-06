# Social-Media Phase 2C — Instagram Direct Login (separat von Facebook) — Implementation Plan

> **Plan-Pakete für Social-Media-Modul**
> - ✅ Phase 1: FB+IG OAuth via FB-Page-Verknüpfung (Connect-UI)
> - ✅ Phase 2A: Backend-Pipeline (Schema + MetaProvider + Service)
> - ✅ Phase 2B: Bridge zur existing `social_media_posts` (FB-Posten via OAuth läuft)
> - **Phase 2C (diese Datei):** Instagram-Direct-Login als zweiter eigener OAuth-Flow. KEINE FB-Page-Verknüpfung nötig. User kann FB-Page **und/oder** IG-Business-Account separat verbinden.
> - Phase 3: Posting-Kalender + Cron-Auto-Posting

**Goal:** User kann auf `/intern/integrations/social` zwei separate Connects starten:
- "Facebook verbinden" → bestehender FB-OAuth-Flow (FB-Page + optional IG via FB-Page)
- "Instagram verbinden" → **neuer** IG-Direct-OAuth-Flow (kein FB-Page nötig)

Beide Pfade speichern Tokens in `social_oauth_accounts`. Beide Provider implementieren `SocialProvider`. Der Publish-Dispatcher in der Bridge-Route wählt den richtigen Provider basierend auf `social_media_posts.platform`.

**Architecture:** Zweiter OAuth-Flow zu `instagram.com` + `graph.instagram.com` (anderer Host als die Facebook Graph API!). Eigene Sub-App-Credentials im Meta-Dashboard (Instagram-App-ID + Instagram-App-Geheimcode — separat von Facebook-App-ID/Secret). Eigener Provider `InstagramProvider`. Bridge-Route routet `platform='instagram'` zu `InstagramProvider`, `platform='facebook'` zu `MetaProvider` (existing).

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-05-05-social-media-modul-design.md` §3, §4, §6.6 (analog).

---

## ENV-Vars (zusätzlich)

```env
INSTAGRAM_APP_ID=...           # aus IG-API-Setup → Instagram-App-ID
INSTAGRAM_APP_SECRET=...       # aus IG-API-Setup → Instagram-App-Geheimcode
INSTAGRAM_OAUTH_REDIRECT_URI=https://www.xkmu.de/api/social/instagram/oauth/callback
```

Im Meta-Dashboard:
- Anwendungsfälle → "Messaging und Content auf Instagram verwalten" → API-Einrichtung mit Instagram-Login → Whitelist Redirect-URI
- Permissions: `instagram_business_basic`, `instagram_business_content_publish` (mind.) — die sind dort schon im Use-Case enthalten

---

## Tasks

### P2C.1: `InstagramOAuthClient`

**Files:** `src/lib/services/social/instagram-oauth.client.ts` + Test

Endpoints:
- Authorize: `https://www.instagram.com/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=…`
- Code-Exchange: `POST https://api.instagram.com/oauth/access_token` (form-data: client_id, client_secret, grant_type=authorization_code, redirect_uri, code) → `{access_token, user_id}` (short-lived, 1h)
- Long-lived: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=…&access_token=…` → `{access_token, expires_in}` (60 days)
- User-Info: `GET https://graph.instagram.com/me?fields=id,username&access_token=…`

Scopes: `instagram_business_basic,instagram_business_content_publish`

ENV: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_OAUTH_REDIRECT_URI`.

### P2C.2: `InstagramPublishClient`

**Files:** `src/lib/services/social/instagram-publish.client.ts` + Test

Endpoints (Host: `graph.instagram.com`, NICHT `graph.facebook.com`):
- 1. Container: `POST https://graph.instagram.com/v23.0/{ig-user-id}/media` (form: image_url, caption, access_token) → `{id: containerId}`
- 2. Publish: `POST https://graph.instagram.com/v23.0/{ig-user-id}/media_publish` (form: creation_id, access_token) → `{id: mediaId}`

Behaviour: identisch zu `MetaPublishClient.publishToInstagram` (Phase 2A) — aber anderer Host und direkter IG-Token statt Page-Token.

### P2C.3: `InstagramProvider implements SocialProvider`

**Files:** `src/lib/services/social/instagram-provider.ts` + Test

```typescript
async publish(post: SocialMediaPost): Promise<PublishResult> {
  if (post.platform !== 'instagram') throw new Error('only_instagram')
  const account = await loadAccount('instagram')
  if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }
  const token = decryptToken(account.accessTokenEnc, await getSocialTokenKey())
  if (!post.imageUrl) return { ok: false, error: 'instagram_requires_image', revokeAccount: false }
  return InstagramPublishClient.publishImage({
    igUserId: account.externalAccountId,
    accessToken: token,
    caption: post.content,
    imageUrl: post.imageUrl,
  })
}
```

### P2C.4: `SocialAccountService.connectInstagram`

**Files:** `src/lib/services/social/social-account.service.ts` + Test (extend)

Neue Methode parallel zu `connectMeta`:
```typescript
connectInstagram({ shortLivedToken, expiresInSec, igUserId, igUsername, userId }): Promise<{ connected: ConnectedAccountSummary[] }>
```
- Long-lived ist schon ausgetauscht, wird hier persistiert
- Revoke any existing `provider='instagram'` row (egal ob aus FB-Path oder IG-Direct)
- Insert neue Row mit `provider='instagram'`, `external_account_id=igUserId`, `account_name='@'+igUsername`, `meta={source:'instagram_direct'}`
- Single transaction wie bei `connectMeta`

### P2C.5: OAuth-Routes (Start + Callback)

**Files:**
- `src/app/api/social/instagram/oauth/start/route.ts`
- `src/app/api/social/instagram/oauth/callback/route.ts`
- Tests für beide

Pattern wie Phase 1 Meta-Routes, aber für IG-Direct:
- Start: signState mit `appointmentTokenSecret`, redirect zu IG-Authorize-URL, `?error=instagram_not_configured` falls ENV fehlt
- Callback: verifyState, exchangeCode → exchangeForLongLived → getUserInfo → connectInstagram → AuditLog → redirect mit `?connected=instagram`
- Error-Codes: `user_denied`, `invalid_state`, `missing_code_or_state`, `instagram_not_configured`, sanitisierter raw error

### P2C.6: AccountCards UI Update

**File:** `src/app/intern/(dashboard)/integrations/social/_components/AccountCards.tsx`

- Facebook-Card: `connectHref: '/api/social/meta/oauth/start'` (unchanged)
- Instagram-Card: `connectHref: '/api/social/instagram/oauth/start'` (NEU — eigener Connect-Button)
- Toast-Mappings: `connected=instagram` → "Instagram-Account verbunden", `instagram_not_configured` → "Instagram-App nicht konfiguriert — INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET/INSTAGRAM_OAUTH_REDIRECT_URI im Server setzen"

### P2C.7: Publish-Bridge Dispatcher Update

**File:** `src/app/api/v1/social-media/posts/[id]/publish/route.ts`

Aktuell: `if (platform === 'facebook' || 'instagram') → MetaProvider.publish(post)`.

Neu:
```typescript
let result: PublishResult
if (platform === 'facebook') result = await MetaProvider.publish(post)
else if (platform === 'instagram') result = await InstagramProvider.publish(post)
else /* legacy */
```

Tests entsprechend ergänzen (4 → 5+ Tests).

### P2C.8: ENV-Vars in docker-compose

**Files:** `.env.example` + 4 docker-compose-Dateien

Drei zusätzliche Vars: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_OAUTH_REDIRECT_URI`. Pattern wie META_*.

---

## Self-Review (vor Merge)

- [ ] FB-Connect läuft unverändert
- [ ] Neuer IG-Connect erscheint in UI als zweiter Button
- [ ] `INSTAGRAM_*`-Vars fehlen → freundlicher Toast statt 500
- [ ] DB-Eintrag `provider='instagram'` mit IG-User-ID + langlebigem Token
- [ ] `social_media_posts` mit `platform='instagram'` → `InstagramProvider.publish` → echter IG-Post
- [ ] `social_media_posts` mit `platform='facebook'` → unverändert FB-Page-Post
- [ ] Audit-Logs für IG-Connect/Disconnect/Publish
- [ ] All tests green
- [ ] tsc clean

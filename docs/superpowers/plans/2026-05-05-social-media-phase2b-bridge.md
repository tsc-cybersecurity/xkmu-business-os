# Social-Media Phase 2B — Bridge zwischen OAuth-System und Legacy-Editor — Implementation Plan

> **Plan-Pakete für Social-Media-Modul**
> - ✅ Phase 1: Meta OAuth-Connection + Connect-UI
> - ✅ Phase 2A: Schema (`social_oauth_accounts`, `social_posts`, `social_post_targets`), `MetaPublishClient`, `MetaProvider`, `SocialPostService`
> - **Phase 2B (diese Datei):** Bridge zur existierenden `social_media_posts`-Pipeline. Mein `MetaProvider` wird im existing publish-Route eingehängt (FB/IG-Path); Legacy-`SocialPublishingService` bleibt für LinkedIn/Twitter/Xing. Twitter wird zu X umbenannt. Audit-Logs nachgerüstet. **Phase-2A-Tabellen `social_posts`/`social_post_targets` werden NICHT genutzt** — bleiben im Schema, evtl. später Drop.
> - Phase 3: Posting-Kalender + Cron-Auto-Posting → MVP-Ende
> - Phase 4: LinkedIn/Twitter/Xing auf OAuth umstellen (neue Provider-Adapter)
> - Phase 5: Generator + Freigabe-UI (BLOCKED auf Workflow-Engine)
> - Phase 6: weitere Provider

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Existierende Posts-Generierung im `/intern/social-media/`-UI nutzt ab jetzt für FB/IG den OAuth-basierten `MetaProvider` (statt der manuellen AI-Provider-Credentials aus dem `SocialPublishingService`). LinkedIn/Twitter/Xing bleiben unverändert. Im DB-Schema werden Posting-Ergebnisse persistent (`external_post_id`, `external_url`, `last_error`, `posted_via`). Twitter wird zu X umbenannt. Audit-Logs werden bei jedem Publish geschrieben.

**Architecture:** **Adapter-Funktion**, kein neues UI. Die existing Route `POST /api/v1/social-media/posts/[id]/publish` bekommt einen Dispatcher: `if (platform in ['facebook','instagram'])` → `MetaProvider`, sonst `SocialPublishingService`. `MetaProvider.publish` wird umgestellt von `(target, post)` (P2A-Schema) auf `(post: SocialMediaPost)` (existing schema). `social_media_posts` wird um 4 Spalten erweitert. Twitter→X-Migration läuft als separate Daten- und Code-Migration.

**Spec:** `docs/superpowers/specs/2026-05-05-social-media-modul-design.md` §1, §3, §4, §6.2.

**Codebase-Patterns:** wie Phase 1+2A.

**Bewusst NICHT in Phase 2B:**
- Neues Posts-Editor-UI (existing `/intern/social-media/posts/...` bleibt)
- Phase-2A-Tabellen-Drop (`social_posts`, `social_post_targets` bleiben unbenutzt im Schema)
- LinkedIn/Twitter/Xing OAuth (Phase 4)
- Cron/Scheduling (Phase 3)
- Generator-Workflow (Phase 5)

---

## Phase A — Schema-Erweiterung + Twitter-Rename

### Task P2B.1: Schema-Erweiterung `social_media_posts`

**Files:**
- Create: `drizzle/migrations/0051_social_media_posts_publish_metadata.sql`
- Modify: `src/lib/db/schema.ts`

Vier neue Spalten an `social_media_posts`:
- `external_post_id varchar(255)` — die ID, die FB/IG/etc. zurückgibt
- `external_url varchar(500)` — direkter Link zum publizierten Post (nullable)
- `last_error text` — Fehlertext bei `status='failed'`
- `posted_via varchar(20)` — `'oauth'` (neu) oder `'legacy'` (alter Path) — für späteres Reporting

**SQL:**

```sql
-- Phase 2B: publish-metadata for social_media_posts
ALTER TABLE social_media_posts
  ADD COLUMN external_post_id varchar(255),
  ADD COLUMN external_url     varchar(500),
  ADD COLUMN last_error       text,
  ADD COLUMN posted_via       varchar(20);
```

**Drizzle:**

In `socialMediaPosts` pgTable nach `postedAt`:

```typescript
externalPostId: varchar('external_post_id', { length: 255 }),
externalUrl: varchar('external_url', { length: 500 }),
lastError: text('last_error'),
postedVia: varchar('posted_via', { length: 20 }),  // 'oauth' | 'legacy'
```

- [ ] Migration anlegen
- [ ] Drizzle-Schema anpassen
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run db:generate` — kein Drift
- [ ] Commit: `feat(social): publish metadata columns on social_media_posts`

---

### Task P2B.2: Twitter → X Rename (DB + Code)

**Files:**
- Create: `drizzle/migrations/0052_social_platform_twitter_to_x.sql`
- Modify: ~12 TS files mit `'twitter'` String-Literalen (per Grep)
- Modify: Tests + Validation-Schemas

Strategie:
1. Datenbank-Update: `UPDATE social_media_posts SET platform = 'x' WHERE platform = 'twitter'`
2. Code: alle `'twitter'` → `'x'` in:
   - `schema.ts` (Comment am `platform`-Field)
   - `src/lib/utils/validation.ts`
   - `src/__tests__/unit/services/social-media-post.service.test.ts`
   - `src/__tests__/unit/validation/social-media.validation.test.ts`
   - `src/__tests__/unit/validation/ai-schemas.validation.test.ts`
   - `src/lib/services/social-publishing.service.ts` (provider-key, Logik-Block)
   - `src/lib/api-docs/services/social-media.ts`
   - `src/lib/services/ai-prompt-template.defaults.ts` (falls Plattform-Default-Templates)
3. **NICHT umbenannt**: Files die "twitter" für andere Zwecke nutzen (Marketing-Agent für Lead-Research könnte z.B. die echte Twitter/X-API für Recherche nutzen — diese bleiben). Vor dem Edit jede Stelle prüfen: ist's "Plattform-Klassifikator" oder "echter Twitter API"-Bezug? Nur ersteres umbenennen.

**Grep first:** `Grep("['\"]twitter['\"]")` und für jeden Treffer entscheiden.

- [ ] Migration anlegen (UPDATE-Statement)
- [ ] Code-Stellen identifizieren + ändern (file by file, mit Grep-Kontrolle)
- [ ] Tests laufen alle grün
- [ ] `npx tsc --noEmit` clean
- [ ] Commit: `refactor(social): rename platform 'twitter' → 'x'`

---

## Phase B — Bridge

### Task P2B.3: `MetaProvider` auf `socialMediaPosts`-Shape umstellen

**Files:**
- Modify: `src/lib/services/social/meta-provider.ts`
- Modify: `src/__tests__/unit/services/social/meta-provider.test.ts`

**Aktuelle Signatur** (P2A):
```typescript
publish(target: SocialPostTarget, post: SocialPost): Promise<PublishResult>
```

**Neue Signatur** (P2B):
```typescript
publish(post: SocialMediaPost): Promise<PublishResult>
```

`socialMediaPosts` hat `platform`, `content`, `imageUrl`, `id`, `title` etc. Der Provider liest diese Felder direkt — kein separates Target/Post-Modell mehr.

**Implementation-Skizze:**
```typescript
import type { SocialMediaPost } from '@/lib/db/schema'
// ...
async publish(post: SocialMediaPost): Promise<PublishResult> {
  const platform = post.platform
  if (platform !== 'facebook' && platform !== 'instagram') {
    throw new Error('unsupported_provider_for_meta')
  }
  const account = await loadAccount(platform)
  if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }
  const key = await getSocialTokenKey()
  const pageAccessToken = decryptToken(account.accessTokenEnc, key)
  const body = post.content
  const imageUrl = post.imageUrl ?? null
  if (platform === 'facebook') {
    return MetaPublishClient.publishToFacebookPage({ pageId: account.externalAccountId, pageAccessToken, message: body, imageUrl })
  }
  return MetaPublishClient.publishToInstagram({ igUserId: account.externalAccountId, pageAccessToken, caption: body, imageUrl })
}
```

Tests entsprechend anpassen (statt `target`+`post` mit P2A-Shape jetzt nur ein `socialMediaPosts`-ähnliches Objekt).

- [ ] Tests umschreiben → fail-first
- [ ] Provider-Code anpassen → green
- [ ] tsc clean
- [ ] Commit: `refactor(social): MetaProvider takes SocialMediaPost directly`

---

### Task P2B.4: Publish-Route Bridge + Status-Persistierung

**File:**
- Modify: `src/app/api/v1/social-media/posts/[id]/publish/route.ts`
- Modify Test: vermutlich existing — ggf. anlegen

Aktueller Code (~54 Zeilen) ruft `SocialPublishingService.publish(targetPlatforms, content, ...)` für **alle** Plattformen. Wir patchen das so:

```typescript
const platform = post.platform  // (already loaded)
let result: PublishResult

if (platform === 'facebook' || platform === 'instagram') {
  // OAuth-Path via MetaProvider
  result = await MetaProvider.publish(post)
} else {
  // Legacy-Path: bestehender Service mit AI-Provider-Credentials
  const legacyResult = await SocialPublishingService.publish([platform], post.content, { imageUrl, link })
  const r = legacyResult[platform]
  result = r?.success
    ? { ok: true, externalPostId: r.postId ?? '', externalUrl: r.postUrl ?? null }
    : { ok: false, error: r?.error ?? 'legacy_publish_failed', revokeAccount: false }
}

// Status persistieren
if (result.ok) {
  await db.update(socialMediaPosts).set({
    status: 'posted',
    postedAt: new Date(),
    externalPostId: result.externalPostId,
    externalUrl: result.externalUrl,
    lastError: null,
    postedVia: (platform === 'facebook' || platform === 'instagram') ? 'oauth' : 'legacy',
    updatedAt: new Date(),
  }).where(eq(socialMediaPosts.id, id))
} else {
  await db.update(socialMediaPosts).set({
    status: 'failed',
    lastError: result.error,
    postedVia: (platform === 'facebook' || platform === 'instagram') ? 'oauth' : 'legacy',
    updatedAt: new Date(),
  }).where(eq(socialMediaPosts.id, id))

  // OAuth-account revoken bei revokeAccount=true
  if (!result.ok && (result as PublishFailure).revokeAccount) {
    await db.update(socialOauthAccounts).set({ status: 'revoked', revokedAt: new Date() })
      .where(and(eq(socialOauthAccounts.provider, platform), eq(socialOauthAccounts.status, 'connected')))
  }
}

// Audit-Log
await AuditLogService.log({
  userId: auth.userId,
  userRole: auth.role,
  action: result.ok ? 'social_media_post_published' : 'social_media_post_failed',
  entityType: 'social_media_posts',
  entityId: id,
  payload: { platform, postedVia: (platform === 'facebook' || platform === 'instagram') ? 'oauth' : 'legacy', externalPostId: result.ok ? result.externalPostId : undefined, error: !result.ok ? result.error : undefined },
  request,
})

return apiSuccess({ result, postId: id })
```

**Edge:** der existing Code nahm `body.platforms` (Array) entgegen — was unsupported ist im neuen Single-Platform-Pro-Post-Modell. Wir ignorieren `body.platforms` und nutzen `post.platform`. Falls API-Backward-Compat wichtig wäre: prüfen mit User. Pragmatisch: aktuelles Behavior `targetPlatforms = platforms || [post.platform]` ist eh meist `[post.platform]`, also passt.

**Tests:**
- happy-path FB → MetaProvider called, status=posted, audit logged
- happy-path LinkedIn → SocialPublishingService called, status=posted, audit logged, postedVia=legacy
- failure-path → status=failed, lastError set, audit logged with action=failed
- 401 von Meta → status=failed UND oauth-account auf revoked

- [ ] Tests fail-first
- [ ] Implementation
- [ ] Tests green
- [ ] tsc clean
- [ ] Commit: `feat(social): bridge publish route — MetaProvider for FB/IG, audit logs, status persistence`

---

## Phase C — UI-Hinweis (optional/Polish)

### Task P2B.5: UI-Connect-Status im Posts-Editor

**Files:**
- Modify: `src/app/intern/(dashboard)/social-media/posts/[id]/...` (bestehender Editor)
- Optional: kleine Server-Helper um zu prüfen ob für `post.platform` ein OAuth-Account verbunden ist

UX:
- Wenn `post.platform === 'facebook' || 'instagram'` und KEIN connected `social_oauth_accounts`-Eintrag existiert → kleine Warning-Banner: "Account nicht verbunden — `[Verbinden →]`" Link zu `/intern/integrations/social`
- Sonst keine Änderung am Editor

- [ ] Server-Component-Helper schreiben (`getMetaConnectionStatus()`)
- [ ] Editor-Page-Component-Layout um Banner ergänzen
- [ ] Visuell verifizieren
- [ ] Commit: `feat(social): warn in editor when meta account not connected`

---

## Out-of-Scope-Reminder (kommt in Phase 3)

- Cron-Auto-Posting (`scheduledFor` ist schon Spalte, aber kein Cron-Tick)
- Drag-Drop-Posting-Kalender
- Retry-Policy bei `failed` posts (manueller Re-Try via UI ist OK)
- LinkedIn/Twitter/Xing OAuth-Migration (Phase 4)

## Self-Review Checklist (vor Phase 3)

- [ ] Migration 0051 + 0052 ausgerollt, kein Schema-Drift
- [ ] Existing FB-Post über `/intern/social-media/posts/X/publish` → echter Post auf FB-Page (E2E)
- [ ] Existing LinkedIn-Post → unverändertes Verhalten
- [ ] DB-Felder `external_post_id`/`external_url`/`last_error`/`posted_via` korrekt befüllt
- [ ] Audit-Log-Einträge `social_media_post_published`/`_failed` sichtbar
- [ ] Twitter-Rename ist sauber: keine `'twitter'`-Strings mehr in social-media-Code-Pfaden
- [ ] Editor warnt wenn FB/IG nicht verbunden

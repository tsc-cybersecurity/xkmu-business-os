# Social-Media Phase 1 — Meta OAuth-Connection (FB-Page + IG-Business) — Implementation Plan

> **Plan-Pakete für Social-Media-Modul**
> - **Phase 1 (diese Datei):** Schema-Grundlage, generischer Token-Crypto-Helper, Meta-OAuth-Flow, Connect/Disconnect-UI, Token-Refresh-Cron-Skeleton. **Noch keine** Posts, **kein** Posting, **kein** Kalender.
> - Phase 2: Post-Pipeline (Schema `social_posts` + `social_post_targets` + `MetaProvider.publish` + manuelles Jetzt-Posten)
> - Phase 3: Posting-Kalender + Cron-Auto-Posting via task_queue → MVP-Ende
> - Phase 4: X-Provider (Free Tier)
> - Phase 5: Generator + Freigabe-UI (BLOCKED auf Workflow-Engine)
> - Phase 6: LinkedIn-Provider
>
> Reihenfolge strikt 1 → 6. Jede Phase ist eigenständig deploybar.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner kann unter `/intern/integrations/social` den Meta-Account der Org koppeln. Nach dem OAuth-Flow stehen **zwei** Einträge in `social_oauth_accounts`: einer für die FB-Page (provider=`facebook`) und einer für den verknüpften IG-Business-Account (provider=`instagram`), beide mit dem gleichen Page-Access-Token. Tokens AES-256-GCM-verschlüsselt. Disconnect setzt `status='revoked'`. Ein Cron-Job-Skeleton refresht Long-Lived-Tokens vor Ablauf — der Handler ist in Phase 1 ein No-Op-Placeholder, wird in Phase 2 verdrahtet, wenn die ersten echten Posts existieren.

**Architecture:** Eine neue Tabelle `social_oauth_accounts`. Generischer Token-Crypto-Helper `src/lib/crypto/token-crypto.ts` (extrahiert aus `calendar-token-crypto.ts`, beide bleiben funktional). Meta-OAuth-Client `src/lib/services/social/meta-oauth.client.ts` (REST-Calls über `fetch`, kein FB-SDK). Service `src/lib/services/social/social-account.service.ts` orchestriert Connect/Disconnect + Token-Persistenz. Drei API-Routen: `GET /api/social/meta/oauth/start`, `GET /api/social/meta/oauth/callback`, `DELETE /api/v1/social/accounts/[id]`. Eine Settings-Seite `/intern/integrations/social` mit einer Karte pro Provider (Phase 1 nur Meta = FB+IG sichtbar, andere Karten "Demnächst"). Sidebar-Eintrag „Social Media" hinzugefügt (führt initial zu `/intern/integrations/social` — Posts-Liste folgt in Phase 2). Cron-Tick-Handler `social_token_refresh` registriert (Phase 1: No-Op + Log).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Postgres), Zod, Vitest. Node-eingebautes `crypto` (re-use existing AES-256-GCM-Helper). Meta Graph API v19.0 direkt via `fetch`.

**Spec:** `docs/superpowers/specs/2026-05-05-social-media-modul-design.md` §1, §2.1, §2.4, §3, §6.1.

**Codebase-Patterns, die der Plan strikt befolgt:**
- Services als `export const FooService = { method() { ... } }` (Pattern aus `calendar-account.service.ts`)
- API mit `withPermission(request, MODULE, ACTION, async (auth) => { ... })` aus `@/lib/auth/require-permission`
- Permission-Modul: **`social_media`** (neu) mit Standard-CRUD-Actions; Connect/Disconnect mappt auf `('social_media', 'update')`.
- DB-Mock in Service-Tests: `setupDbMock()` aus `src/__tests__/helpers/mock-db.ts` + `vi.resetModules()` + dynamic import
- Service-Tests: `src/__tests__/unit/services/social/...`
- API-Tests: `src/__tests__/integration/api/social/...`
- Audit-Log: `AuditLogService.log({ userId, userRole, action, entityType, entityId, payload, request })`

**Bewusst NICHT in Phase 1:**
- `social_posts` / `social_post_targets` Tabellen — Phase 2
- `MetaProvider.publish` / Posting-Logik — Phase 2
- Posts-Listen-UI — Phase 2
- Token-Refresh-Handler-Body (nur Skeleton) — Phase 2 / 3
- X / LinkedIn — Phase 4 / 6

**Meta-spezifischer OAuth-Hintergrund (zur Orientierung):**
1. Der OAuth-Flow gibt zunächst ein **Short-Lived User Token** (~1h gültig).
2. Wir tauschen es gegen ein **Long-Lived User Token** (~60 Tage).
3. Mit dem Long-Lived User Token rufen wir `/me/accounts` und bekommen pro FB-Page einen **Page Access Token** (Long-Lived oder non-expiring, je nach Permissions).
4. Der **Page Access Token** ist das, was wir speichern und für FB-Page-Posts und IG-Business-Posts (über die selbe Page-Verknüpfung) verwenden.
5. Über `/{page-id}?fields=instagram_business_account` ermitteln wir die verknüpfte IG-User-ID — falls vorhanden, persistieren wir einen zweiten Eintrag mit `provider='instagram'` und dem **gleichen Token**.

---

## Phase A — Foundation (Schema, Permission, Env)

### Task 1: SQL-Migration + Drizzle-Schema

**Files:**
- Create: `drizzle/migrations/0049_social_oauth_accounts.sql`
- Modify: `src/lib/db/schema.ts` (am Ende anhängen)
- Modify: `src/lib/db/table-whitelist.ts` (neue Tabelle aufnehmen)

- [ ] **Step 1: SQL-Migration anlegen**

Datei `drizzle/migrations/0049_social_oauth_accounts.sql`:

```sql
-- Social-Media Phase 1: OAuth-Account-Verknüpfungen
CREATE TABLE social_oauth_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              varchar(20) NOT NULL,
  external_account_id   varchar(255) NOT NULL,
  account_name          varchar(255) NOT NULL,
  access_token_enc      text NOT NULL,
  refresh_token_enc     text,
  token_expires_at      timestamptz,
  scopes                text[] NOT NULL DEFAULT '{}',
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                varchar(20) NOT NULL DEFAULT 'connected',
  connected_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_provider CHECK (provider IN ('facebook','instagram','x','linkedin')),
  CONSTRAINT chk_social_status CHECK (status IN ('connected','revoked','expired'))
);
CREATE UNIQUE INDEX idx_social_oauth_one_active_per_provider
  ON social_oauth_accounts(provider) WHERE status = 'connected';
CREATE INDEX idx_social_oauth_status ON social_oauth_accounts(status);
CREATE INDEX idx_social_oauth_token_expiry
  ON social_oauth_accounts(token_expires_at) WHERE status = 'connected' AND token_expires_at IS NOT NULL;
```

- [ ] **Step 2: Drizzle-Schema in `schema.ts` ergänzen**

Am Ende von `src/lib/db/schema.ts` anhängen:

```typescript
// ============================================================================
// Social-Media Phase 1 — OAuth-Account-Verknüpfungen
// ============================================================================

export const socialOauthAccounts = pgTable('social_oauth_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 20 }).notNull(),
  externalAccountId: varchar('external_account_id', { length: 255 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  meta: jsonb('meta').notNull().default(sql`'{}'::jsonb`),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  connectedBy: uuid('connected_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3: Tabelle in `table-whitelist.ts` aufnehmen**

```typescript
// add 'social_oauth_accounts' to the whitelist set
```

- [ ] **Step 4: Migration lokal/produktiv ausführen + Schema-Drift prüfen**

Run: `npm run db:migrate`
Run: `npm run db:generate` (sollte keine neuen Diffs erzeugen → Schema-Drift = 0)

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0049_social_oauth_accounts.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat(social): schema social_oauth_accounts + drizzle"
```

---

### Task 2: Permission-Modul `social_media` registrieren

**Files:**
- Modify: `src/lib/auth/permissions.ts` (oder wo das Module-Registry liegt — Pattern aus Termin-Modul prüfen)
- Modify: ggf. Seed-File für Default-Role-Permissions

- [ ] **Step 1: Modul `social_media` mit Standard-CRUD-Actions registrieren**

Vorlage suchen: wie wurde `appointments` registriert? (Termin-Phase 1, Migration 0039 oder direkt in `permissions.ts`). Pattern 1:1 nachbauen für `social_media` mit Actions `read | create | update | delete`.

Owner-Default: alle 4 Actions. Andere Rollen: zunächst keine Permission (in Phase 2/3 ggf. erweitern, wenn Mitarbeiter Posts anlegen sollen).

- [ ] **Step 2: Test: ein Owner darf, ein Non-Owner nicht**

Mini-Integration-Test gegen `withPermission(req, 'social_media', 'update', ...)` mit Owner-Session ergibt 200, mit Non-Owner-Session 403.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): permission module social_media + owner default"
```

---

## Phase B — Token-Crypto-Helper generisch machen

### Task 3: Extract `token-crypto.ts` aus `calendar-token-crypto.ts`

**Files:**
- Create: `src/lib/crypto/token-crypto.ts`
- Modify: `src/lib/services/calendar-token-crypto.ts` → re-export aus neuem Modul (Backwards-Compat, keine Call-Site-Änderungen)
- Test: `src/__tests__/unit/lib/crypto/token-crypto.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/unit/lib/crypto/token-crypto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken, generateKeyHex } from '@/lib/crypto/token-crypto'

describe('token-crypto', () => {
  it('round-trips ASCII plaintext', () => {
    const key = generateKeyHex()
    const ct = encryptToken('hello', key)
    expect(ct).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    expect(decryptToken(ct, key)).toBe('hello')
  })

  it('round-trips unicode plaintext', () => {
    const key = generateKeyHex()
    expect(decryptToken(encryptToken('Schöner Token €€', key), key)).toBe('Schöner Token €€')
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const key = generateKeyHex()
    expect(encryptToken('x', key)).not.toBe(encryptToken('x', key))
  })

  it('throws on tampered ciphertext (auth-tag)', () => {
    const key = generateKeyHex()
    const ct = encryptToken('secret', key)
    const [iv, body, tag] = ct.split(':')
    const tampered = `${iv}:${body.replace(/^./, '0')}:${tag}`
    expect(() => decryptToken(tampered, key)).toThrow()
  })

  it('throws on wrong key', () => {
    const k1 = generateKeyHex(), k2 = generateKeyHex()
    expect(() => decryptToken(encryptToken('x', k1), k2)).toThrow()
  })
})
```

- [ ] **Step 2: Test laufen — sollte fehlschlagen (Modul existiert noch nicht)**

Run: `npx vitest run src/__tests__/unit/lib/crypto/token-crypto.test.ts`
Expected: FAIL "Cannot find module '@/lib/crypto/token-crypto'"

- [ ] **Step 3: Implementierung in neue Datei kopieren**

Datei `src/lib/crypto/token-crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

export function generateKeyHex(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}

export function encryptToken(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`
}

export function decryptToken(ciphertext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length')
  const [ivHex, ctHex, tagHex] = ciphertext.split(':')
  if (!ivHex || !ctHex || !tagHex) throw new Error('invalid_ciphertext_format')
  const iv = Buffer.from(ivHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
```

- [ ] **Step 4: `calendar-token-crypto.ts` re-exportiert aus neuer Quelle**

Datei `src/lib/services/calendar-token-crypto.ts` umstellen auf:

```typescript
export { encryptToken, decryptToken, generateKeyHex } from '@/lib/crypto/token-crypto'
```

(So bleiben alle bestehenden Imports im Termin-Modul funktional.)

- [ ] **Step 5: Tests laufen — alle grün**

Run: `npx vitest run src/__tests__/unit/lib/crypto/ src/__tests__/unit/services/calendar-token-crypto.test.ts`
Expected: PASS (beide Test-Dateien)

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto/token-crypto.ts src/lib/services/calendar-token-crypto.ts src/__tests__/unit/lib/crypto/
git commit -m "refactor(crypto): extract generic token-crypto for reuse"
```

---

### Task 4: Encryption-Master-Key für Social-Modul

**Entscheidung:** Re-use des existierenden Keys aus `google_calendar_config.token_encryption_key_hex`. Begründung: ein Key-Material pro Org, kein zusätzliches Schlüsselmanagement, Rotation gilt automatisch für alles. Falls je notwendig, kann später ein zweiter Namespace eingeführt werden.

**Files:**
- Modify: `src/lib/services/social/crypto-config.ts` (neu, dünner Wrapper)

- [ ] **Step 1: Wrapper-Helper schreiben**

Datei `src/lib/services/social/crypto-config.ts`:

```typescript
import { CalendarConfigService } from '@/lib/services/calendar-config.service'

/**
 * Returns the shared encryption key (hex) used for all stored OAuth tokens.
 * Currently re-uses the calendar config key — single source of truth per org.
 */
export async function getSocialTokenKey(): Promise<string> {
  const cfg = await CalendarConfigService.getConfig()
  return cfg.tokenEncryptionKeyHex
}
```

- [ ] **Step 2: Smoke-Test**

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ tokenEncryptionKeyHex: 'a'.repeat(64) }) }
}))

describe('getSocialTokenKey', () => {
  it('returns the calendar config key', async () => {
    const { getSocialTokenKey } = await import('@/lib/services/social/crypto-config')
    expect(await getSocialTokenKey()).toBe('a'.repeat(64))
  })
})
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): shared token encryption key wrapper"
```

---

## Phase C — Meta OAuth-Client + Service

### Task 5: `MetaOAuthClient` (Thin REST-Wrapper)

**Files:**
- Create: `src/lib/services/social/meta-oauth.client.ts`
- Test: `src/__tests__/unit/services/social/meta-oauth.client.test.ts`

**Hintergrund:** Wir brauchen 4 Endpoints von Meta:
- `https://www.facebook.com/v19.0/dialog/oauth` — User-Redirect (URL bauen, kein fetch)
- `GET https://graph.facebook.com/v19.0/oauth/access_token` — Code → Short-Lived Token
- `GET https://graph.facebook.com/v19.0/oauth/access_token` mit `grant_type=fb_exchange_token` — Short → Long-Lived
- `GET https://graph.facebook.com/v19.0/me/accounts` — Pages auflisten
- `GET https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account` — verknüpfte IG-User-ID
- `GET https://graph.facebook.com/v19.0/{ig-user-id}?fields=username,profile_picture_url` — IG-Anzeigename

ENV-Vars: `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI` (z.B. `https://bos.dev.xkmu.de/api/social/meta/oauth/callback`).

- [ ] **Step 1: Failing Tests schreiben**

Datei `src/__tests__/unit/services/social/meta-oauth.client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  process.env.META_APP_ID = 'app1'
  process.env.META_APP_SECRET = 'sec1'
  process.env.META_OAUTH_REDIRECT_URI = 'https://example.com/cb'
})

describe('MetaOAuthClient.buildAuthorizeUrl', () => {
  it('includes required scopes and state', async () => {
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const url = MetaOAuthClient.buildAuthorizeUrl('STATE123')
    expect(url).toContain('client_id=app1')
    expect(url).toContain('state=STATE123')
    expect(url).toContain('pages_manage_posts')
    expect(url).toContain('instagram_basic')
    expect(url).toContain('instagram_content_publish')
    expect(url).toContain('pages_show_list')
  })
})

describe('MetaOAuthClient.exchangeCode', () => {
  it('exchanges code for short-lived token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short_at', expires_in: 3600 }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.exchangeCode('CODE')
    expect(r.accessToken).toBe('short_at')
    expect(r.expiresInSec).toBe(3600)
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch.mock.calls[0][0]).toContain('client_id=app1')
    expect(mockFetch.mock.calls[0][0]).toContain('code=CODE')
  })

  it('throws on Meta error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'bad code' } }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    await expect(MetaOAuthClient.exchangeCode('BAD')).rejects.toThrow(/bad code/)
  })
})

describe('MetaOAuthClient.exchangeForLongLived', () => {
  it('upgrades short-lived to long-lived (60d)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'long_at', expires_in: 5184000 }) })
    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.exchangeForLongLived('short_at')
    expect(r.accessToken).toBe('long_at')
    expect(r.expiresInSec).toBe(5184000)
  })
})

describe('MetaOAuthClient.listPagesWithIg', () => {
  it('returns pages with optional ig_user_id from /me/accounts + per-page lookup', async () => {
    // /me/accounts
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [
      { id: 'p1', name: 'Page One', access_token: 'tok_p1' },
      { id: 'p2', name: 'Page Two', access_token: 'tok_p2' },
    ] }) })
    // /{p1}?fields=instagram_business_account
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ instagram_business_account: { id: 'ig1' } }) })
    // /{p2}?fields=instagram_business_account
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })  // no IG linked
    // /{ig1}?fields=username
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'page_one_ig' }) })

    const { MetaOAuthClient } = await import('@/lib/services/social/meta-oauth.client')
    const r = await MetaOAuthClient.listPagesWithIg('long_user_token')
    expect(r).toEqual([
      { pageId: 'p1', pageName: 'Page One', pageAccessToken: 'tok_p1', igUserId: 'ig1', igUsername: 'page_one_ig' },
      { pageId: 'p2', pageName: 'Page Two', pageAccessToken: 'tok_p2', igUserId: null, igUsername: null },
    ])
  })
})
```

- [ ] **Step 2: Tests laufen lassen — sollten fehlschlagen**

Run: `npx vitest run src/__tests__/unit/services/social/meta-oauth.client.test.ts`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Client implementieren**

Datei `src/lib/services/social/meta-oauth.client.ts`:

```typescript
const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const DIALOG_BASE = 'https://www.facebook.com/v19.0/dialog/oauth'

const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
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
    const out: MetaPageWithIg[] = []
    for (const p of pages) {
      const link = await metaFetchJson(
        `${GRAPH_BASE}/${p.id}?fields=instagram_business_account&access_token=${encodeURIComponent(p.access_token)}`
      )
      const igId = link?.instagram_business_account?.id ?? null
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
```

- [ ] **Step 4: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/social/meta-oauth.client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/social/meta-oauth.client.ts src/__tests__/unit/services/social/meta-oauth.client.test.ts
git commit -m "feat(social): meta oauth client (graph v19, ig-business lookup)"
```

---

### Task 6: `SocialAccountService` (Connect / List / Disconnect)

**Files:**
- Create: `src/lib/services/social/social-account.service.ts`
- Test: `src/__tests__/unit/services/social/social-account.service.test.ts`

**Verantwortlichkeiten:**
- `listConnected()`: liefert alle aktiven Accounts, ohne Tokens
- `connectMeta(opts)`: orchestriert Token-Exchange + persistiert FB- + IG-Eintrag (oder nur FB wenn keine IG-Verknüpfung)
- `disconnect(id, userId)`: setzt status='revoked' + revoked_at, ruft (best-effort) Meta-Token-Revoke

- [ ] **Step 1: Failing Tests schreiben**

Datei `src/__tests__/unit/services/social/social-account.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

const meta = {
  exchangeCode: vi.fn(),
  exchangeForLongLived: vi.fn(),
  listPagesWithIg: vi.fn(),
}
vi.mock('@/lib/services/social/meta-oauth.client', () => ({ MetaOAuthClient: meta }))

beforeEach(() => {
  vi.resetModules()
  Object.values(meta).forEach(fn => fn.mockReset())
})

describe('SocialAccountService.connectMeta', () => {
  it('happy path: persists 1 fb + 1 ig row when ig is linked', async () => {
    const dbMock = setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: 'ig1', igUsername: 'xkmu_ig' },
    ])
    dbMock.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'row1' }]) }) })

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({
      code: 'CODE', selectedPageId: 'p1', userId: 'u1',
    })

    expect(r.connected).toEqual([
      expect.objectContaining({ provider: 'facebook', externalAccountId: 'p1' }),
      expect.objectContaining({ provider: 'instagram', externalAccountId: 'ig1' }),
    ])
    expect(dbMock.insert).toHaveBeenCalledTimes(2)
  })

  it('persists only fb when no ig is linked', async () => {
    const dbMock = setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: null, igUsername: null },
    ])
    dbMock.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'row1' }]) }) })

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({ code: 'C', selectedPageId: 'p1', userId: 'u1' })
    expect(r.connected).toHaveLength(1)
    expect(r.connected[0].provider).toBe('facebook')
  })

  it('throws when selectedPageId not found in user pages', async () => {
    setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([{ pageId: 'pX', pageName: 'X', pageAccessToken: 't', igUserId: null, igUsername: null }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    await expect(SocialAccountService.connectMeta({ code: 'C', selectedPageId: 'p1', userId: 'u1' }))
      .rejects.toThrow(/page_not_found/)
  })
})
```

- [ ] **Step 2: Service implementieren**

Datei `src/lib/services/social/social-account.service.ts`:

```typescript
import { db } from '@/lib/db'
import { socialOauthAccounts } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { encryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import { MetaOAuthClient } from './meta-oauth.client'

export interface ConnectMetaInput {
  code: string
  selectedPageId: string
  userId: string
}

export interface ConnectedAccountSummary {
  id: string
  provider: 'facebook' | 'instagram' | 'x' | 'linkedin'
  externalAccountId: string
  accountName: string
  status: 'connected' | 'revoked' | 'expired'
  tokenExpiresAt: Date | null
}

export const SocialAccountService = {
  async listConnected(): Promise<ConnectedAccountSummary[]> {
    const rows = await db.select({
      id: socialOauthAccounts.id,
      provider: socialOauthAccounts.provider,
      externalAccountId: socialOauthAccounts.externalAccountId,
      accountName: socialOauthAccounts.accountName,
      status: socialOauthAccounts.status,
      tokenExpiresAt: socialOauthAccounts.tokenExpiresAt,
    }).from(socialOauthAccounts)
      .where(eq(socialOauthAccounts.status, 'connected'))
    return rows as ConnectedAccountSummary[]
  },

  async connectMeta(input: ConnectMetaInput): Promise<{ connected: ConnectedAccountSummary[] }> {
    const short = await MetaOAuthClient.exchangeCode(input.code)
    const long = await MetaOAuthClient.exchangeForLongLived(short.accessToken)
    const pages = await MetaOAuthClient.listPagesWithIg(long.accessToken)
    const page = pages.find(p => p.pageId === input.selectedPageId)
    if (!page) throw new Error('page_not_found')

    const key = await getSocialTokenKey()
    // Long-lived page tokens often non-expiring; use long-user-token expiry as upper bound.
    const expiresAt = long.expiresInSec > 0 ? new Date(Date.now() + long.expiresInSec * 1000) : null

    // Upsert pattern: revoke any existing 'connected' row for these providers, then insert fresh.
    await db.update(socialOauthAccounts)
      .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(socialOauthAccounts.provider, 'facebook'), eq(socialOauthAccounts.status, 'connected')))
    await db.update(socialOauthAccounts)
      .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(socialOauthAccounts.provider, 'instagram'), eq(socialOauthAccounts.status, 'connected')))

    const inserted: ConnectedAccountSummary[] = []

    const fbRow = await db.insert(socialOauthAccounts).values({
      provider: 'facebook',
      externalAccountId: page.pageId,
      accountName: page.pageName,
      accessTokenEnc: encryptToken(page.pageAccessToken, key),
      tokenExpiresAt: expiresAt,
      scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      meta: { igLinked: !!page.igUserId },
      connectedBy: input.userId,
    }).returning()
    inserted.push({
      id: fbRow[0].id, provider: 'facebook',
      externalAccountId: page.pageId, accountName: page.pageName,
      status: 'connected', tokenExpiresAt: expiresAt,
    })

    if (page.igUserId) {
      const igName = page.igUsername ? `@${page.igUsername}` : `IG (${page.pageName})`
      const igRow = await db.insert(socialOauthAccounts).values({
        provider: 'instagram',
        externalAccountId: page.igUserId,
        accountName: igName,
        accessTokenEnc: encryptToken(page.pageAccessToken, key),
        tokenExpiresAt: expiresAt,
        scopes: ['instagram_basic', 'instagram_content_publish'],
        meta: { fbPageId: page.pageId, igUsername: page.igUsername },
        connectedBy: input.userId,
      }).returning()
      inserted.push({
        id: igRow[0].id, provider: 'instagram',
        externalAccountId: page.igUserId, accountName: igName,
        status: 'connected', tokenExpiresAt: expiresAt,
      })
    }

    return { connected: inserted }
  },

  async disconnect(id: string): Promise<void> {
    await db.update(socialOauthAccounts)
      .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(socialOauthAccounts.id, id), isNull(socialOauthAccounts.revokedAt)))
  },
}
```

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/social/social-account.service.test.ts`
Expected: PASS (3/3)

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/social/social-account.service.ts src/__tests__/unit/services/social/social-account.service.test.ts
git commit -m "feat(social): SocialAccountService.connectMeta + listConnected + disconnect"
```

---

## Phase D — API-Routen (OAuth Start, Callback, Disconnect)

### Task 7: `GET /api/social/meta/oauth/start`

**Files:**
- Create: `src/app/api/social/meta/oauth/start/route.ts`
- Test: `src/__tests__/integration/api/social/meta-oauth-start.test.ts`

**Pattern wie Termin-Modul:** State signieren mit `appointmentTokenSecret` (re-use), Redirect zur Meta-Authorize-URL.

- [ ] **Step 1: Failing Test (state-signing + redirect)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, handler) => handler({ userId: 'u1', role: 'owner' })),
}))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ appointmentTokenSecret: 's'.repeat(64), tokenEncryptionKeyHex: 'a'.repeat(64) }) }
}))

beforeEach(() => {
  process.env.META_APP_ID = 'app1'
  process.env.META_APP_SECRET = 'sec1'
  process.env.META_OAUTH_REDIRECT_URI = 'https://example.com/cb'
})

describe('GET /api/social/meta/oauth/start', () => {
  it('returns 302 to facebook.com/.../dialog/oauth with state', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/start/route')
    const res = await GET(new Request('https://app/api/social/meta/oauth/start') as any)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('facebook.com')
    expect(loc).toContain('client_id=app1')
    expect(loc).toMatch(/state=[A-Za-z0-9_\-.]+/)
  })
})
```

- [ ] **Step 2: Implementierung**

Datei `src/app/api/social/meta/oauth/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { signState } from '@/lib/services/oauth-state'  // re-use existing helper from calendar OAuth

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    const stateRaw = JSON.stringify({ uid: auth.userId, n: nonce, t: Date.now() })
    const sig = signState(stateRaw, cfg.appointmentTokenSecret)
    const state = `${Buffer.from(stateRaw).toString('base64url')}.${sig}`
    const url = MetaOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}
```

(Falls `signState` nicht aus dem Calendar-Modul importierbar ist, in Task 5/6 in einen geteilten Helper extrahieren — Pattern nochmal prüfen.)

- [ ] **Step 3: Test grün, Commit**

```bash
git commit -am "feat(social): meta oauth start route"
```

---

### Task 8: `GET /api/social/meta/oauth/callback`

**Files:**
- Create: `src/app/api/social/meta/oauth/callback/route.ts`
- Test: `src/__tests__/integration/api/social/meta-oauth-callback.test.ts`

**Flow im Callback:**
1. Validate state (verify-signature + parse uid)
2. Wenn `error` Query-Param: redirect zu `/intern/integrations/social?error=...`
3. Listen Pages → wenn 0 Pages: Redirect mit Fehlermeldung
4. Wenn 1 Page → direkt connecten (auto-select), Redirect mit `?connected=meta`
5. Wenn ≥2 Pages → state-signed Auswahl-Cookie setzen, Redirect zu `/intern/integrations/social/meta-pick` (die Pick-Seite ruft dann eine 2. POST-Route — siehe Task 9)

**Phase-1-Vereinfachung:** Wir gehen davon aus, dass der Owner genau **eine** FB-Page hat (typisch). Bei ≥2 Pages: User-Friendly-Message "Mehrere Pages gefunden, bitte App nur für eine Page autorisieren" + Redirect mit `?error=multiple_pages_unsupported_v1`. **Multi-Page-Support ist ausdrücklich Out-of-Scope V1** (siehe Spec §8).

- [ ] **Step 1: Failing Tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const accountSvc = { connectMeta: vi.fn() }
vi.mock('@/lib/services/social/social-account.service', () => ({ SocialAccountService: accountSvc }))
const meta = { exchangeCode: vi.fn(), exchangeForLongLived: vi.fn(), listPagesWithIg: vi.fn() }
vi.mock('@/lib/services/social/meta-oauth.client', () => ({ MetaOAuthClient: meta }))
vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ appointmentTokenSecret: 's'.repeat(64) }) }
}))
const stateModule = { signState: (raw: string) => 'sig', verifyState: (s: string) => ({ uid: 'u1' }) }
vi.mock('@/lib/services/oauth-state', () => stateModule)

beforeEach(() => Object.values({ ...accountSvc, ...meta }).forEach((fn: any) => fn.mockReset?.()))

describe('GET /api/social/meta/oauth/callback', () => {
  it('redirects to intern with error if Meta returned ?error', async () => {
    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request('https://app/x?error=user_denied&state=abc') as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=user_denied')
  })

  it('auto-selects single page and connects', async () => {
    meta.exchangeCode.mockResolvedValue({ accessToken: 's', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'l', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([{ pageId: 'p1', pageName: 'X', pageAccessToken: 't', igUserId: null, igUsername: null }])
    accountSvc.connectMeta.mockResolvedValue({ connected: [{ provider: 'facebook' }] })
    const validState = `${Buffer.from(JSON.stringify({ uid: 'u1', n: 'n', t: Date.now() })).toString('base64url')}.sig`

    const { GET } = await import('@/app/api/social/meta/oauth/callback/route')
    const res = await GET(new Request(`https://app/x?code=CODE&state=${validState}`) as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('connected=meta')
    expect(accountSvc.connectMeta).toHaveBeenCalledWith({ code: 'CODE', selectedPageId: 'p1', userId: 'u1' })
  })

  it('redirects with error when no pages found', async () => { /* analog */ })
  it('redirects with error multiple_pages_unsupported_v1 when >1 page', async () => { /* analog */ })
})
```

- [ ] **Step 2: Implementierung**

Datei `src/app/api/social/meta/oauth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { verifyState } from '@/lib/services/oauth-state'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { SocialAccountService } from '@/lib/services/social/social-account.service'

const RETURN_PATH = '/intern/integrations/social'

function redirect(qs: Record<string, string>) {
  const url = new URL(RETURN_PATH, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  if (error) return redirect({ error })
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return redirect({ error: 'missing_code_or_state' })

  const cfg = await CalendarConfigService.getConfig()
  let parsed: { uid: string }
  try { parsed = verifyState(state, cfg.appointmentTokenSecret) }
  catch { return redirect({ error: 'invalid_state' }) }

  try {
    const short = await MetaOAuthClient.exchangeCode(code)
    const long = await MetaOAuthClient.exchangeForLongLived(short.accessToken)
    const pages = await MetaOAuthClient.listPagesWithIg(long.accessToken)
    if (pages.length === 0) return redirect({ error: 'no_pages_found' })
    if (pages.length > 1) return redirect({ error: 'multiple_pages_unsupported_v1' })
    await SocialAccountService.connectMeta({ code, selectedPageId: pages[0].pageId, userId: parsed.uid })
    // (Note: connectMeta re-runs exchangeCode internally — refactor opportunity, but simple for V1)
    return redirect({ connected: 'meta' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed'
    return redirect({ error: msg })
  }
}
```

> **Refactor-Hint:** `connectMeta` führt den Code-Exchange erneut aus — doppelt. Saubere Lösung: `SocialAccountService.connectMetaWithLongUserToken(longToken, selectedPageId, userId)` und der Callback macht den Exchange. Wenn der Test sich anfühlt wie unnötiger Detour, an dieser Stelle refactoren — aber **erst nachdem alle Tests grün sind**.

- [ ] **Step 3: Tests grün, Commit**

```bash
git commit -am "feat(social): meta oauth callback route"
```

---

### Task 9: `DELETE /api/v1/social/accounts/[id]`

**Files:**
- Create: `src/app/api/v1/social/accounts/[id]/route.ts`
- Test: `src/__tests__/integration/api/social/disconnect.test.ts`

- [ ] **Step 1: Failing Test**

```typescript
describe('DELETE /api/v1/social/accounts/[id]', () => {
  it('marks account as revoked and writes audit log', async () => {
    // setup: insert connected fb account, expect status to flip + audit log call
  })
  it('returns 403 without social_media:update permission', async () => { /* ... */ })
  it('returns 404 if account not found / already revoked', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implementierung**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { db } from '@/lib/db'
import { socialOauthAccounts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withPermission(request, 'social_media', 'update', async (auth) => {
    const [existing] = await db.select().from(socialOauthAccounts)
      .where(and(eq(socialOauthAccounts.id, id), eq(socialOauthAccounts.status, 'connected')))
      .limit(1)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await SocialAccountService.disconnect(id)
    await AuditLogService.log({
      userId: auth.userId, userRole: auth.role,
      action: 'social_account_revoked',
      entityType: 'social_oauth_accounts', entityId: id,
      payload: { provider: existing.provider, externalAccountId: existing.externalAccountId },
      request,
    })
    return NextResponse.json({ ok: true })
  })
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): disconnect endpoint + audit log"
```

---

## Phase E — UI

### Task 10: Sidebar-Eintrag "Social Media"

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Eintrag einfügen** (Position: sinnvoll bei „Marketing"/„Blog" oder Einstellungen-Bereich, je nach existierender Struktur)

```typescript
{ name: 'Social Media', href: '/intern/integrations/social', requiredModule: 'social_media' }
```

- [ ] **Step 2: Visuell prüfen** (Owner-Login → Sidebar zeigt Eintrag, Non-Owner → versteckt)

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): sidebar entry social media"
```

---

### Task 11: Settings-Seite `/intern/integrations/social`

**Files:**
- Create: `src/app/intern/(dashboard)/integrations/social/page.tsx` (Server-Component, lädt `listConnected()`)
- Create: `src/app/intern/(dashboard)/integrations/social/_components/AccountCards.tsx` (Client-Component, Connect/Disconnect-Buttons + Toast für `?connected`/`?error`)

**UX:**
- 4 Karten in einem Grid: **Facebook**, **Instagram**, **X**, **LinkedIn**
- Pro Karte: Provider-Logo, Status-Badge ("Verbunden" / "Nicht verbunden" / "Demnächst"), Account-Name (wenn verbunden), Connect/Disconnect-Button
- **Phase 1 nur Facebook + Instagram aktiv.** X- und LinkedIn-Karte: Badge "Demnächst", Button disabled.
- Connect-Button → `<a href="/api/social/meta/oauth/start">` (Browser-Redirect, kein fetch)
- Disconnect-Button → `fetch('/api/v1/social/accounts/{id}', { method: 'DELETE' })` + Refresh
- Query-Param-Toasts: `?connected=meta` → grün "Verbunden", `?error=...` → rot mit Mapping (`user_denied` → "Nicht autorisiert", `multiple_pages_unsupported_v1` → "Mehrere FB-Pages gefunden — bitte App nur für eine autorisieren", etc.)

- [ ] **Step 1: `page.tsx` (Server-Component)**

```typescript
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AccountCards } from './_components/AccountCards'

export default async function SocialIntegrationsPage({
  searchParams,
}: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const params = await searchParams
  const accounts = await SocialAccountService.listConnected()
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1">Social Media</h1>
      <p className="text-sm text-muted-foreground mb-6">Verbinde deine Plattform-Accounts.</p>
      <AccountCards accounts={accounts} flash={params} />
    </div>
  )
}
```

- [ ] **Step 2: `AccountCards.tsx` (Client-Component)**

Umfasst die 4 Karten + Toast-Handling. Für die Brevity zeige ich hier den Skeleton:

```typescript
'use client'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Provider-Icons aus lucide-react oder eigene SVGs

const PROVIDERS: Array<{
  key: 'facebook' | 'instagram' | 'x' | 'linkedin'
  label: string
  available: boolean
  connectHref?: string
}> = [
  { key: 'facebook', label: 'Facebook', available: true, connectHref: '/api/social/meta/oauth/start' },
  { key: 'instagram', label: 'Instagram', available: true, connectHref: '/api/social/meta/oauth/start' },
  { key: 'x', label: 'X', available: false },
  { key: 'linkedin', label: 'LinkedIn', available: false },
]

const ERROR_LABELS: Record<string, string> = {
  user_denied: 'Du hast die Verknüpfung abgelehnt.',
  no_pages_found: 'Kein FB-Page-Account gefunden — bitte vorher eine Page anlegen.',
  multiple_pages_unsupported_v1: 'Mehrere FB-Pages gefunden — die App muss derzeit für genau eine Page autorisiert werden.',
  invalid_state: 'Sicherheitsprüfung fehlgeschlagen — bitte Connect erneut starten.',
  missing_code_or_state: 'OAuth-Antwort unvollständig — bitte erneut versuchen.',
}

export function AccountCards({
  accounts, flash,
}: {
  accounts: Array<{ id: string; provider: string; accountName: string }>
  flash: { connected?: string; error?: string }
}) {
  useEffect(() => {
    if (flash.connected === 'meta') toast.success('Meta-Account verbunden')
    else if (flash.error) toast.error(ERROR_LABELS[flash.error] ?? `Fehler: ${flash.error}`)
  }, [flash.connected, flash.error])

  async function disconnect(id: string) {
    if (!confirm('Account wirklich trennen?')) return
    const res = await fetch(`/api/v1/social/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Getrennt')
      window.location.reload()
    } else {
      toast.error('Trennen fehlgeschlagen')
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map(p => {
        const linked = accounts.find(a => a.provider === p.key)
        return (
          <Card key={p.key}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{p.label}</div>
                {linked
                  ? <div className="text-sm text-muted-foreground">{linked.accountName}</div>
                  : <div className="text-sm text-muted-foreground">{p.available ? 'Nicht verbunden' : 'Demnächst'}</div>}
              </div>
              {linked
                ? <Button variant="outline" onClick={() => disconnect(linked.id)}>Trennen</Button>
                : p.available
                  ? <Button asChild><a href={p.connectHref!}>Verbinden</a></Button>
                  : <Button disabled>Demnächst</Button>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Visuell-Test im Browser**

- Owner-Login
- Page laden → sieht 4 Karten, FB+IG mit "Verbinden", X+LinkedIn mit "Demnächst" (disabled)
- "Verbinden" auf FB klicken → wird zu Meta umgeleitet → autorisiert → kommt zurück mit grünem Toast "Meta-Account verbunden"
- Page-Refresh → FB- und IG-Karte zeigen jetzt "Trennen" + Account-Namen
- "Trennen" → Confirm → grüner Toast → beide Karten zurück auf "Verbinden"

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(social): integrations settings page + connect/disconnect UI"
```

---

## Phase F — Token-Refresh-Cron-Skeleton

### Task 12: Task-Type `social_token_refresh` registrieren

**Files:**
- Modify: `src/lib/services/task-queue.service.ts` (Handler-Switch)

- [ ] **Step 1: Handler-Case ergänzen (Phase 1: No-Op + Log)**

```typescript
case 'social_token_refresh': {
  // Phase 1 placeholder — refresh logic implemented in Phase 2/3 when first posts exist.
  console.log(`[task-queue] social_token_refresh tick — skeleton only (no refresh in phase 1)`)
  return { success: true, status: 'completed' }
}
```

- [ ] **Step 2: Test (Smoke)**

```typescript
it('handles social_token_refresh task as no-op in phase 1', async () => {
  // dispatch a fake task with type='social_token_refresh', expect status='completed'
})
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): register social_token_refresh task type (skeleton)"
```

---

## Phase G — Audit-Logs für Connect

### Task 13: AuditLog-Eintrag bei Connect

**Files:**
- Modify: `src/app/api/social/meta/oauth/callback/route.ts` (Audit-Log nach erfolgreichem `connectMeta`)

- [ ] **Step 1: Audit-Log-Aufruf nach `connectMeta` einfügen**

```typescript
const { connected } = await SocialAccountService.connectMeta({ code, selectedPageId: pages[0].pageId, userId: parsed.uid })
for (const acc of connected) {
  await AuditLogService.log({
    userId: parsed.uid, userRole: 'owner',  // callback hat keine session — owner ist konvention
    action: 'social_account_connected',
    entityType: 'social_oauth_accounts', entityId: acc.id,
    payload: { provider: acc.provider, externalAccountId: acc.externalAccountId, accountName: acc.accountName },
    request,
  })
}
```

- [ ] **Step 2: Integration-Test prüft, dass Audit-Log-Insert passiert**

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(social): audit log on connect/disconnect"
```

---

## Phase H — End-to-End Smoke-Test im Browser

### Task 14: Manueller E2E gegen echte Meta-App

**Voraussetzung:** Eine Meta-App im [Meta-Developer-Dashboard](https://developers.facebook.com/apps/) angelegt mit:
- Produkt: "Facebook Login" + "Instagram Graph API"
- App-Domain: `bos.dev.xkmu.de` (oder wo die App läuft)
- Valid OAuth Redirect URI: `https://bos.dev.xkmu.de/api/social/meta/oauth/callback`
- Permissions: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
- Status: **Development Mode** ist OK für ersten Test (eigener Account ist Tester)

ENV setzen:
- `META_APP_ID=...`
- `META_APP_SECRET=...`
- `META_OAUTH_REDIRECT_URI=https://bos.dev.xkmu.de/api/social/meta/oauth/callback`

- [ ] **Schritt 1:** App neu deployen mit ENV
- [ ] **Schritt 2:** Owner-Login → `/intern/integrations/social`
- [ ] **Schritt 3:** "FB verbinden" → Meta-Auth → zustimmen
- [ ] **Schritt 4:** Verifizieren: zwei Einträge in `social_oauth_accounts` (FB + IG, gleiches Token-Encryption-Format `<iv>:<ct>:<tag>`)
- [ ] **Schritt 5:** Audit-Log: 2× `social_account_connected` Einträge
- [ ] **Schritt 6:** UI zeigt FB-Account-Name + IG-Username
- [ ] **Schritt 7:** "Trennen" auf FB → DB-Status `revoked` für FB-Eintrag (IG bleibt zunächst connected — separat trennen)
- [ ] **Schritt 8:** Edge-Cases probieren:
  - User klickt "Abbrechen" auf Meta-Seite → Toast "Du hast die Verknüpfung abgelehnt"
  - State manipulieren (Browser-Tools) → Toast "Sicherheitsprüfung fehlgeschlagen"

---

## Self-Review Checklist (vor PR)

- [ ] Alle 13 Tasks committed, Tests grün (`npm run test:unit` + `:integration`)
- [ ] `npm run db:migrate` läuft ohne Fehler durch
- [ ] `npm run db:generate` produziert keine neuen Diffs (Schema = Drizzle = SQL)
- [ ] Typecheck sauber: `npx tsc --noEmit`
- [ ] Lint sauber: `npm run lint`
- [ ] E2E-Smoke (Task 14) durchgespielt mit echter Meta-App
- [ ] Audit-Log-Einträge sichtbar in `/intern/audit-log` (oder wo immer das UI ist)
- [ ] Sidebar-Eintrag erscheint nur für Owner
- [ ] `/intern/integrations/social` 4 Karten, FB+IG aktiv, X+LI disabled
- [ ] ENV-Vars `META_APP_ID/SECRET/REDIRECT_URI` dokumentiert in `.env.example`

## Out-of-Scope-Reminder

- Token-Refresh-Body kommt in Phase 2/3 (jetzt nur Skeleton-Handler)
- Posts/Posting/Schedule kommt in Phase 2/3
- Multi-Page-Support nicht in V1 (Spec §8)
- Long-Lived-Token-Auto-Renewal vor Ablauf nicht in Phase 1 (proaktiver Cron-Body kommt mit Phase 2/3)

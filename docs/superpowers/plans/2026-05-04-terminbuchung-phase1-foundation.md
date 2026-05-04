# Terminbuchung Phase 1 — Foundation (Schema + Google-OAuth + Connect-UI) — Implementation Plan

> **Plan-Pakete für Terminbuchung**
> - **Phase 1 (diese Datei):** Schema-Grundlage, Permission, Token-Krypto, OAuth-Flow, Connect/Disconnect-UI. **Noch kein** Buchungsflow, **kein** Sync, **keine** Slot-Typen.
> - **Phase 2:** Slot-Typen + Verfügbarkeit (Wochenraster + Overrides) + Backend-Kalender-Übersicht
> - **Phase 3:** Push-Webhook + `external_busy` + Channel-Renewal-Cron + Token-Refresh-Cron
> - **Phase 4:** Öffentliche Buchungsseite + availability-API + book-API + Live-FreeBusy + Event-Insert + Confirmation-Mail
> - **Phase 5:** Reminder-Mails + Storno + Umbuchung
> - **Phase 6:** Portal-Variante mit Vorbefüllung
> - **Phase 7:** Manuelle Buchung im Backend
> - **Phase 8:** Polish (`.ics`, Add-to-Calendar, Audit-Log-Einträge, Error-Banner)
>
> Reihenfolge strikt 1 → 8. Jede Phase ist eigenständig deploybar.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitarbeiter können im neuen `/intern/termine/calendar-connect`-Bereich ihren persönlichen Google-Account koppeln. Tokens werden AES-256-GCM-verschlüsselt gespeichert. Kalender-Liste wird abgerufen, User wählt einen `primary_calendar_id` (für künftige Buchungen) und togglet `read_for_busy` pro Kalender. Disconnect revoked Tokens und löscht den Account-Datensatz. **Noch keine Buchungs-UI, kein Sync, keine Termine.**

**Architecture:** Zwei neue Tabellen (`user_calendar_accounts`, `user_calendars_watched`) + sechs Spalten-Erweiterungen an `users`. Drei Services: `calendar-token-crypto`, `calendar-account.service`, `calendar-google.client` (Thin-Wrapper für OAuth + `calendar.list` — `watch`/`freebusy`/`events.*` kommen erst in späteren Phasen). Drei API-Routen: `/api/google-calendar/oauth/start`, `/api/google-calendar/oauth/callback`, `/api/v1/calendar-account` (PATCH + DELETE). Eine Settings-Seite `/intern/termine/calendar-connect`. Sidebar-Eintrag „Termine" hinzugefügt.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Postgres), Zod, Vitest. Node-eingebautes `crypto` für AES-256-GCM. Google Calendar API direkt (kein `googleapis`-npm-Package — REST-Calls über `fetch` reichen).

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` (§1.1, §1.2, §1.8, §2.6, §5.1–§5.5, §3.4)

**Codebase-Patterns, die der Plan strikt befolgt:**
- Services als `export const FooService = { method() { ... } }` (kein DI; Pattern aus `contract-template.service.ts` etc.)
- API mit `withPermission(request, MODULE, ACTION, async (auth) => { ... })` aus `@/lib/auth/require-permission`
- Permission-Modul: **`appointments`** (neu) mit Standard-CRUD-Actions; `calendar.connect` wird pragmatisch auf `('appointments', 'update')` gemappt (Pattern wie elearning publish/unpublish auf `update`).
- DB-Mock in Service-Tests: `setupDbMock()` aus `src/__tests__/helpers/mock-db.ts` + `vi.resetModules()` + dynamic import
- Service-Tests: `src/__tests__/unit/services/...`
- API-Tests: `src/__tests__/integration/api/...`

**Deviation gegenüber Spec:** Spec §2.6 nennt `appointments.read.own` / `*.all` / `slot_types.manage` / `availability.manage` / `calendar.connect`. Das aktuelle Permission-System unterstützt nur Module + CRUD-Actions ohne `.own`/`.all`-Suffix. Wir mappen daher alles auf das eine Modul `appointments` mit Standard-CRUD. Owner-Privileg über bestehenden RBAC-Owner-Status (kein Spec-Konflikt — nur granularer als spezifiziert).

---

## Phase A — Foundation (Schema, Permission, Env)

### Task 1: SQL-Migration + Drizzle-Schema-Erweiterung

**Files:**
- Create: `drizzle/migrations/0039_calendar_accounts.sql`
- Modify: `src/lib/db/schema.ts` (am Ende anhängen)
- Modify: `src/lib/db/table-whitelist.ts` (zwei neue Tabellen aufnehmen — Pattern aus Commit `ce19d3e3`)

- [ ] **Step 1: SQL-Migration anlegen**

Datei `drizzle/migrations/0039_calendar_accounts.sql`:

```sql
-- Terminbuchung Phase 1: Calendar-Account-Verknüpfungen

-- Erweiterung users
ALTER TABLE users
  ADD COLUMN booking_slug         varchar(60) UNIQUE,
  ADD COLUMN booking_page_active  boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_page_title   varchar(255),
  ADD COLUMN booking_page_subtitle varchar(255),
  ADD COLUMN booking_page_intro   text,
  ADD COLUMN timezone             varchar(64) NOT NULL DEFAULT 'Europe/Berlin';

-- Gekoppelte Google-Accounts
CREATE TABLE user_calendar_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              varchar(20) NOT NULL DEFAULT 'google',
  google_email          varchar(255) NOT NULL,
  access_token_enc      text NOT NULL,
  refresh_token_enc     text NOT NULL,
  token_expires_at      timestamptz NOT NULL,
  scopes                text[] NOT NULL DEFAULT '{}',
  primary_calendar_id   varchar(255),
  watch_channel_id      uuid,
  watch_resource_id     varchar(255),
  watch_expires_at      timestamptz,
  sync_token            text,
  last_message_number   bigint,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_calendar_accounts_user ON user_calendar_accounts(user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_user_calendar_accounts_active ON user_calendar_accounts(user_id, provider) WHERE revoked_at IS NULL;

-- Pro Account: welche Kalender als belegt zählen
CREATE TABLE user_calendars_watched (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES user_calendar_accounts(id) ON DELETE CASCADE,
  google_calendar_id  varchar(255) NOT NULL,
  display_name        varchar(255) NOT NULL,
  read_for_busy       boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, google_calendar_id)
);
CREATE INDEX idx_user_calendars_watched_account ON user_calendars_watched(account_id);
```

- [ ] **Step 2: Drizzle-Schema in `schema.ts` ergänzen**

Am Ende von `src/lib/db/schema.ts` anhängen (nach existierenden Tabellen):

```typescript
// ============================================================================
// Terminbuchung Phase 1 — Calendar-Account-Verknüpfungen
// ============================================================================

export const userCalendarAccounts = pgTable('user_calendar_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull().default('google'),
  googleEmail: varchar('google_email', { length: 255 }).notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  primaryCalendarId: varchar('primary_calendar_id', { length: 255 }),
  watchChannelId: uuid('watch_channel_id'),
  watchResourceId: varchar('watch_resource_id', { length: 255 }),
  watchExpiresAt: timestamp('watch_expires_at', { withTimezone: true }),
  syncToken: text('sync_token'),
  lastMessageNumber: bigint('last_message_number', { mode: 'number' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userCalendarAccountsRelations = relations(userCalendarAccounts, ({ one, many }) => ({
  user: one(users, { fields: [userCalendarAccounts.userId], references: [users.id] }),
  watchedCalendars: many(userCalendarsWatched),
}))

export type UserCalendarAccount = typeof userCalendarAccounts.$inferSelect
export type NewUserCalendarAccount = typeof userCalendarAccounts.$inferInsert

export const userCalendarsWatched = pgTable('user_calendars_watched', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => userCalendarAccounts.id, { onDelete: 'cascade' }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  readForBusy: boolean('read_for_busy').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqAccountCalendar: unique().on(table.accountId, table.googleCalendarId),
}))

export const userCalendarsWatchedRelations = relations(userCalendarsWatched, ({ one }) => ({
  account: one(userCalendarAccounts, { fields: [userCalendarsWatched.accountId], references: [userCalendarAccounts.id] }),
}))

export type UserCalendarWatched = typeof userCalendarsWatched.$inferSelect
export type NewUserCalendarWatched = typeof userCalendarsWatched.$inferInsert
```

`users`-Definition: zusätzlich die sechs neuen Spalten ergänzen (an passender Stelle in der bestehenden `users`-Definition, nicht hier replizieren — TS-Typ folgt automatisch):

```typescript
// im pgTable('users', { ... }) ergänzen:
bookingSlug: varchar('booking_slug', { length: 60 }).unique(),
bookingPageActive: boolean('booking_page_active').notNull().default(false),
bookingPageTitle: varchar('booking_page_title', { length: 255 }),
bookingPageSubtitle: varchar('booking_page_subtitle', { length: 255 }),
bookingPageIntro: text('booking_page_intro'),
timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Berlin'),
```

Imports am Datei-Anfang prüfen: `bigint`, `unique`, `boolean` müssen aus `drizzle-orm/pg-core` importiert sein (sind vermutlich schon dort).

- [ ] **Step 3: Whitelist erweitern**

`src/lib/db/table-whitelist.ts`: in der Liste der erlaubten Tabellen für Import/Export hinzufügen:

```typescript
'user_calendar_accounts',
'user_calendars_watched',
```

- [ ] **Step 4: Migration ausführen**

```bash
npm run db:migrate
```

Erwartet: keine Fehler. Schema-Diff prüfen:

```bash
npm run db:studio
```

Tabellen `user_calendar_accounts` und `user_calendars_watched` existieren, `users` hat die neuen Spalten.

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0039_calendar_accounts.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat(termine): schema for calendar account linking (Phase 1)"
```

---

### Task 2: Permission-Modul `appointments` registrieren

**Files:**
- Modify: `src/lib/types/permissions.ts`
- Modify: `src/lib/db/seeds/*` falls dort Default-Permissions geseedet werden (prüfen — wenn ja, `appointments`-Defaults ergänzen)

- [ ] **Step 1: Modul zur `MODULES`-Liste hinzufügen**

In `src/lib/types/permissions.ts`:

```typescript
export const MODULES = [
  // ... bestehende Module ...
  'appointments',
] as const
```

Und im `MODULE_LABELS`-Objekt:

```typescript
export const MODULE_LABELS: Record<Module, string> = {
  // ... bestehende ...
  appointments: 'Termine',
}
```

Falls eine `MODULE_DESCRIPTIONS` oder ähnliche Map existiert: ebenfalls Eintrag ergänzen.

- [ ] **Step 2: TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine neuen Fehler durch das hinzugefügte Modul.

- [ ] **Step 3: Default-Permissions für Owner-Rolle prüfen**

`src/lib/db/seeds/`-Dateien (oder dort wo Rollen geseedet werden) durchsuchen nach existierenden Modulen wie `'documents'` oder `'courses'`. Falls Owner-Rolle dort hardcoded alle Module mit allen CRUD-Actions bekommt: keine Änderung nötig (greift automatisch über `MODULES`-Iteration). Falls einzelne Module aufgelistet sind: `'appointments': { create: true, read: true, update: true, delete: true }` ergänzen.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/permissions.ts src/lib/db/seeds/
git commit -m "feat(termine): register appointments permission module"
```

---

### Task 3: Environment-Variablen dokumentieren

**Files:**
- Modify: `.env.example` (oder vergleichbares Template — falls nicht vorhanden, im README ergänzen)
- Create: `src/lib/services/calendar-env.ts`

- [ ] **Step 1: Env-Vars dokumentieren**

In `.env.example` anhängen:

```env
# ── Terminbuchung / Google Calendar ──
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://app.example.com/api/google-calendar/oauth/callback
# 32 bytes hex (64 chars). Erzeugen: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CALENDAR_TOKEN_KEY=
# beliebige zufällige Zeichenkette (≥ 32 chars) für HMAC der Storno-/Umbuchungs-Tokens
APPOINTMENT_TOKEN_SECRET=
# absolute Public-URL der App (für Redirects + spätere Mail-Links)
APP_PUBLIC_URL=https://app.example.com
```

- [ ] **Step 2: Helper für Env-Validierung anlegen**

Datei `src/lib/services/calendar-env.ts`:

```typescript
/**
 * Liefert die Calendar-Env-Vars oder wirft, wenn nicht vollständig gesetzt.
 * Soft-Disable an Aufruf-Sites: try/catch und Fallback auf "Feature deaktiviert"-Branch.
 */
export interface CalendarEnv {
  clientId: string
  clientSecret: string
  redirectUri: string
  tokenKey: Buffer
  appointmentTokenSecret: string
  appPublicUrl: string
}

export function getCalendarEnv(): CalendarEnv {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI
  const tokenKeyHex = process.env.CALENDAR_TOKEN_KEY
  const appointmentTokenSecret = process.env.APPOINTMENT_TOKEN_SECRET
  const appPublicUrl = process.env.APP_PUBLIC_URL

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID/SECRET/REDIRECT_URI not configured')
  }
  if (!tokenKeyHex || tokenKeyHex.length !== 64) {
    throw new Error('CALENDAR_TOKEN_KEY must be 32 bytes hex (64 chars)')
  }
  if (!appointmentTokenSecret || appointmentTokenSecret.length < 32) {
    throw new Error('APPOINTMENT_TOKEN_SECRET must be at least 32 chars')
  }
  if (!appPublicUrl) {
    throw new Error('APP_PUBLIC_URL not configured')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    tokenKey: Buffer.from(tokenKeyHex, 'hex'),
    appointmentTokenSecret,
    appPublicUrl,
  }
}

export function isCalendarFeatureEnabled(): boolean {
  try {
    getCalendarEnv()
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add .env.example src/lib/services/calendar-env.ts
git commit -m "feat(termine): env vars for Google Calendar integration"
```

---

## Phase B — Services (Crypto, Account, Google-Client)

### Task 4: Token-Verschlüsselung (AES-256-GCM)

**Files:**
- Create: `src/lib/services/calendar-token-crypto.ts`
- Test: `src/__tests__/unit/services/calendar-token-crypto.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/unit/services/calendar-token-crypto.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('calendar-token-crypto', () => {
  beforeEach(() => {
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)  // 32 bytes hex
  })

  it('round-trips a token plaintext through encrypt/decrypt', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const plain = 'ya29.a0AfH6SMBabcdef.refresh-stuff'
    const cipher = encryptToken(plain)
    expect(cipher).not.toContain(plain)
    expect(cipher.split(':').length).toBe(3)
    const back = decryptToken(cipher)
    expect(back).toBe(plain)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    const a = encryptToken('same')
    const b = encryptToken('same')
    expect(a).not.toBe(b)
  })

  it('rejects tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const cipher = encryptToken('hello')
    const [iv, ct, tag] = cipher.split(':')
    const tampered = `${iv}:${ct.replace(/.$/, ct.endsWith('a') ? 'b' : 'a')}:${tag}`
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('throws if CALENDAR_TOKEN_KEY is missing or wrong length', async () => {
    process.env.CALENDAR_TOKEN_KEY = 'short'
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    expect(() => encryptToken('x')).toThrow()
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

```bash
npx vitest run src/__tests__/unit/services/calendar-token-crypto.test.ts
```

Erwartet: FAIL (Modul existiert noch nicht).

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/calendar-token-crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(): Buffer {
  const hex = process.env.CALENDAR_TOKEN_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('CALENDAR_TOKEN_KEY must be 32 bytes hex (64 chars)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * AES-256-GCM. Format: <iv_hex>:<ciphertext_hex>:<authtag_hex>
 */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`
}

export function decryptToken(stored: string): string {
  const key = getKey()
  const [ivHex, ctHex, tagHex] = stored.split(':')
  if (!ivHex || !ctHex || !tagHex) throw new Error('Invalid token ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(ct), decipher.final()])
  return out.toString('utf8')
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

```bash
npx vitest run src/__tests__/unit/services/calendar-token-crypto.test.ts
```

Erwartet: alle 4 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/calendar-token-crypto.ts src/__tests__/unit/services/calendar-token-crypto.test.ts
git commit -m "feat(termine): AES-256-GCM token crypto for calendar credentials"
```

---

### Task 5: Google Calendar Client (OAuth + Calendar.list)

Thin Wrapper. **Nur** die für Phase 1 nötigen Endpoints (Code-Exchange, Token-Refresh, Calendar.list, Token-Revoke). `watch`/`freebusy`/`events.*` kommen in Phase 3+.

**Files:**
- Create: `src/lib/services/calendar-google.client.ts`
- Test: `src/__tests__/unit/services/calendar-google.client.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/unit/services/calendar-google.client.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('calendar-google.client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret'
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.x/cb'
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    process.env.APPOINTMENT_TOKEN_SECRET = '0'.repeat(40)
    process.env.APP_PUBLIC_URL = 'https://app.x'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('exchangeCode posts to Google token endpoint and returns parsed tokens', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: 'AT', refresh_token: 'RT', expires_in: 3600, scope: 'https://www.googleapis.com/auth/calendar',
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const tokens = await CalendarGoogleClient.exchangeCode('CODE')
    expect(tokens.accessToken).toBe('AT')
    expect(tokens.refreshToken).toBe('RT')
    expect(tokens.expiresInSec).toBe(3600)
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('https://oauth2.googleapis.com/token')
    expect(call[1].method).toBe('POST')
  })

  it('refreshAccessToken posts refresh_token grant', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: 'NEW_AT', expires_in: 3600,
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const out = await CalendarGoogleClient.refreshAccessToken('RT')
    expect(out.accessToken).toBe('NEW_AT')
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('RT')
  })

  it('listCalendars returns parsed items', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        { id: 'primary', summary: 'Tino', primary: true },
        { id: 'foo@group.calendar.google.com', summary: 'Team' },
      ],
    })))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const cals = await CalendarGoogleClient.listCalendars('AT')
    expect(cals).toHaveLength(2)
    expect(cals[0].id).toBe('primary')
    expect(cals[0].isPrimary).toBe(true)
  })

  it('throws on non-2xx response with body excerpt', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"invalid_grant"}', { status: 400 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await expect(CalendarGoogleClient.refreshAccessToken('bad')).rejects.toThrow(/invalid_grant/)
  })

  it('revokeToken posts to revoke endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    await CalendarGoogleClient.revokeToken('AT')
    expect(fetchMock.mock.calls[0][0]).toMatch(/revoke/)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL**

```bash
npx vitest run src/__tests__/unit/services/calendar-google.client.test.ts
```

Erwartet: FAIL (Modul fehlt).

- [ ] **Step 3: Client implementieren**

Datei `src/lib/services/calendar-google.client.ts`:

```typescript
import { getCalendarEnv } from './calendar-env'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'

export interface ExchangeResult {
  accessToken: string
  refreshToken: string
  expiresInSec: number
  scopes: string[]
}

export interface RefreshResult {
  accessToken: string
  expiresInSec: number
}

export interface CalendarListEntry {
  id: string
  summary: string
  isPrimary: boolean
}

async function postForm(url: string, params: URLSearchParams): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`Google API ${res.status}: ${body.slice(0, 200)}`)
}

export const CalendarGoogleClient = {
  async exchangeCode(code: string): Promise<ExchangeResult> {
    const env = getCalendarEnv()
    const res = await postForm(TOKEN_URL, new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: 'authorization_code',
    }))
    await ensureOk(res)
    const json = await res.json() as {
      access_token: string; refresh_token?: string; expires_in: number; scope: string
    }
    if (!json.refresh_token) {
      throw new Error('Google did not return a refresh_token (consent likely already given — re-run with prompt=consent)')
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresInSec: json.expires_in,
      scopes: json.scope.split(' ').filter(Boolean),
    }
  },

  async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
    const env = getCalendarEnv()
    const res = await postForm(TOKEN_URL, new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'refresh_token',
    }))
    await ensureOk(res)
    const json = await res.json() as { access_token: string; expires_in: number }
    return { accessToken: json.access_token, expiresInSec: json.expires_in }
  },

  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    const res = await fetch(CALENDAR_LIST_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    await ensureOk(res)
    const json = await res.json() as {
      items: Array<{ id: string; summary: string; primary?: boolean }>
    }
    return json.items.map(i => ({ id: i.id, summary: i.summary, isPrimary: i.primary === true }))
  },

  async revokeToken(token: string): Promise<void> {
    const res = await postForm(REVOKE_URL, new URLSearchParams({ token }))
    // 200 wenn ok, 400 wenn schon revoked — beides akzeptieren
    if (res.status !== 200 && res.status !== 400) {
      await ensureOk(res)
    }
  },
}
```

- [ ] **Step 4: Test laufen lassen — PASS**

```bash
npx vitest run src/__tests__/unit/services/calendar-google.client.test.ts
```

Erwartet: alle 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/calendar-google.client.ts src/__tests__/unit/services/calendar-google.client.test.ts
git commit -m "feat(termine): Google Calendar API client (OAuth + calendar.list)"
```

---

### Task 6: CalendarAccountService (CRUD + Refresh-on-demand)

**Files:**
- Create: `src/lib/services/calendar-account.service.ts`
- Test: `src/__tests__/unit/services/calendar-account.service.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/unit/services/calendar-account.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/db', () => ({ db: setupDbMock().db }))
vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    refreshAccessToken: vi.fn(),
    revokeToken: vi.fn(),
    exchangeCode: vi.fn(),
    listCalendars: vi.fn(),
  },
}))

describe('CalendarAccountService', () => {
  beforeEach(() => {
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    vi.resetModules()
  })

  it('storeNewAccount encrypts both tokens and inserts watched calendars', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'acc-1' }])
    helper.insertMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const acc = await CalendarAccountService.storeNewAccount({
      userId: 'u-1',
      googleEmail: 'tino@x.de',
      accessToken: 'AT', refreshToken: 'RT', expiresInSec: 3600,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      calendars: [
        { id: 'primary', summary: 'Tino', isPrimary: true },
        { id: 'foo', summary: 'Team', isPrimary: false },
      ],
    })
    expect(acc.id).toBe('acc-1')
    expect(helper.db.insert).toHaveBeenCalledTimes(2)
  })

  it('getValidAccessToken returns stored token when not near expiry', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      accessTokenEnc: encryptToken('AT_VALID'),
      refreshTokenEnc: encryptToken('RT'),
      tokenExpiresAt: new Date(Date.now() + 10 * 60_000), // 10 min in Zukunft
      revokedAt: null,
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const tok = await CalendarAccountService.getValidAccessToken('acc-1')
    expect(tok).toBe('AT_VALID')
  })

  it('getValidAccessToken refreshes when expiry < 60s away', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      accessTokenEnc: encryptToken('AT_OLD'),
      refreshTokenEnc: encryptToken('RT'),
      tokenExpiresAt: new Date(Date.now() + 30_000), // 30s
      revokedAt: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.refreshAccessToken).mockResolvedValueOnce({
      accessToken: 'AT_NEW', expiresInSec: 3600,
    })
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    const tok = await CalendarAccountService.getValidAccessToken('acc-1')
    expect(tok).toBe('AT_NEW')
    expect(helper.db.update).toHaveBeenCalled()
  })

  it('revoke marks revoked_at and best-effort revokes upstream', async () => {
    const helper = setupDbMock()
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    helper.selectMock.mockResolvedValueOnce([{
      id: 'acc-1',
      refreshTokenEnc: encryptToken('RT'),
      revokedAt: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    await CalendarAccountService.revoke('acc-1')
    expect(helper.db.update).toHaveBeenCalled()
  })
})
```

(Hinweis: `setupDbMock()` muss `insertMock`, `selectMock`, `updateMock`, `deleteMock` als Properties exposen, damit Tests einzelne Calls beeinflussen können — falls aktuell nur `db` zurückgegeben wird, in Step 1 zusätzlich erweitern.)

- [ ] **Step 2: Falls `setupDbMock()` Mock-Manager nicht zurückgibt — erweitern**

In `src/__tests__/helpers/mock-db.ts` Return-Wert anpassen:

```typescript
return { db, insertMock, selectMock, updateMock, deleteMock }
```

- [ ] **Step 3: Test laufen lassen — FAIL**

```bash
npx vitest run src/__tests__/unit/services/calendar-account.service.test.ts
```

- [ ] **Step 4: Service implementieren**

Datei `src/lib/services/calendar-account.service.ts`:

```typescript
import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { encryptToken, decryptToken } from './calendar-token-crypto'
import { CalendarGoogleClient, type CalendarListEntry } from './calendar-google.client'

export interface StoreNewAccountInput {
  userId: string
  googleEmail: string
  accessToken: string
  refreshToken: string
  expiresInSec: number
  scopes: string[]
  calendars: CalendarListEntry[]
}

export const CalendarAccountService = {
  async getActiveAccount(userId: string) {
    const rows = await db.select().from(userCalendarAccounts).where(
      and(eq(userCalendarAccounts.userId, userId), isNull(userCalendarAccounts.revokedAt)),
    ).limit(1)
    return rows[0] ?? null
  },

  async getById(accountId: string) {
    const rows = await db.select().from(userCalendarAccounts).where(eq(userCalendarAccounts.id, accountId)).limit(1)
    return rows[0] ?? null
  },

  async storeNewAccount(input: StoreNewAccountInput) {
    const expiresAt = new Date(Date.now() + input.expiresInSec * 1000)
    const primary = input.calendars.find(c => c.isPrimary)
    const [acc] = await db.insert(userCalendarAccounts).values({
      userId: input.userId,
      provider: 'google',
      googleEmail: input.googleEmail,
      accessTokenEnc: encryptToken(input.accessToken),
      refreshTokenEnc: encryptToken(input.refreshToken),
      tokenExpiresAt: expiresAt,
      scopes: input.scopes,
      primaryCalendarId: primary?.id ?? input.calendars[0]?.id ?? null,
    }).returning({ id: userCalendarAccounts.id })

    if (input.calendars.length > 0) {
      await db.insert(userCalendarsWatched).values(
        input.calendars.map(c => ({
          accountId: acc.id,
          googleCalendarId: c.id,
          displayName: c.summary,
          readForBusy: c.isPrimary,  // default: nur primary aktiv
        })),
      )
    }
    return acc
  },

  /**
   * Liefert einen gültigen Access-Token. Refresht wenn `< now + 60s`.
   * Concurrent-Schutz: pg advisory lock auf account_id (hash).
   */
  async getValidAccessToken(accountId: string): Promise<string> {
    const acc = await this.getById(accountId)
    if (!acc || acc.revokedAt) throw new Error(`Account ${accountId} not active`)

    const expiresAtMs = acc.tokenExpiresAt.getTime()
    if (expiresAtMs > Date.now() + 60_000) {
      return decryptToken(acc.accessTokenEnc)
    }

    // Refresh nötig — advisory lock setzen
    const lockKey = hashLockKey(accountId)
    await db.execute(sql`SELECT pg_advisory_lock(${lockKey})`)
    try {
      // Re-read nach Lock — vielleicht hat anderer Worker schon refreshed
      const fresh = await this.getById(accountId)
      if (fresh && fresh.tokenExpiresAt.getTime() > Date.now() + 60_000) {
        return decryptToken(fresh.accessTokenEnc)
      }
      try {
        const refreshed = await CalendarGoogleClient.refreshAccessToken(decryptToken(acc.refreshTokenEnc))
        const newExpires = new Date(Date.now() + refreshed.expiresInSec * 1000)
        await db.update(userCalendarAccounts).set({
          accessTokenEnc: encryptToken(refreshed.accessToken),
          tokenExpiresAt: newExpires,
          updatedAt: new Date(),
        }).where(eq(userCalendarAccounts.id, accountId))
        return refreshed.accessToken
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('invalid_grant')) {
          await db.update(userCalendarAccounts).set({
            revokedAt: new Date(), updatedAt: new Date(),
          }).where(eq(userCalendarAccounts.id, accountId))
        }
        throw err
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${lockKey})`)
    }
  },

  async revoke(accountId: string) {
    const acc = await this.getById(accountId)
    if (!acc || acc.revokedAt) return
    try {
      await CalendarGoogleClient.revokeToken(decryptToken(acc.refreshTokenEnc))
    } catch {
      // best-effort — wenn Google nicht erreichbar, lokal trotzdem revoken
    }
    await db.update(userCalendarAccounts).set({
      revokedAt: new Date(), updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },

  async listWatchedCalendars(accountId: string) {
    return db.select().from(userCalendarsWatched).where(eq(userCalendarsWatched.accountId, accountId))
  },

  async setPrimaryCalendar(accountId: string, googleCalendarId: string) {
    await db.update(userCalendarAccounts).set({
      primaryCalendarId: googleCalendarId, updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },

  async setReadForBusy(watchedId: string, readForBusy: boolean) {
    await db.update(userCalendarsWatched).set({ readForBusy })
      .where(eq(userCalendarsWatched.id, watchedId))
  },
}

function hashLockKey(uuid: string): number {
  // Stabiler 31-bit Hash für pg_advisory_lock (signed int4)
  let h = 0
  for (let i = 0; i < uuid.length; i++) {
    h = ((h << 5) - h + uuid.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
```

- [ ] **Step 5: Test laufen lassen — PASS**

```bash
npx vitest run src/__tests__/unit/services/calendar-account.service.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/calendar-account.service.ts src/__tests__/unit/services/calendar-account.service.test.ts src/__tests__/helpers/mock-db.ts
git commit -m "feat(termine): CalendarAccountService — store/refresh/revoke Google accounts"
```

---

## Phase C — API-Routen (OAuth + Account-Verwaltung)

### Task 7: OAuth-Start-Endpoint

**Files:**
- Create: `src/app/api/google-calendar/oauth/start/route.ts`
- Test: `src/__tests__/integration/api/google-calendar-oauth-start.test.ts`

State-Cookie: HMAC-signed JSON `{ userId, nonce, ts }`, 5 min TTL, HttpOnly + Secure + SameSite=Lax. Redirect zu Google mit `prompt=consent` (damit `refresh_token` immer geliefert wird) + `access_type=offline`.

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/integration/api/google-calendar-oauth-start.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
}))

describe('GET /api/google-calendar/oauth/start', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret'
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.x/cb'
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    process.env.APPOINTMENT_TOKEN_SECRET = '0'.repeat(40)
    process.env.APP_PUBLIC_URL = 'https://app.x'
    vi.resetModules()
  })

  it('redirects to Google with state cookie set', async () => {
    const { getAuthContext } = await import('@/lib/auth/auth-context')
    vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'u-1', role: 'owner' } as never)
    const { GET } = await import('@/app/api/google-calendar/oauth/start/route')
    const req = new Request('https://app.x/api/google-calendar/oauth/start')
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    const location = res.headers.get('location')!
    expect(location).toMatch(/^https:\/\/accounts\.google\.com\//)
    expect(location).toContain('access_type=offline')
    expect(location).toContain('prompt=consent')
    expect(location).toContain('client_id=cid')
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/calendar_oauth_state=/)
    expect(setCookie).toMatch(/HttpOnly/)
  })

  it('returns 401 when not authenticated', async () => {
    const { getAuthContext } = await import('@/lib/auth/auth-context')
    vi.mocked(getAuthContext).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/google-calendar/oauth/start/route')
    const res = await GET(new Request('https://app.x/api/google-calendar/oauth/start') as never)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL**

```bash
npx vitest run src/__tests__/integration/api/google-calendar-oauth-start.test.ts
```

- [ ] **Step 3: Endpoint implementieren**

Datei `src/app/api/google-calendar/oauth/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'node:crypto'
import { getAuthContext } from '@/lib/auth/auth-context'
import { getCalendarEnv } from '@/lib/services/calendar-env'

const STATE_COOKIE = 'calendar_oauth_state'
const STATE_TTL_MS = 5 * 60_000

function signState(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth || auth.role === 'api') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const env = getCalendarEnv()

  const nonce = randomBytes(16).toString('hex')
  const ts = Date.now()
  const stateRaw = JSON.stringify({ uid: auth.userId, n: nonce, t: ts })
  const sig = signState(stateRaw, env.appointmentTokenSecret)
  const state = `${Buffer.from(stateRaw).toString('base64url')}.${sig}`

  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  const res = NextResponse.redirect(url, 302)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_MS / 1000,
    path: '/',
  })
  return res
}
```

- [ ] **Step 4: Test PASS**

```bash
npx vitest run src/__tests__/integration/api/google-calendar-oauth-start.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/google-calendar/oauth/start/route.ts src/__tests__/integration/api/google-calendar-oauth-start.test.ts
git commit -m "feat(termine): OAuth start endpoint with HMAC-signed state cookie"
```

---

### Task 8: OAuth-Callback-Endpoint

Validiert State-Cookie, tauscht `code` → Tokens, holt Calendar-List, persistiert Account + Watched-Calendars, redirected zur Connect-UI mit `?connected=1`.

**Files:**
- Create: `src/app/api/google-calendar/oauth/callback/route.ts`
- Test: `src/__tests__/integration/api/google-calendar-oauth-callback.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/integration/api/google-calendar-oauth-callback.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    exchangeCode: vi.fn(),
    listCalendars: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    storeNewAccount: vi.fn(),
    getActiveAccount: vi.fn(),
  },
}))

function makeStateCookie(secret: string, userId = 'u-1'): { cookieValue: string; queryState: string } {
  const { createHmac } = require('node:crypto')
  const raw = JSON.stringify({ uid: userId, n: 'noncexx', t: Date.now() })
  const sig = createHmac('sha256', secret).update(raw).digest('hex')
  const state = `${Buffer.from(raw).toString('base64url')}.${sig}`
  return { cookieValue: state, queryState: state }
}

describe('GET /api/google-calendar/oauth/callback', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret'
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.x/cb'
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)
    process.env.APPOINTMENT_TOKEN_SECRET = 'S'.repeat(40)
    process.env.APP_PUBLIC_URL = 'https://app.x'
    vi.resetModules()
  })

  it('happy path: exchanges code, stores account, redirects', async () => {
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarGoogleClient.exchangeCode).mockResolvedValueOnce({
      accessToken: 'AT', refreshToken: 'RT', expiresInSec: 3600,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    vi.mocked(CalendarGoogleClient.listCalendars).mockResolvedValueOnce([
      { id: 'primary', summary: 'X', isPrimary: true },
    ])
    vi.mocked(CalendarAccountService.storeNewAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)

    const { cookieValue, queryState } = makeStateCookie('S'.repeat(40))
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=${encodeURIComponent(queryState)}`, {
      headers: { cookie: `calendar_oauth_state=${cookieValue}` },
    })
    const res = await GET(req as never)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/intern/termine/calendar-connect?connected=1')
    expect(CalendarAccountService.storeNewAccount).toHaveBeenCalled()
  })

  it('rejects mismatched state', async () => {
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=wrong`, {
      headers: { cookie: `calendar_oauth_state=different` },
    })
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('rejects when state cookie is missing', async () => {
    const { GET } = await import('@/app/api/google-calendar/oauth/callback/route')
    const req = new Request(`https://app.x/cb?code=CODE&state=anything`)
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Test FAIL**

```bash
npx vitest run src/__tests__/integration/api/google-calendar-oauth-callback.test.ts
```

- [ ] **Step 3: Endpoint implementieren**

Datei `src/app/api/google-calendar/oauth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getCalendarEnv } from '@/lib/services/calendar-env'
import { CalendarGoogleClient } from '@/lib/services/calendar-google.client'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'

const STATE_COOKIE = 'calendar_oauth_state'
const STATE_MAX_AGE_MS = 5 * 60_000

interface StatePayload { uid: string; n: string; t: number }

function verifyState(state: string, secret: string): StatePayload | null {
  const dot = state.lastIndexOf('.')
  if (dot < 0) return null
  const rawB64 = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const rawJson = Buffer.from(rawB64, 'base64url').toString('utf8')
  const expected = createHmac('sha256', secret).update(rawJson).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(rawJson) as StatePayload
    if (Date.now() - parsed.t > STATE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function errRedirect(reason: string) {
  return NextResponse.redirect(`/intern/termine/calendar-connect?error=${encodeURIComponent(reason)}`, 302)
}

export async function GET(request: NextRequest) {
  const env = getCalendarEnv()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const queryState = url.searchParams.get('state')
  const cookieState = request.cookies.get(STATE_COOKIE)?.value

  if (!code || !queryState || !cookieState || queryState !== cookieState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 })
  }
  const verified = verifyState(queryState, env.appointmentTokenSecret)
  if (!verified) {
    return NextResponse.json({ error: 'invalid_state_signature' }, { status: 400 })
  }

  // Existierenden aktiven Account prüfen — bei Reconnect erst alten revoken (kommt in V2; in V1 abbrechen)
  const existing = await CalendarAccountService.getActiveAccount(verified.uid)
  if (existing) {
    return errRedirect('already_connected')
  }

  let exchange
  try {
    exchange = await CalendarGoogleClient.exchangeCode(code)
  } catch (err) {
    return errRedirect(err instanceof Error ? err.message.slice(0, 80) : 'exchange_failed')
  }

  let calendars
  try {
    calendars = await CalendarGoogleClient.listCalendars(exchange.accessToken)
  } catch (err) {
    return errRedirect('calendar_list_failed')
  }

  // E-Mail des Users aus calendar list (primary.id ist meist gleich der E-Mail)
  const primary = calendars.find(c => c.isPrimary)
  const googleEmail = primary?.id ?? 'unknown'

  await CalendarAccountService.storeNewAccount({
    userId: verified.uid,
    googleEmail,
    accessToken: exchange.accessToken,
    refreshToken: exchange.refreshToken,
    expiresInSec: exchange.expiresInSec,
    scopes: exchange.scopes,
    calendars,
  })

  const res = NextResponse.redirect('/intern/termine/calendar-connect?connected=1', 302)
  res.cookies.delete(STATE_COOKIE)
  return res
}
```

- [ ] **Step 4: Test PASS**

```bash
npx vitest run src/__tests__/integration/api/google-calendar-oauth-callback.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/google-calendar/oauth/callback/route.ts src/__tests__/integration/api/google-calendar-oauth-callback.test.ts
git commit -m "feat(termine): OAuth callback — exchange code, persist account + calendars"
```

---

### Task 9: Account-Update-API (PATCH/DELETE)

PATCH: setzt `primary_calendar_id` oder togglet `read_for_busy` einer `user_calendars_watched`-Zeile.
DELETE: revoked Account.

**Files:**
- Create: `src/app/api/v1/calendar-account/route.ts`
- Test: `src/__tests__/integration/api/calendar-account.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Datei `src/__tests__/integration/api/calendar-account.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getActiveAccount: vi.fn(),
    setPrimaryCalendar: vi.fn(),
    setReadForBusy: vi.fn(),
    revoke: vi.fn(),
  },
}))

describe('PATCH /api/v1/calendar-account', () => {
  beforeEach(() => vi.resetModules())

  it('sets primary calendar', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setPrimary', googleCalendarId: 'cal-1' }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.setPrimaryCalendar).toHaveBeenCalledWith('acc-1', 'cal-1')
  })

  it('toggles read_for_busy', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setReadForBusy', watchedId: 'w-1', readForBusy: false }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.setReadForBusy).toHaveBeenCalledWith('w-1', false)
  })

  it('returns 404 when no active account', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce(null)
    const { PATCH } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'setPrimary', googleCalendarId: 'x' }),
    })
    const res = await PATCH(req as never)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/calendar-account', () => {
  beforeEach(() => vi.resetModules())

  it('revokes active account', async () => {
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValueOnce({ id: 'acc-1' } as never)
    const { DELETE } = await import('@/app/api/v1/calendar-account/route')
    const req = new Request('https://x/api/v1/calendar-account', { method: 'DELETE' })
    const res = await DELETE(req as never)
    expect(res.status).toBe(200)
    expect(CalendarAccountService.revoke).toHaveBeenCalledWith('acc-1')
  })
})
```

- [ ] **Step 2: Test FAIL**

```bash
npx vitest run src/__tests__/integration/api/calendar-account.test.ts
```

- [ ] **Step 3: Endpoint implementieren**

Datei `src/app/api/v1/calendar-account/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setPrimary'), googleCalendarId: z.string().min(1) }),
  z.object({ action: z.literal('setReadForBusy'), watchedId: z.string().uuid(), readForBusy: z.boolean() }),
])

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ account: null, calendars: [] })
    const calendars = await CalendarAccountService.listWatchedCalendars(account.id)
    return NextResponse.json({
      account: {
        id: account.id,
        googleEmail: account.googleEmail,
        primaryCalendarId: account.primaryCalendarId,
        connectedAt: account.createdAt,
      },
      calendars,
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    const body = PatchSchema.parse(await request.json())
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })

    if (body.action === 'setPrimary') {
      await CalendarAccountService.setPrimaryCalendar(account.id, body.googleCalendarId)
    } else {
      await CalendarAccountService.setReadForBusy(body.watchedId, body.readForBusy)
    }
    return NextResponse.json({ ok: true })
  })
}

export async function DELETE(request: NextRequest) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })
    await CalendarAccountService.revoke(account.id)
    return NextResponse.json({ ok: true })
  })
}
```

- [ ] **Step 4: Test PASS**

```bash
npx vitest run src/__tests__/integration/api/calendar-account.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/calendar-account/route.ts src/__tests__/integration/api/calendar-account.test.ts
git commit -m "feat(termine): /api/v1/calendar-account GET/PATCH/DELETE"
```

---

## Phase D — UI (Connect-Seite + Sidebar-Eintrag)

### Task 10: Sidebar-Eintrag „Termine"

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (zwischen „Onlinekurse" und „E-Mail Inbox" einfügen)

- [ ] **Step 1: Icon importieren und Eintrag ergänzen**

In `src/components/layout/sidebar.tsx` neben den vorhandenen lucide-Imports `CalendarDays` ergänzen:

```typescript
import { CalendarDays, /* ... bestehende ... */ } from 'lucide-react'
```

Nach dem Onlinekurse-Block (vor „E-Mail Inbox"):

```typescript
// ── Termine (standalone) ──
{
  name: 'Termine',
  href: '/intern/termine',
  icon: CalendarDays,
  requiredModule: 'appointments',
},
```

- [ ] **Step 2: Lint + Build**

```bash
npm run lint
```

Erwartet: keine neuen Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(termine): sidebar entry"
```

---

### Task 11: Termine-Modul-Layout + Stub-Indexseite

Phase 1 zeigt unter `/intern/termine` nur eine Stub-Seite, die direkt zur Connect-UI verlinkt. Die Wochenkalender-Übersicht kommt in Phase 2.

**Files:**
- Create: `src/app/intern/(dashboard)/termine/layout.tsx`
- Create: `src/app/intern/(dashboard)/termine/page.tsx`

- [ ] **Step 1: Layout anlegen**

Datei `src/app/intern/(dashboard)/termine/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'

export default function TermineLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Termine</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/intern/termine" className="text-muted-foreground hover:text-foreground">Übersicht</Link>
          <Link href="/intern/termine/calendar-connect" className="text-muted-foreground hover:text-foreground">Google Calendar</Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Stub-Indexseite anlegen**

Datei `src/app/intern/(dashboard)/termine/page.tsx`:

```tsx
import Link from 'next/link'

export default function TermineIndexPage() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-medium">Terminbuchung — Setup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dieses Modul ist gerade im Aufbau. Phase 1 stellt die Google-Calendar-Anbindung bereit.
      </p>
      <Link
        href="/intern/termine/calendar-connect"
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Google Calendar verbinden →
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/intern/(dashboard)/termine/
git commit -m "feat(termine): module layout + index stub"
```

---

### Task 12: Connect-UI

**Files:**
- Create: `src/app/intern/(dashboard)/termine/calendar-connect/page.tsx`
- Create: `src/app/intern/(dashboard)/termine/calendar-connect/_components/CalendarConnectView.tsx`

Server Component lädt aktuellen Account-Status; Client Component hat Connect/Disconnect-Buttons + Calendar-Liste.

- [ ] **Step 1: Server-Page**

Datei `src/app/intern/(dashboard)/termine/calendar-connect/page.tsx`:

```tsx
import { headers } from 'next/headers'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { getAuthContextServer } from '@/lib/auth/auth-context-server'
import { isCalendarFeatureEnabled } from '@/lib/services/calendar-env'
import { CalendarConnectView } from './_components/CalendarConnectView'

interface PageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function CalendarConnectPage({ searchParams }: PageProps) {
  const { connected, error } = await searchParams
  const featureEnabled = isCalendarFeatureEnabled()
  if (!featureEnabled) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Google-Calendar-Integration ist nicht konfiguriert. Setze die Env-Variablen
        <code className="mx-1 rounded bg-amber-100 px-1">GOOGLE_CALENDAR_*</code>, dann erneut laden.
      </div>
    )
  }

  const auth = await getAuthContextServer()
  if (!auth) return null

  const account = await CalendarAccountService.getActiveAccount(auth.userId)
  const calendars = account ? await CalendarAccountService.listWatchedCalendars(account.id) : []

  return (
    <CalendarConnectView
      account={account ? {
        id: account.id,
        googleEmail: account.googleEmail,
        primaryCalendarId: account.primaryCalendarId,
        connectedAt: account.createdAt.toISOString(),
      } : null}
      calendars={calendars.map(c => ({
        id: c.id,
        googleCalendarId: c.googleCalendarId,
        displayName: c.displayName,
        readForBusy: c.readForBusy,
      }))}
      flashConnected={connected === '1'}
      flashError={error ?? null}
    />
  )
}
```

(Hinweis: falls `getAuthContextServer` nicht existiert — bestehendes Auth-Pattern aus anderen Server-Components in `src/app/intern/(dashboard)/elearning/...` ableiten und übernehmen, evtl. mit `getAuthContext(headers())`.)

- [ ] **Step 2: Client-Component**

Datei `src/app/intern/(dashboard)/termine/calendar-connect/_components/CalendarConnectView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface CalendarRow {
  id: string
  googleCalendarId: string
  displayName: string
  readForBusy: boolean
}
interface AccountInfo {
  id: string
  googleEmail: string
  primaryCalendarId: string | null
  connectedAt: string
}

export function CalendarConnectView(props: {
  account: AccountInfo | null
  calendars: CalendarRow[]
  flashConnected: boolean
  flashError: string | null
}) {
  const { account, flashConnected, flashError } = props
  const [calendars, setCalendars] = useState(props.calendars)
  const [primary, setPrimary] = useState(account?.primaryCalendarId ?? null)
  const [busy, setBusy] = useState(false)

  async function setPrimaryCalendar(googleCalendarId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPrimary', googleCalendarId }),
      })
      if (!res.ok) throw new Error('Setzen des primären Kalenders fehlgeschlagen')
      setPrimary(googleCalendarId)
      toast.success('Primärer Kalender gesetzt')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function toggleReadForBusy(watchedId: string, next: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setReadForBusy', watchedId, readForBusy: next }),
      })
      if (!res.ok) throw new Error('Toggle fehlgeschlagen')
      setCalendars(cs => cs.map(c => c.id === watchedId ? { ...c, readForBusy: next } : c))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function disconnect() {
    if (!confirm('Google-Account wirklich trennen? Die Verbindung wird widerrufen.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/v1/calendar-account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Trennen fehlgeschlagen')
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
      setBusy(false)
    }
  }

  if (!account) {
    return (
      <div className="space-y-4">
        {flashError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            Fehler beim Verbinden: {flashError}
          </div>
        )}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-medium">Kein Google-Account verbunden</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verbinde deinen Google-Account, damit Buchungen automatisch in deinen Kalender geschrieben
            und Doppelbuchungen verhindert werden.
          </p>
          <a
            href="/api/google-calendar/oauth/start"
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Mit Google verbinden
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {flashConnected && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Google-Account erfolgreich verbunden.
        </div>
      )}
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium">Verbunden mit {account.googleEmail}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              seit {new Date(account.connectedAt).toLocaleDateString('de-DE')}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={disconnect}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            Trennen
          </button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h3 className="font-medium">Kalender</h3>
          <p className="text-sm text-muted-foreground">
            Wähle den primären Kalender (Buchungen werden dort angelegt) und welche Kalender als „belegt" gelten.
          </p>
        </div>
        <ul className="divide-y">
          {calendars.map(c => (
            <li key={c.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{c.displayName}</div>
                <div className="text-xs text-muted-foreground">{c.googleCalendarId}</div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="primary"
                    checked={primary === c.googleCalendarId}
                    onChange={() => setPrimaryCalendar(c.googleCalendarId)}
                    disabled={busy}
                  />
                  Primär
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={c.readForBusy}
                    onChange={e => toggleReadForBusy(c.id, e.target.checked)}
                    disabled={busy}
                  />
                  als belegt zählen
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lokal testen (manuell)**

```bash
npm run dev
```

In neuer Shell, erst `.env.local` mit allen 6 Env-Vars (siehe Task 3) füllen — die Google-Credentials müssen aus einem realen Google-Cloud-Projekt mit aktivierter Calendar API + dem korrekten redirect_uri kommen. Im Browser:
1. `/intern/termine` öffnen → „Google Calendar verbinden →" klicken
2. Connect-Seite öffnet sich, „Mit Google verbinden"
3. Google-Login + Consent
4. Redirect zurück → grüne Erfolgsmeldung, Account + Kalender-Liste sichtbar
5. Primär umstellen, „belegt"-Toggle testen
6. „Trennen" → bestätigen → Seite zeigt wieder „Kein Account verbunden"

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/termine/calendar-connect/
git commit -m "feat(termine): Google-Calendar connect UI (status, primary, busy toggle, disconnect)"
```

---

## Phase E — Abschluss

### Task 13: README/Setup-Doku ergänzen

**Files:**
- Modify: `README.md` (oder gleichwertige Setup-Datei)

- [ ] **Step 1: Setup-Schritte für Google Cloud dokumentieren**

Section „Terminbuchung / Google Calendar" in README ergänzen:

```markdown
### Terminbuchung / Google Calendar (Phase 1)

**Setup einmalig:**

1. In [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen (oder existierendes wählen).
2. Calendar API aktivieren (`APIs & Services → Library → Google Calendar API → Enable`).
3. OAuth-Consent-Screen konfigurieren: User Type = External (oder Internal bei Workspace),
   Scopes hinzufügen: `https://www.googleapis.com/auth/calendar`.
4. OAuth-Client-Credentials erstellen (`APIs & Services → Credentials → Create Credentials → OAuth client ID`):
   - Application type: Web application
   - Authorized redirect URI: `${APP_PUBLIC_URL}/api/google-calendar/oauth/callback`
5. Client-ID und Client-Secret in `.env` als `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` setzen.
6. `CALENDAR_TOKEN_KEY` generieren:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
7. `APPOINTMENT_TOKEN_SECRET` zufällig generieren (≥ 32 chars).
8. App neu starten.
9. In der App: `/intern/termine/calendar-connect` → „Mit Google verbinden".

**In Phase 1 implementiert:** OAuth-Flow, Token-Verschlüsselung, Kalender-Liste, Primär-Kalender, „belegt"-Toggle, Disconnect.
**Noch nicht in Phase 1:** Buchung, Slot-Typen, Sync-Webhook, Mails — siehe Folge-Phasen.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(termine): Google Cloud setup instructions"
```

---

### Task 14: End-to-End-Smoketest auf Staging

Manueller Smoketest auf einer Staging-Instanz mit echten Google-Credentials.

- [ ] **Step 1: Deploy auf Staging**

Über bestehenden Coolify-Pipeline, oder lokal `docker-compose -f docker-compose.coolify.yml up`.

- [ ] **Step 2: Smoketest-Checklist**

Im Browser auf Staging:

- [ ] `/intern/termine` lädt — Stub-Seite mit Verbinden-Button
- [ ] `/intern/termine/calendar-connect` lädt — Status „Kein Account verbunden"
- [ ] „Mit Google verbinden" → Google-Login-Flow funktioniert, Redirect kommt zurück
- [ ] Nach Verbindung: grüne Bestätigung + Kalender-Liste mit ≥ 1 Eintrag (primary)
- [ ] DB-Check: `SELECT * FROM user_calendar_accounts WHERE revoked_at IS NULL` zeigt 1 Zeile mit verschlüsselten Tokens (nicht im Klartext!)
- [ ] Primär-Kalender ändern: Toast „Primärer Kalender gesetzt", DB `primary_calendar_id` aktualisiert
- [ ] „belegt"-Toggle umlegen: DB `user_calendars_watched.read_for_busy` aktualisiert
- [ ] „Trennen" → Confirm → Seite reload → Status „Kein Account verbunden"; DB `revoked_at IS NOT NULL`
- [ ] Erneut verbinden → klappt
- [ ] State-Cookie-Mismatch testen: in DevTools Cookie löschen, dann manuell `/api/google-calendar/oauth/callback?code=…&state=…` aufrufen → 400

- [ ] **Step 3: Falls alles grün — keine Code-Änderung nötig, Plan ist fertig**

Phase 1 abgeschlossen. Folge-Plan: `2026-05-04-terminbuchung-phase2-availability.md` (wird beim Start der Phase 2 angelegt).

---

## Self-Review-Checkliste (vor Plan-Abnahme durchgeführt)

Spec-Coverage Phase 1 (§9.3 #1):
- ✅ Migrations + Schema → Task 1
- ✅ OAuth Connect → Tasks 7+8
- ✅ Token-Verschlüsselung → Task 4
- ✅ Disconnect → Task 9
- ✅ Connect-UI → Task 12
- ✅ Sidebar-Integration → Task 10
- ✅ Permission-Modul → Task 2
- ✅ Env-Vars + Soft-Disable → Task 3

Bewusst **nicht** in Phase 1 (kommen in späteren Phasen):
- Webhook + `external_busy` (Phase 3)
- `Channels.watch` Setup nach Connect (Phase 3 — bis dahin: Connect funktioniert ohne Sync, FreeBusy wird beim ersten Buchungs-Versuch live gegen Google geprüft sobald Phase 4 da ist)
- Slot-Typen, Verfügbarkeit, Buchungsseite, Mails, Tokens, Reminders

Type-Konsistenz: `userCalendarAccounts` / `userCalendarsWatched` Schema-Namen einheitlich. Service-Methoden (`getActiveAccount`, `getById`, `storeNewAccount`, `getValidAccessToken`, `revoke`, `listWatchedCalendars`, `setPrimaryCalendar`, `setReadForBusy`) konsistent benannt und in API + UI identisch verwendet.

Placeholder-Scan: keine TBDs, jeder Step zeigt vollständigen Code.

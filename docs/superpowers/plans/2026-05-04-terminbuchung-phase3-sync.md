# Terminbuchung Phase 3 — Google Calendar Sync (external_busy + Webhook + Cron) — Implementation Plan

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1: Schema-Grundlage, Google-OAuth, Connect-UI
> - ✅ Phase 2: Slot-Typen + Wochenraster + Backend-Kalender (read-only)
> - **Phase 3 (diese Datei):** Push-Webhook + `external_busy` + Channel-Renewal + Token-Refresh-Cron + Anzeige im Wochenkalender
> - Phase 4: Öffentliche Buchungsseite + book-API + Live-FreeBusy + Event-Insert + Confirmation-Mail
> - Phasen 5–8 wie in der Spec

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Externe Google-Calendar-Termine werden automatisch in die App synchronisiert. Beim ersten Connect läuft ein Initial-Full-Sync. Spätere Änderungen kommen über Push-Webhooks (Google ruft unseren Endpoint bei jeder Änderung auf), die wir inkrementell via `syncToken` verarbeiten. Ein Cron-Job (alle 30 min) refresht ablaufende Tokens und erneuert ablaufende Watch-Channels. Im Wochenkalender (`/intern/termine`) werden externe Events als belegt angezeigt.

**Architecture:** Eine neue Tabelle `external_busy` (gespiegelte Google-Events). Erweiterung des `CalendarGoogleClient` um `eventsList`, `channelsWatch`, `channelsStop`. Neuer `CalendarSyncService` mit `fullSync`, `incrementalSync`, `setupWatch`, `stopWatch`. Webhook-Route validiert via `X-Goog-Channel-Token` (shared secret). Nach OAuth-Callback wird Watch + Initial-Sync ausgelöst. Cron-Action `calendar_sync` (in bestehendem `CronService.tick` integriert) refresht Tokens + erneuert Channels für alle aktiven Accounts.

**Tech Stack:** Wie Phase 1+2. Webhook braucht öffentlich erreichbare HTTPS-URL (xkmu.de via Coolify-Proxy ist gegeben).

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §1.7, §2.4, §2.5, §5.6, §5.7, §5.10.

**Codebase-Patterns (wie Phase 1+2):**
- Services: `export const FooService = { method() { ... } }`
- Cron: neue Action `calendar_sync` in `CronService.tick()` switch ergänzen
- Tests: `setupDbMock()` + `vi.resetModules()` + dynamic import; Google-API-Calls via `vi.stubGlobal('fetch', ...)`
- Cookies/Secrets aus `CalendarConfigService.getConfig()` (DB-basiert seit dem Refactor)

**Voraussetzungen für Live-Betrieb:**
- App muss unter `https://www.xkmu.de` erreichbar sein (in `app_public_url`-Config gesetzt)
- Webhook-URL `https://www.xkmu.de/api/google-calendar/webhook` muss von Google-Servern erreichbar sein
- `app_public_url` darf KEIN `localhost` sein, sonst akzeptiert Google das Channel-Setup nicht

---

## Phase A — Foundation

### Task 1: Migration 0042 + `external_busy` Schema

**Files:**
- Create: `drizzle/migrations/0042_external_busy.sql`
- Modify: `src/lib/db/schema.ts` (am Ende)
- Modify: `src/lib/db/table-whitelist.ts`

- [ ] **SQL**

```sql
-- Terminbuchung Phase 3: Externe Google-Events als Spiegel

CREATE TABLE external_busy (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES user_calendar_accounts(id) ON DELETE CASCADE,
  google_calendar_id  varchar(255) NOT NULL,
  google_event_id     varchar(255) NOT NULL,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  etag                varchar(255),
  transparency        varchar(15) NOT NULL DEFAULT 'opaque',  -- opaque | transparent
  is_all_day          boolean NOT NULL DEFAULT false,
  summary             varchar(500),
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_external_busy_event UNIQUE (google_calendar_id, google_event_id)
);
CREATE INDEX idx_external_busy_account_time ON external_busy(account_id, start_at, end_at);
```

- [ ] **Drizzle**

```typescript
export const externalBusy = pgTable('external_busy', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => userCalendarAccounts.id, { onDelete: 'cascade' }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
  googleEventId: varchar('google_event_id', { length: 255 }).notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  etag: varchar('etag', { length: 255 }),
  transparency: varchar('transparency', { length: 15 }).notNull().default('opaque'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  summary: varchar('summary', { length: 500 }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEvent: uniqueIndex('uq_external_busy_event').on(t.googleCalendarId, t.googleEventId),
  accountTimeIdx: index('idx_external_busy_account_time').on(t.accountId, t.startAt, t.endAt),
}))

export const externalBusyRelations = relations(externalBusy, ({ one }) => ({
  account: one(userCalendarAccounts, { fields: [externalBusy.accountId], references: [userCalendarAccounts.id] }),
}))

export type ExternalBusy = typeof externalBusy.$inferSelect
export type NewExternalBusy = typeof externalBusy.$inferInsert
```

- [ ] **Whitelist:** `'external_busy'` zu `TENANT_TABLES` hinzufügen.
- [ ] **tsc + commit**

```bash
npx tsc --noEmit
git add drizzle/migrations/0042_external_busy.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat(termine): external_busy table for mirrored Google events (Phase 3)"
```

---

## Phase B — Google Client erweitern

### Task 2: `CalendarGoogleClient` — eventsList, channelsWatch, channelsStop

**Files:**
- Modify: `src/lib/services/calendar-google.client.ts`
- Modify: `src/__tests__/unit/services/calendar-google.client.test.ts` (Tests ergänzen)

Drei neue Methoden:

```typescript
export interface EventsListResult {
  events: ExternalEvent[]
  nextSyncToken: string | null
  nextPageToken: string | null
  status: 'ok' | 'sync_token_expired'
}

export interface ExternalEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  start: Date | null   // null wenn cancelled
  end: Date | null
  isAllDay: boolean
  transparency: 'opaque' | 'transparent'
  etag: string
  summary: string | null
  extendedXkmuAppointmentId: string | null
}

export interface WatchResult {
  channelId: string
  resourceId: string
  expirationMs: number  // unix ms
}

CalendarGoogleClient.eventsList({
  accessToken: string
  calendarId: string
  syncToken?: string
  pageToken?: string
}): Promise<EventsListResult>

CalendarGoogleClient.channelsWatch({
  accessToken: string
  calendarId: string
  channelId: string         // generierte UUID
  webhookUrl: string        // absolute URL z. B. https://www.xkmu.de/api/google-calendar/webhook
  channelToken: string      // shared secret für Validation
  ttlSeconds?: number       // default 7 days
}): Promise<WatchResult>

CalendarGoogleClient.channelsStop({
  accessToken: string
  channelId: string
  resourceId: string
}): Promise<void>
```

`eventsList` mit `singleEvents=true`, `showDeleted=true` aufrufen. Bei 410 GONE response → `status: 'sync_token_expired'` zurückgeben (Caller macht dann full re-sync).

Channel-Watch: POST an `https://www.googleapis.com/calendar/v3/calendars/<calendarId>/events/watch` mit Body `{id: channelId, type: 'web_hook', address: webhookUrl, token: channelToken, params: {ttl: ttlSeconds}}`. Response enthält `id`, `resourceId`, `expiration` (unix ms string).

Channel-Stop: POST `https://www.googleapis.com/calendar/v3/channels/stop` mit `{id, resourceId}`. 200 oder 404 (schon weg) akzeptieren.

**Tests** (`vi.stubGlobal('fetch', ...)`):
- `eventsList` returns parsed events (1 normal + 1 cancelled with no start/end + 1 all-day)
- `eventsList` 410 → `status: 'sync_token_expired'`
- `channelsWatch` posts correct body, returns parsed result
- `channelsStop` accepts 404 silently

- [ ] tsc + tests pass + commit

```bash
git commit -m "feat(termine): CalendarGoogleClient — eventsList/channelsWatch/channelsStop"
```

---

## Phase C — Sync Service

### Task 3: `CalendarSyncService`

**Files:**
- Create: `src/lib/services/calendar-sync.service.ts`
- Test: `src/__tests__/unit/services/calendar-sync.service.test.ts`

Public API:

```typescript
CalendarSyncService.fullSync(accountId: string, calendarId: string): Promise<{ syncToken: string; eventCount: number }>
CalendarSyncService.incrementalSync(accountId: string): Promise<{ events: number; channelExpired: boolean }>
CalendarSyncService.setupWatch(accountId: string): Promise<void>
CalendarSyncService.stopWatch(accountId: string): Promise<void>
CalendarSyncService.upsertEvents(accountId: string, calendarId: string, events: ExternalEvent[]): Promise<void>
```

Logik:

**`fullSync(accountId, calendarId)`:**
1. `getValidAccessToken(accountId)` (existiert)
2. `eventsList` ohne `syncToken`, paginiert über `pageToken`
3. Für alle Events `upsertEvents` aufrufen
4. Wenn keine weitere Page mehr → letzte Response enthält `nextSyncToken`
5. `nextSyncToken` in `user_calendar_accounts.sync_token` speichern (für späteres incremental)
6. Return event count

**`incrementalSync(accountId)`:**
1. Account holen, `sync_token` muss existieren
2. `getValidAccessToken`
3. `eventsList` mit primary calendar + `syncToken`
4. Wenn `status === 'sync_token_expired'` → re-run `fullSync` und return `channelExpired: false, events: 0`
5. Sonst: `upsertEvents` + `sync_token` aktualisieren
6. Return event count

**`upsertEvents`:**
- Events mit `status === 'cancelled'`: DELETE FROM external_busy WHERE google_event_id matched
- Events mit `extendedXkmuAppointmentId !== null`: skip (das sind unsere eigenen Buchungen — kommen in Phase 4)
- Events mit `transparency === 'transparent'`: skip oder UPSERT mit transparency-Spalte (für Konsistenz upserten — bei Anzeige filtern)
- Events ohne `start.end` (z. B. cancelled instances): DELETE
- Sonst: UPSERT `(google_calendar_id, google_event_id)` mit allen Feldern, `last_synced_at = now()`

**`setupWatch(accountId)`:**
1. Config aus `CalendarConfigService.getConfig()` — braucht `appPublicUrl` (sonst Error)
2. Account holen, `primary_calendar_id` muss gesetzt sein
3. `getValidAccessToken`
4. Channel-ID generieren (UUID), Channel-Token = `appointmentTokenSecret` (oder davon abgeleitet)
5. `channelsWatch` aufrufen
6. `watch_channel_id`, `watch_resource_id`, `watch_expires_at` in `user_calendar_accounts` UPDATE-en

**`stopWatch(accountId)`:**
1. Account holen, wenn keine `watch_channel_id` → return
2. `channelsStop` (best-effort, Fehler ignorieren)
3. `watch_channel_id`, `watch_resource_id`, `watch_expires_at` auf NULL setzen

**Tests** (mit gemockter `CalendarGoogleClient` + `setupDbMock`):
- `fullSync` paginiert über zwei Pages, schreibt 5 Events, persistiert `sync_token`
- `incrementalSync` mit expired token → ruft `fullSync` auf
- `upsertEvents` filtert `extendedXkmuAppointmentId !== null` raus
- `upsertEvents` deletet cancelled events
- `setupWatch` ohne `app_public_url` wirft Error
- `stopWatch` ohne `watch_channel_id` ist no-op

- [ ] commit

```bash
git commit -m "feat(termine): CalendarSyncService — full+incremental sync, watch lifecycle"
```

---

## Phase D — Webhook + OAuth-Callback-Integration

### Task 4: Webhook-Endpoint `/api/google-calendar/webhook`

**Files:**
- Create: `src/app/api/google-calendar/webhook/route.ts`
- Test: `src/__tests__/integration/api/google-calendar-webhook.test.ts`

Google sendet `POST` mit Headern:
- `X-Goog-Channel-Id` — unsere Channel-UUID
- `X-Goog-Channel-Token` — unser shared secret (was wir bei `channelsWatch` gesetzt haben)
- `X-Goog-Resource-State` — `'sync'` (initial nach watch), `'exists'` (change), `'not_exists'` (channel deleted)
- `X-Goog-Resource-Id` — Resource-ID
- `X-Goog-Message-Number` — sequenznummer für Idempotenz

Logik:
1. Header lesen (alle erforderlich)
2. Account via `watch_channel_id = X-Goog-Channel-Id` finden
3. Wenn nicht gefunden → 404 (Google retried bei 4xx nicht — wir wollen das hier auch nicht)
4. `X-Goog-Channel-Token` gegen Account-Config (oder gegen `appointmentTokenSecret`) validieren → 401 bei mismatch
5. `last_message_number` Idempotenz: wenn eingehende ≤ gespeicherte → 200 sofort
6. State-Switch:
   - `'sync'`: 200 OK, kein Pull
   - `'exists'`: `CalendarSyncService.incrementalSync(accountId)` aufrufen
   - `'not_exists'`: Channel als ungültig markieren (NULL setzen) — Cron erneuert beim nächsten Lauf
7. `last_message_number` aktualisieren
8. 200 OK schnell zurück

**Tests:**
- happy path: state=`exists`, Channel matched, incrementalSync wird aufgerufen
- mismatched channel-id → 404
- invalid token → 401
- state=`sync` → 200 ohne Pull
- duplicate message number → 200 ohne Pull

- [ ] commit

```bash
git commit -m "feat(termine): /api/google-calendar/webhook for Google push notifications"
```

### Task 5: OAuth-Callback erweitern

**File:** `src/app/api/google-calendar/oauth/callback/route.ts`

Nach `storeNewAccount` (vor dem Success-Redirect):
1. `await CalendarSyncService.setupWatch(account.id)` — best-effort, bei Error nur loggen, Verbindung trotzdem behalten (User kann später manuell triggern)
2. `await CalendarSyncService.fullSync(account.id, primary_calendar_id)` — best-effort, dito

Bei Setup-Watch-Fehler: redirect mit `?calendar=connected&sync_warn=watch_failed`. UI im Profil-Card zeigt dann „Verbunden, aber Sync nicht aktiv (manuell starten)" — kommt in Task 7.

- [ ] tests anpassen + commit

```bash
git commit -m "feat(termine): trigger initial sync + watch on OAuth callback"
```

---

## Phase E — Cron

### Task 6: Cron-Action `calendar_sync` (Token-Refresh + Channel-Renewal)

**Files:**
- Modify: `src/lib/services/cron.service.ts` (`switch (job.actionType)` ergänzen)
- Create: `src/lib/services/calendar-cron.handler.ts`
- Migration: einmaliger Seed eines `cron_jobs`-Eintrags via Migration `0043_calendar_cron_seed.sql`

**Handler-Logik** (`calendar-cron.handler.ts`):

```typescript
export async function runCalendarSyncMaintenance(): Promise<{ refreshed: number; renewed: number; failed: number }> {
  // Iteriere alle aktiven user_calendar_accounts (revoked_at IS NULL)
  // Pro Account:
  //   - Token-Refresh: getValidAccessToken (existiert; refresht implizit wenn < 60s gültig)
  //     Da wir hier proaktiv 30 min vor Ablauf refreshen wollen: Account.token_expires_at < now+30min → trigger refresh
  //     Einfachste Lösung: getValidAccessToken einmal aufrufen, intern wird refresht
  //   - Channel-Renewal: wenn watch_expires_at < now+24h → stopWatch + setupWatch
  //   - Bei Fehler in einem Account: log + count fail, weiter mit nächstem
  return { refreshed, renewed, failed }
}
```

**CronService.tick switch:**

```typescript
case 'calendar_sync': {
  const out = await runCalendarSyncMaintenance()
  result = { success: true, ...out }
  break
}
```

**Migration `0043_calendar_cron_seed.sql`:**

```sql
-- One-time seed: register the calendar_sync cron job
INSERT INTO cron_jobs (name, description, interval, action_type, action_config, is_active, next_run_at)
VALUES (
  'Google Calendar Sync',
  'Token-Refresh + Channel-Renewal für alle aktiven Calendar-Accounts',
  '30min',
  'calendar_sync',
  '{}'::jsonb,
  true,
  now()
)
ON CONFLICT DO NOTHING;
```

**Tests:**
- `runCalendarSyncMaintenance` mit zwei Accounts, einer braucht Token-Refresh, einer braucht Channel-Renewal
- Bei Account-Fehler: Counter erhöht, andere laufen durch

- [ ] commit

```bash
git commit -m "feat(termine): calendar_sync cron — proactive token refresh + channel renewal"
```

---

## Phase F — UI: external_busy im Wochenkalender

### Task 7: WeekCalendarView — externe Events anzeigen

**Files:**
- Modify: `src/app/intern/(dashboard)/termine/page.tsx`
- Modify: `src/app/intern/(dashboard)/termine/_components/WeekCalendarView.tsx`

In `page.tsx` Server-Fetch erweitern:

```typescript
import { db } from '@/lib/db'
import { externalBusy, userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq, gte, isNull, lte, inArray } from 'drizzle-orm'

// account des Users finden
const account = await CalendarAccountService.getActiveAccount(session.user.id)

// nur Kalender mit read_for_busy=true
const busyEvents = account
  ? await db.select().from(externalBusy)
      .where(and(
        eq(externalBusy.accountId, account.id),
        gte(externalBusy.endAt, monday),
        lte(externalBusy.startAt, sunday),
        eq(externalBusy.transparency, 'opaque'),
      ))
  : []

// optional: per inArray gegen watched-calendars filtern (nur read_for_busy=true)
```

In `WeekCalendarView.tsx`:
- Neue Prop `externalBusy: { startAt, endAt, summary }[]`
- In `cellState` zusätzlich: wenn ein external_busy-Event in dieser Zelle liegt → `'busy-external'`
- Neue cell class: `bg-slate-300 dark:bg-slate-700 border border-slate-400` mit Tooltip oder Title-Attribute mit Summary
- Legende erweitern: „extern belegt"

Auch im Profil-Card eine Statusanzeige ergänzen: „Sync aktiv seit X" (basierend auf `watch_expires_at`-Existenz) — kann als Phase-3-Polish wegfallen wenn Zeit knapp.

- [ ] tsc + commit

```bash
git commit -m "feat(termine): show external Google events in week calendar"
```

---

## Phase G — Tests + Smoketest + Merge

### Task 8: Tests gesamt + manueller Smoketest

- [ ] `npx vitest run` — Phase-3-Tests grün, keine Regressionen
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` — keine neuen Fehler

**Manueller Smoketest auf Staging:**
- [ ] Migration `0042` + `0043` ausgeführt
- [ ] Bestehender Account ist verbunden (Phase 1)
- [ ] **Wichtig:** entweder alten Account trennen + neu verbinden (löst Initial-Sync aus) ODER manuell `setupWatch` + `fullSync` per API-Aufruf triggern
- [ ] In Google einen Test-Termin anlegen (z. B. Mo 10:00–11:00)
- [ ] Innerhalb von ≤ 1 min sollte Webhook ausgelöst werden (Logs prüfen)
- [ ] DB-Check: `SELECT * FROM external_busy WHERE account_id = ?` zeigt den Termin
- [ ] `/intern/termine` → die Zelle Mo 10:00–11:00 erscheint grau (extern belegt)
- [ ] Termin in Google verschieben → external_busy aktualisiert
- [ ] Termin in Google löschen → external_busy zeile gelöscht, Zelle wieder verfügbar

### Task 9: Final Code Review

Subagent dispatchen zur Phase-3-Code-Review (analog Phase 1 finale Review). Critical/Important Issues fixen.

### Task 10: Merge + Push

```bash
git checkout main
git pull --rebase origin main
git merge --no-ff feat/termine-phase3 -m "Merge branch 'feat/termine-phase3'"
git push origin main
```

---

## Self-Review-Checkliste

Spec-Coverage Phase 3 (§9.3 #3):
- ✅ `external_busy`-Tabelle → Task 1
- ✅ Push-Webhook → Task 4
- ✅ Channel-Renewal-Cron → Task 6
- ✅ Token-Refresh-Cron → Task 6 (kombiniert mit Channel-Renewal in einem Job)
- ✅ Initial-Sync nach Connect → Task 5
- ✅ Anzeige im Wochenkalender → Task 7

Bewusst nicht in Phase 3:
- Live-FreeBusy-Check beim Buchen (Phase 4)
- Mapping eigener Buchungen → external_busy (Phase 4 — über `extendedXkmuAppointmentId` skip-Logik)
- Mehrere watched Calendars gleichzeitig syncen (Phase 3 nur primary; andere Kalender im read_for_busy-Toggle werden in Phase 4 berücksichtigt)
- UI-Trigger-Button „Sync neu starten" (Polish, später)

Sicherheit:
- Channel-Token = HMAC-derived oder direkt `appointment_token_secret` aus Config — wird gegen `X-Goog-Channel-Token` validiert
- Webhook validiert NUR über Channel-ID + Channel-Token. Kein Bearer-Token.
- Bei mismatched Channel-ID 404 statt 401 (Google retried bei 4xx nicht — beabsichtigt, ungültige Channels sollen verworfen werden)

Edge Cases:
- App nicht erreichbar zum Zeitpunkt des Webhooks → Google retried mit Backoff für ~ 1h. Nach Recovery: `incrementalSync` per nächstem Webhook holt Lücken via `syncToken`.
- syncToken-Expiry (z. B. nach längerer Offline-Phase): automatischer Fallback auf `fullSync`
- Channel-Expiry vor Cron-Lauf: `incrementalSync` schlägt fehl → User merkt nichts, wenn keine Änderungen reinkommen. Nächster Cron-Lauf erneuert. Hinnehmbar in V1.

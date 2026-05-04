# Terminbuchung & Online-Booking — Design Spec

**Datum:** 2026-05-04
**Status:** Approved (Brainstorming)
**Owner:** Tino Stenzel

## Overview

Neues Feature: Terminbuchung mit Google-Calendar-Sync. Jeder Mitarbeiter kann eigene
Termin-Arten (z. B. 30/60/240 min) anlegen, Verfügbarkeit per Wochenraster +
Einzel-Overrides definieren und einen eigenen Google-Account koppeln. Externe Kunden
buchen über eine öffentliche Seite (`/buchen/<slug>`); eingeloggte Portal-Kunden
zusätzlich über `/portal/termin` mit vorbefüllten Daten. Buchungen werden bidirektional
mit Google Calendar synchronisiert (Push-Webhooks für eingehende Änderungen,
Event-Insert für neue Buchungen). Bestätigungs- und Reminder-Mails laufen über die
bestehende `email_templates` + `task_queue` Infrastruktur. Storno und Umbuchung
funktionieren über signierte Tokens in den Mails.

## Architecture Decision

**Hybrid-Sync (Approach C):** Verfügbarkeit wird aus lokaler DB gerendert (schnelle
Anzeige, keine Live-API-Calls auf Pageviews). Eingehende Google-Änderungen kommen über
[Push-Webhooks](https://developers.google.com/calendar/api/guides/push) und werden in
`external_busy` gespiegelt. Beim finalen Buchungs-Commit zusätzlicher Live-FreeBusy-Call
gegen Google als Race-Condition-Guard. Push-Channels laufen 7 Tage und werden per Cron
erneuert. Begründung: schneller UX bei Multi-User-Last, Race-sicher beim Commit, robust
gegen Sync-Lag — Standard bei Calendly/Cal.com.

---

## 1. Datenmodell

Alle Zeiten in DB sind UTC (`timestamp`). Anzeige in User-Timezone via `users.timezone`.

### 1.1 `user_calendar_accounts`

Gekoppelter Google-Account pro User (1:1 in V1, technisch 1:N möglich).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `provider` | varchar(20) | `'google'` |
| `google_email` | varchar(255) | Login-E-Mail des gekoppelten Kontos |
| `access_token_enc` | text | AES-256-GCM verschlüsselt |
| `refresh_token_enc` | text | AES-256-GCM verschlüsselt |
| `token_expires_at` | timestamp | |
| `scopes` | text[] | erteilte OAuth-Scopes |
| `primary_calendar_id` | varchar(255) | Ziel-Kalender für neue Buchungen |
| `watch_channel_id` | uuid | aktiver Push-Channel |
| `watch_resource_id` | varchar(255) | Google-Resource-ID |
| `watch_expires_at` | timestamp | Channel-Ablauf |
| `sync_token` | text | Google `nextSyncToken` |
| `last_message_number` | bigint | Webhook-Idempotenz |
| `revoked_at` | timestamp NULL | bei Disconnect |
| `created_at` / `updated_at` | timestamp | |

### 1.2 `user_calendars_watched`

Welche Kalender des Users als belegt zählen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK → user_calendar_accounts | |
| `google_calendar_id` | varchar(255) | |
| `display_name` | varchar(255) | aus `Calendar.list` |
| `read_for_busy` | bool | wenn true → Events blockieren Slots |
| `created_at` | timestamp | |

UNIQUE (`account_id`, `google_calendar_id`).

### 1.3 `slot_types`

Konfigurierbare Termin-Arten pro User.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `slug` | varchar(100) | URL-Teil: `/buchen/<user>/<slug>` |
| `name` | varchar(255) | „Erstgespräch 30 min" |
| `description` | text | Markdown, sichtbar auf Buchungsseite |
| `duration_minutes` | int | beliebig (Quick-Buttons 30/60/240) |
| `buffer_before_minutes` | int default 0 | |
| `buffer_after_minutes` | int default 0 | |
| `min_notice_hours` | int default 24 | |
| `max_advance_days` | int default 60 | |
| `color` | varchar(7) | Hex-Farbe für Backend-Kalender |
| `is_active` | bool default true | |
| `location` | varchar(50) | `phone` / `video` / `onsite` / `custom` |
| `location_details` | text | „Zoom-Link wird per Mail gesendet" |
| `display_order` | int | Drag-Reorder auf Buchungsseite |
| `created_at` / `updated_at` | timestamp | |

UNIQUE (`user_id`, `slug`).

### 1.4 `availability_rules`

Wochenraster pro User (mehrere Intervalle pro Tag möglich).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `day_of_week` | smallint | 0=Montag … 6=Sonntag |
| `start_time` | time | lokale Zeit (`users.timezone`) |
| `end_time` | time | `> start_time` |
| `is_active` | bool default true | |
| `created_at` | timestamp | |

Validierung: `end_time > start_time` (keine Mitternachts-Wraps in V1).

### 1.5 `availability_overrides`

Einzel-Freigaben oder Blockierungen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `start_at` | timestamp | UTC |
| `end_at` | timestamp | UTC |
| `kind` | varchar(10) | `free` oder `block` |
| `reason` | varchar(255) | optional |
| `created_at` | timestamp | |

### 1.6 `appointments`

Die eigentlichen Buchungen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Mitarbeiter |
| `slot_type_id` | uuid FK → slot_types | |
| `start_at` | timestamp | UTC, Termin-Beginn |
| `end_at` | timestamp | UTC, Termin-Ende (ohne Puffer) |
| `status` | varchar(20) | `pending` / `confirmed` / `cancelled` / `completed` / `no_show` |
| `customer_name` | varchar(255) | |
| `customer_email` | varchar(255) | |
| `customer_phone` | varchar(50) | |
| `customer_message` | text | optionale Notiz vom Kunden |
| `lead_id` | uuid FK NULL | nach Smart-Match |
| `person_id` | uuid FK NULL | falls direkt gematcht (Portal) |
| `source` | varchar(20) | `public` / `portal` / `manual` |
| `cancel_token_hash` | varchar(64) | sha256 des Klartext-Tokens |
| `reschedule_token_hash` | varchar(64) | sha256 des Klartext-Tokens |
| `google_event_id` | varchar(255) NULL | nach Insert |
| `google_calendar_id` | varchar(255) NULL | wo angelegt |
| `sync_error` | text NULL | letzter Sync-Fehler |
| `staff_notes` | text NULL | intern, nicht an Kunden |
| `cancelled_at` | timestamp NULL | |
| `cancelled_by` | varchar(20) NULL | `customer` / `staff` / `system` |
| `cancellation_reason` | text NULL | |
| `created_at` / `updated_at` | timestamp | |

Indizes:
- `(user_id, start_at)` — Verfügbarkeitsabfragen
- `(status)` — Filter für Listen
- `(google_event_id)` — Webhook-Match
- `(customer_email)` — Kunden-History

### 1.7 `external_busy`

Read-only Spiegel von Google-Events (für FreeBusy-Check).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK → user_calendar_accounts | |
| `google_calendar_id` | varchar(255) | |
| `google_event_id` | varchar(255) | |
| `start_at` | timestamp | UTC |
| `end_at` | timestamp | UTC |
| `etag` | varchar(255) | für Update-Detection |
| `transparency` | varchar(15) | `opaque` / `transparent` |
| `is_all_day` | bool | |
| `last_synced_at` | timestamp | |

UNIQUE (`google_calendar_id`, `google_event_id`).
Index `(account_id, start_at, end_at)`.

Eigene angelegte Events (matching `google_event_id` in `appointments`) werden **nicht**
gespiegelt (würde sich selbst blockieren).

### 1.8 Erweiterung `users`

Neue Spalten:

| Spalte | Typ | Default | Beschreibung |
|---|---|---|---|
| `booking_slug` | varchar(60) UNIQUE NULL | NULL | URL-Teil; lowercase, a–z/0–9/`-`, 3–60 Zeichen |
| `booking_page_active` | bool | false | wenn false → 404 auf öffentlicher Seite |
| `booking_page_title` | varchar(255) NULL | NULL | überschreibt Default „Termin vereinbaren" |
| `booking_page_subtitle` | varchar(255) NULL | NULL | |
| `booking_page_intro` | text NULL | NULL | Markdown |
| `timezone` | varchar(64) NOT NULL | `'Europe/Berlin'` | IANA TZ Name |

---

## 2. Architektur & Komponenten

### 2.1 Routing

```
src/app/(public)/buchen/
  ├ [slug]/page.tsx                   # Schritt 1 (Slot-Typ-Auswahl)
  ├ [slug]/[slotType]/page.tsx        # Schritt 2 (Datum/Zeit) + Schritt 3 (Daten)
  ├ [slug]/bestaetigt/page.tsx        # Bestätigungsseite
  ├ cancel/[token]/page.tsx           # Storno-Seite (GET) + Action (POST)
  └ reschedule/[token]/page.tsx       # Umbuchung-Seite (GET) + Action (POST)

src/app/portal/termin/
  ├ page.tsx                          # Buchung mit Vorbefüllung + „Meine Termine"
  └ [slotType]/page.tsx               # Datum/Zeit-Auswahl

src/app/intern/(dashboard)/termine/
  ├ page.tsx                          # Wochenkalender + Detailpanel
  ├ slot-types/page.tsx               # Termin-Arten verwalten
  ├ availability/page.tsx             # Wochenraster + Overrides
  ├ calendar-connect/page.tsx         # Google-Account koppeln
  └ [id]/page.tsx                     # Termin-Detail (Mitarbeiter)

src/app/api/
  ├ buchen/[slug]/availability/route.ts
  ├ buchen/[slug]/availability/month/route.ts
  ├ buchen/[slug]/book/route.ts
  ├ buchen/cancel/[token]/route.ts
  ├ buchen/reschedule/[token]/route.ts
  ├ google-calendar/oauth/start/route.ts
  ├ google-calendar/oauth/callback/route.ts
  └ google-calendar/webhook/route.ts
```

Cron-Tasks erweitern bestehenden `/api/cron/tick`.

### 2.2 Services (`src/lib/services/`)

| Service | Verantwortung |
|---|---|
| `calendar-account.service.ts` | Token en/decrypt, Refresh-on-Demand mit advisory-lock, OAuth-Tausch |
| `calendar-google.client.ts` | Wrapper um Google Calendar API: FreeBusy, Events.insert/update/delete, Channels.watch/stop, Events.list mit syncToken |
| `calendar-sync.service.ts` | Webhook-Verarbeitung, `external_busy` upsert/delete, syncToken-Lifecycle, Channel-Renewal, Initial-Full-Sync |
| `slot-type.service.ts` | CRUD Termin-Arten, Slug-Validierung |
| `availability.service.ts` | CRUD Rules + Overrides |
| `availability-calc.service.ts` | Reine Funktion `computeFreeSlots(input)` (siehe §7) |
| `appointment.service.ts` | `book()`, `cancel()`, `reschedule()` — atomare Transaktionen, Lead-Match, Audit-Log, Mail-Queue, Google-Event |
| `appointment-token.service.ts` | HMAC-Tokens für Cancel/Reschedule, Hash-Speicherung, Verification |
| `appointment-mail.service.ts` | Render System-Templates, Queue Tasks (`email`, `reminder`) |
| `lead-match.service.ts` | Smart-Match per E-Mail: Person/Lead finden oder anlegen |

### 2.3 Daten-Fluss: Öffentliche Buchung (Happy Path)

1. `GET /buchen/<slug>` → Server-Component lädt User + aktive Slot-Types
2. Kunde wählt Slot-Typ → Navigation zu `/buchen/<slug>/<slotTypeSlug>`
3. Datepicker fragt `GET /api/buchen/<slug>/availability/month?yearMonth=YYYY-MM` (graut volle Tage aus)
4. Tag-Klick → `GET /api/buchen/<slug>/availability?slotTypeId=…&date=YYYY-MM-DD`
5. Slot-Klick + Formular ausgefüllt → `POST /api/buchen/<slug>/book`
6. `appointment.service.book()`:
   - BEGIN TX
   - Re-check DB-Verfügbarkeit; bei Konflikt → `SlotNoLongerAvailableError`
   - Live-FreeBusy gegen Google (Race-Guard, 3s Timeout, fail-open bei Google-5xx)
   - `lead-match.service` (Person/Lead matchen oder anlegen)
   - INSERT `appointments` (status `pending`, ohne `google_event_id`)
   - Cancel/Reschedule-Tokens generieren → Hashes speichern, Klartext nur im Memory
   - COMMIT TX
   - Async: Google-Event anlegen → `google_event_id` zurückschreiben + status `confirmed`
   - Queue Mail-Tasks: confirmation Kunde + notification Staff + reminder 24h + reminder 1h
7. Redirect zu `/buchen/<slug>/bestaetigt?id=<appointmentId>`

### 2.4 Daten-Fluss: Eingehende Google-Änderung

Google → `POST /api/google-calendar/webhook` → `calendar-sync.service`:
- Channel + Token validieren
- Bei `Resource-State='exists'`: `events.list` mit `syncToken`
- Iteriere Events:
  - DELETE in Google: wenn matched mit `appointment.google_event_id` → `cancel(by='staff', reason='deleted in Google')` + Mail; sonst `external_busy DELETE`
  - UPDATE: wenn matched → `reschedule` (start/end aktualisieren) + Mail an Kunden; sonst `external_busy UPSERT`
  - INSERT (neues externes Event): `external_busy UPSERT` (skip wenn `extendedProperties.private.xkmu_appointment_id` gesetzt)
- Neuen `sync_token` speichern; bei 410 GONE → Full-Resync

### 2.5 Cron-Jobs (in bestehendem `cronJobs`-System)

| Job | Frequenz | Zweck |
|---|---|---|
| `calendar-channel-renew` | stündlich | Channels mit `watch_expires_at < now+24h` erneuern |
| `calendar-token-refresh` | alle 30 min | Tokens mit `expires_at < now+10min` refreshen |
| `appointment-reminders` | alle 5 min | Fällige `reminder`-Tasks aus `task_queue` ausführen (Re-Check `status` vor Versand) |
| `appointment-sync-retry` | alle 10 min | Termine mit `confirmed` aber ohne `google_event_id` → Insert in Google retry |

### 2.6 Berechtigung

- Mitarbeiter-Backend `/intern/termine/...`: authenticated, sieht eigene Termine. Owner/Admin (RBAC) sieht alle.
- Öffentliche Buchungsseite: kein Auth. Rate-Limit 10 Buchungsversuche/h pro IP via bestehende Middleware (falls vorhanden, sonst neuer Helper).
- Webhook: validiert via `X-Goog-Channel-Id` + `X-Goog-Channel-Token`.
- OAuth-Callback: state-Cookie HMAC-signiert, 5 min Ablauf.
- Cancel/Reschedule-Tokens: HMAC-SHA256, single-use, Ablauf = `start_at`.

Neue RBAC-Permissions:

- `appointments.read.own` / `appointments.read.all`
- `appointments.write.own` / `appointments.write.all`
- `slot_types.manage`
- `availability.manage`
- `calendar.connect` / `calendar.connect.all`

Defaults: jeder User → `*.own` + `*.manage`. Owner → zusätzlich `*.all`.

---

## 3. UI: Mitarbeiter-Backend

### 3.1 Übersicht `/intern/termine`

- Wochenkalender Mo–So, 06:00–22:00, 15-min-Raster
- Eigene Termine als farbige Blöcke (Farbe aus `slot_types.color`); externe Google-Events grau mit Lock; Wochenraster-Verfügbarkeit als heller Hintergrund
- Buttons: `[Neuer Termin manuell]` `[Heute]` `[<] KW XX/YYYY [>]` `[Woche|Tag|Monat]`
- Klick auf Termin → Detailpanel rechts (Kunde, Slot-Typ, Zeit, Status-Badge, `[Status ändern]` `[Verschieben]` `[Stornieren]` `[Lead öffnen]`, interner Notiz-Editor, Audit-Log-Aufklapper)
- Banner oben falls kein Google-Account verbunden

### 3.2 Termin-Arten `/intern/termine/slot-types`

Tabelle (Name, Slug, Dauer, Puffer, Vorlauf, Aktiv, Buchungs-URL mit Copy). Sheet-Formular
(react-hook-form + zod) mit Quick-Buttons 30/60/240, Color-Picker, Markdown-Beschreibung,
Drag-Reorder via `@dnd-kit/sortable` (bereits in deps).

### 3.3 Verfügbarkeit `/intern/termine/availability`

Tab „Wochenraster": pro Tag Zeitintervall-Editor mit `[+ Intervall]`. Vorschau als
Wochenraster.

Tab „Ausnahmen": Liste der Overrides, sortiert nach Datum. `[Blockieren]` und `[Zusätzlich
freigeben]` mit Zeitraum-Picker. Quick-Aktionen `[Heute blockieren]` `[Diese Woche
blockieren]`. Vergangene Einträge default ausgeblendet.

### 3.4 Google-Account `/intern/termine/calendar-connect`

Status-Karte (verbundene E-Mail + seit-Datum + `[Trennen]`), Liste der erkannten Kalender
mit Toggle `read_for_busy`, Dropdown `primary_calendar_id`. Wenn nicht verbunden:
`[Mit Google verbinden]` startet OAuth-Flow.

### 3.5 Buchungsseite-Settings (Einstellungen-Modul)

`booking_slug` editierbar mit Live-Verfügbarkeitscheck, `booking_page_active`-Toggle,
optionale Felder `booking_page_title` / `subtitle` / `intro`.

### 3.6 Manuelle Termin-Erstellung

`[Neuer Termin manuell]` öffnet Sheet: Slot-Typ + Start-Zeit + Person-Picker
(Autocomplete aus `persons` mit „Neue Person inline anlegen"-Option) + optionale Notiz.
Bypass von `min_notice_hours` erlaubt. Schreibt nach Google identisch zu öffentlicher
Buchung. `source = 'manual'`.

---

## 4. UI: Buchungsseiten (Kunde)

### 4.1 Öffentliche Buchungsseite

**Header:** Firmenlogo (`organization`), `booking_page_title` (Default „Termin
vereinbaren"), `booking_page_subtitle`, optional `booking_page_intro` als Markdown.
**Keine Mitarbeiter-Namen oder -Fotos** auf der Seite.

**Schritt 1** `/buchen/<slug>` — Slot-Typ-Auswahl als Cards (Name, Beschreibung-Auszug,
Dauer, Location-Icon, `[Auswählen →]`). Sortierung nach `display_order`.

**Schritt 2 + 3** `/buchen/<slug>/<slotType>` — Single Page Wizard:

- Linke Spalte: Datepicker (Monat). Tage ohne freien Slot ausgegraut. Range begrenzt durch
  `min_notice_hours` und `max_advance_days`.
- Rechte Spalte: Liste der Slots für gewählten Tag (15-min-Raster, nur wo Slot-Typ inkl.
  Puffer komplett passt). Anzeige in Browser-Timezone mit Hinweis, automatisch
  ermittelt; manueller TZ-Switch in V1 nicht enthalten.
- Slot-Klick → Schritt 3 (Formular: Name *, E-Mail *, Telefon *, Nachricht, DSGVO-Checkbox *)
- Zusammenfassung sichtbar (Slot-Typ, Datum, Zeit, Dauer)
- `[Verbindlich buchen]` → POST → Redirect auf Bestätigungsseite
- Bei Race-Condition: Toast „Slot leider vergeben" + Reset auf Schritt 2

**Bestätigungsseite** `/buchen/<slug>/bestaetigt?id=<appointmentId>` — Eckdaten,
Hinweis auf Bestätigungs-Mail (mit Storno/Umbuchungs-Links), `.ics`-Download +
Add-to-Google-Quicklink.

**Mobile:** Datepicker und Slot-Liste untereinander statt zweispaltig. Slot-Buttons ≥ 44px.

### 4.2 Storno-Seite `/buchen/cancel/<token>`

GET: Token verifizieren → Termin-Eckdaten + Textarea „Grund (optional)" + `[Termin
stornieren]`. POST: `appointment.cancel(by='customer', reason)`, Google-Event löschen,
Mail an Mitarbeiter, Tokens invalidieren. Erfolgsseite.

Idempotent: bereits stornierter Termin → „Wurde bereits storniert" statt Fehler.

### 4.3 Umbuchungs-Seite `/buchen/reschedule/<token>`

GET: Token verifizieren → Schritt 2 (Datum/Zeit) mit Pre-Select des bisherigen Slot-Typs.
Slot-Typ-Wechsel nicht erlaubt (das wäre Neubuchung).

POST: `appointment.reschedule(newStartAt)` — alten Slot freigeben, neuen Slot per
Live-Check buchen, Google-Event UPDATE, neue Tokens generieren, alte Hashes ersetzen,
Mail mit neuen Links. Reminder-Tasks für alten Termin werden gelöscht, neue queued.

### 4.4 Portal-Variante `/portal/termin`

- Schritt 1: Auswahl-Cards aus Usern mit `booking_page_active=true`. Cards zeigen
  `booking_page_title` (kein Personenname). Bei genau einem aktiven User: Schritt 1
  übersprungen.
- Schritt 3: Kontaktdaten aus `persons` vorbefüllt + readonly. `appointments.source
  = 'portal'`, `person_id` direkt verknüpft (kein Lead-Match).
- „Meine Termine"-Liste auf der Seite: zukünftige + vergangene, Storno/Umbuchen-Buttons
  ohne Token (Auth ersetzt).

---

## 5. Google-OAuth & Calendar-Sync

### 5.1 OAuth-Setup

Google Cloud Project, Calendar API, OAuth-Consent-Screen.
Env: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
`GOOGLE_CALENDAR_REDIRECT_URI`.
Scope: `https://www.googleapis.com/auth/calendar`.

### 5.2 Connect-Flow

1. `GET /api/google-calendar/oauth/start` → state-Cookie (HMAC-signed userId+nonce+ts,
   5 min TTL) → 302 zu Google mit `prompt=consent` + `access_type=offline`
2. `GET /api/google-calendar/oauth/callback?code=…&state=…`:
   - state-Cookie validieren → userId
   - Token-Exchange (access + refresh)
   - Tokens encrypt → INSERT/UPDATE `user_calendar_accounts`
   - `Calendar.list` → `user_calendars_watched` populieren (default: primary mit
     `read_for_busy=true`, andere `false`)
   - `Channels.watch` auf primary → IDs + `watch_expires_at` speichern
   - Initial-Sync: `events.list` (paginiert, ohne syncToken) → `external_busy` füllen
   - `sync_token` speichern
3. Redirect zurück zu `/intern/termine/calendar-connect?connected=1`

### 5.3 Disconnect

`Channels.stop`, Token revoken (Google API), `revoked_at` setzen, `external_busy`
löschen. **Bestehende Termine bleiben** (nur künftige Sync-Operationen entfallen).

### 5.4 Token-Verschlüsselung

- AES-256-GCM mit Key aus env `CALENDAR_TOKEN_KEY` (32 bytes hex)
- Format: `<iv_hex>:<ciphertext_hex>:<tag_hex>`
- Helper: `encryptToken(plain): string`, `decryptToken(stored): string`
- Decrypt-Fehler → Account `revoked_at` setzen, Mail an User „Bitte neu verbinden"

### 5.5 Token-Refresh

`getValidAccessToken(accountId)` prüft `token_expires_at`; wenn `< now+60s` → Refresh-Call
(mit Postgres advisory-lock auf `account_id` als Concurrent-Schutz). Bei `invalid_grant`:
`revoked_at` setzen, User-Notification, Backend-Banner.

### 5.6 Push-Webhook `POST /api/google-calendar/webhook`

Headers: `X-Goog-Channel-Id`, `X-Goog-Channel-Token` (shared secret beim
watch-Setup gesetzt), `X-Goog-Resource-State`, `X-Goog-Resource-Id`,
`X-Goog-Message-Number`.

Verarbeitung:
1. Channel-Lookup; mismatch → 404 (Google retried bei 4xx nicht)
2. Token validieren → mismatch → 401
3. `Resource-State='sync'` (initial nach watch): 200 OK, kein Pull
4. `'exists'`: `pullChanges(account)`:
   - `events.list` mit `syncToken`
   - Iteriere Events; bei deleted/updated/inserted entsprechend handeln (siehe §2.4)
   - Neuen `sync_token` speichern
   - Bei 410 GONE → Full-Resync
5. `'not_exists'` (Channel deleted): Kanal als ungültig markieren, Renew triggern
6. Idempotenz: `last_message_number` ≥ eingehender Number → skip

Antwort < 2s; schwere Arbeit ggf. via `task_queue`.

### 5.7 Channel-Renewal (Cron stündlich)

Für Accounts mit `watch_expires_at < now+24h`:
1. `Channels.stop` für alten Channel (best-effort)
2. `Channels.watch` neu mit Lebensdauer **7 Tage** (kürzer als Google-Limit von 30 Tagen,
   damit Probleme früher sichtbar werden). Renewal-Cron mit 24h-Vorlauf renewt also etwa
   alle 6 Tage
3. Neue IDs speichern
4. Sicherheits-Pull mit aktuellem `sync_token`

### 5.8 Live-FreeBusy beim Buchen

In `appointment.service.book()` nach DB-Recheck, vor INSERT:

```typescript
const account = await getActiveAccount(targetUserId)
if (account) {
  const calendarIds = await getWatchedCalendarIds(account.id)  // read_for_busy=true
  const fb = await google.freebusy.query({
    timeMin: startAt, timeMax: endAt,
    items: calendarIds.map(id => ({ id })),
    timeZone: 'UTC'
  })
  if (anyBusy(fb)) throw new SlotNoLongerAvailableError()
}
```

Timeout 3s. Bei Google-Timeout/5xx: **fail-open** (DB-Check muss reichen) +
Audit-Log-Eintrag. Cron-Sync gleicht später ab.

### 5.9 Event-Insert (async nach Buchung)

`task_queue` Job `calendar.event.insert`:

```typescript
const event = await google.events.insert({
  calendarId: account.primary_calendar_id,
  requestBody: {
    summary: `${slotType.name} – ${appt.customer_name}`,
    description: buildDescription(appt),  // Kontaktdaten, Notiz, Storno-Link
    start: { dateTime: appt.start_at.toISOString(), timeZone: 'UTC' },
    end:   { dateTime: appt.end_at.toISOString(),   timeZone: 'UTC' },
    attendees: [{ email: appt.customer_email, displayName: appt.customer_name }],
    reminders: { useDefault: true },
    extendedProperties: { private: { xkmu_appointment_id: appt.id } }
  },
  sendUpdates: 'none'  // Mails verschickt unser System
})
// UPDATE appointments SET google_event_id = event.id, google_calendar_id = primary
```

Retry: bei 5xx exponential backoff via `task_queue.retry_count`, max 5 Versuche. Bei
Permanent-Fail (4xx außer 429): `sync_error` setzen, status bleibt `confirmed`,
Backend-Banner.

### 5.10 External-Event Mapping

- Nur `transparency='opaque'` zählt als busy (`'transparent'` = „Frei" → ignorieren)
- All-Day-Events: blockieren ganzen Tag in der Event-Timezone
- Recurring Events: `events.list` mit `singleEvents=true` → jede Instanz separater Eintrag
- Eigene Events (matching `appointments.google_event_id` oder `extendedProperties.private.xkmu_appointment_id`): nicht in `external_busy` spiegeln

---

## 6. E-Mail-Flow & Storno-Tokens

### 6.1 Mail-Templates

Acht neue System-Templates in `email_templates`, deutschsprachig, bearbeitbar wie bestehende
Course-Reminders (Pattern aus Commit `de125b46`):

| Key | Empfänger | Trigger |
|---|---|---|
| `appointment.customer.confirmation` | Kunde | nach Buchung |
| `appointment.staff.notification` | Mitarbeiter | nach Buchung |
| `appointment.customer.reminder_24h` | Kunde | 24h vor `start_at` |
| `appointment.customer.reminder_1h` | Kunde | 1h vor `start_at` |
| `appointment.customer.cancelled` | Kunde | nach Storno |
| `appointment.customer.rescheduled` | Kunde | nach Umbuchung |
| `appointment.staff.cancelled` | Mitarbeiter | nach Kunden-Storno / Google-Delete |
| `appointment.staff.rescheduled` | Mitarbeiter | nach Kunden-Umbuchung |

Variablen: `{{customer.*}}`, `{{slot.*}}`, `{{appointment.start_local}}` u. ä.,
`{{appointment.end_local}}`, `{{appointment.timezone}}`, `{{appointment.message}}`,
`{{links.cancel_url}}`, `{{links.reschedule_url}}`, `{{links.staff_detail_url}}`,
`{{staff.name}}` (verfügbar, in Defaults nicht prominent), `{{org.*}}`.

Defaults in `src/lib/services/appointment-mail.defaults.ts`. Seed-Migration legt fehlende
Templates an (idempotent).

### 6.2 Mail-Versand-Pipeline

`appointment-mail.service.queueAll(appointmentId)` → `task_queue` INSERTs (`type='email'`
sofort, `type='reminder'` mit `scheduled_at = start_at - 24h` bzw. `-1h`).

`/api/cron/tick` (existiert) verarbeitet fällige Tasks: render Template, sendMail via
`email.service`, mark done.

**Reminder-Re-Check:** vor Versand wird `appointment.status` geprüft. Wenn `cancelled` →
Task skip + delete. Verhindert Reminder für stornierte Termine.

**Bei Storno/Umbuchung:** offene Reminder-Tasks für die `appointmentId` werden gelöscht
(`DELETE FROM task_queue WHERE meta->>'appointment_id' = ? AND type = 'reminder' AND
status = 'pending'`). Bei Reschedule neue Reminders queued.

### 6.3 Storno-/Umbuchungs-Tokens

Format: `<base64url(payload)>.<base64url(sig)>`
- `payload = { a: appointmentId, p: 'cancel' | 'reschedule', e: expiresEpoch, n: nonce }`
- `sig = HMAC-SHA256(JSON.stringify(payload), APPOINTMENT_TOKEN_SECRET)`
- `expiresEpoch = appointment.start_at`

Speicherung: nur `sha256(token)` in DB. Klartext nur in Mail-Link.

Verifizierung: payload+sig parsen → sig check → Hash gegen DB → expires-Check →
Status-Check (cancelled → idempotente Page; completed → 410).

Single-Use / Regeneration:
- Storno: Hashes auf NULL → beide Links tot
- Umbuchung: neue Tokens generieren, neue Hashes, neue Klartext-Links in „verschoben"-Mail

### 6.4 `.ics`-Datei + Add-to-Calendar

- Bestätigungs-Mail enthält `.ics` als Anhang (RFC 5545, METHOD:REQUEST,
  organizer = Mitarbeiter-E-Mail, attendee = Kunde)
- Reschedule: METHOD:REQUEST mit erhöhter SEQUENCE
- Storno: METHOD:CANCEL
- Bestätigungsseite: `.ics`-Download + Google-Calendar-Quicklink
  (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`)

### 6.5 DSGVO

- Kunden-Daten in `appointments` + ggf. als Lead/Person — bestehende DSGVO-Doku gilt
- Storno-Token enthält keine personenbezogenen Daten (nur Appointment-ID + Nonce)
- Token-Klartext nicht in Logs/Audit-Log
- Audit-Log-Eintrag für jede Buchung/Stornierung/Umbuchung (Pattern aus
  `feedback_audit_logging`)

---

## 7. Verfügbarkeits-Berechnung

Reine Funktion; keine I/O nach DB-Reads. Damit testbar ohne DB-Mocks.

### 7.1 Signatur

```typescript
function computeFreeSlots(input: {
  userId: string
  slotType: SlotType
  rangeStart: Date  // UTC
  rangeEnd: Date    // UTC
  rules: AvailabilityRule[]
  overrides: AvailabilityOverride[]
  appointments: Appointment[]    // status != cancelled, with their slot_types loaded
  externalBusy: ExternalBusy[]   // transparency='opaque' nur
  userTimezone: string           // IANA, z. B. 'Europe/Berlin'
  now: Date
}): Date[]  // UTC-Startzeiten freier Slots
```

### 7.2 Algorithmus

1. `rangeStart = max(rangeStart, now + slotType.min_notice_hours)`
   `rangeEnd = min(rangeEnd, now + slotType.max_advance_days)`
   wenn `rangeStart >= rangeEnd`: `return []`
2. **baseWindows** aus rules: für jeden Tag in `[rangeStart..rangeEnd]` (in `userTimezone`)
   alle aktiven rules mit passendem `day_of_week` als UTC-Intervalle generieren
3. Overrides anwenden:
   - `kind='free'`: `baseWindows ∪= override-Intervall`, dann mergen
   - `kind='block'`: `baseWindows = subtract(baseWindows, override-Intervall)`
4. Busy aus `appointments`: für jedes mit status ∈ {`pending`, `confirmed`}:
   `busyInterval = [start_at - slotType.buffer_before, end_at + slotType.buffer_after]`
   `baseWindows = subtract(baseWindows, busyInterval)`
5. Busy aus `externalBusy`: jeden Eintrag (transparency='opaque' bereits gefiltert)
   subtrahieren
6. **Slot-Generierung** auf 15-min-Raster für jedes verbleibende Window `[w_start, w_end]`:
   - `s = ceil15(w_start)`
   - solange `[s - newType.buffer_before, s + duration + newType.buffer_after] ⊆
     [w_start, w_end]`: push `s`, `s += 15min`
7. Return Liste

### 7.3 Buffer-Logik

Wechselseitig — vermeidet Doppelzählung:
- Bestehende `appointments` werden mit **ihrem eigenen** Buffer als blockiertes
  Intervall berücksichtigt (Schritt 4)
- Neue Slots müssen ihre **eigenen** Buffer in das verbleibende freie Window einpassen
  (Schritt 6)

### 7.4 Performance & Caching

- API `availability?date=YYYY-MM-DD`: lädt nur den einen Tag → wenige hundert Datenpunkte
- API `availability/month?yearMonth=YYYY-MM`: pro Tag terminiert sobald erster Slot
  gefunden — Boolean-Liste für Datepicker
- Server-side Redis-Cache (`ioredis` in deps) keyed `avail:<userId>:<slotTypeId>:<date>`,
  TTL 30s, invalidiert bei Buchung/Storno/Sync-Update für betroffenen User+Tag

### 7.5 Edge Cases

- DST-Übergänge: Konvertierung in `userTimezone` mit `Intl.DateTimeFormat` oder
  `date-fns-tz`. Wochenraster-Spanne wird am DST-Tag automatisch korrekt verkürzt/verlängert
- Mitternachts-übergreifende Rules (`end_time <= start_time`): nicht unterstützt in V1,
  Validierung im Formular
- Slot-Dauer > Wochenraster-Fenster: keine Slots, kein Fehler
- Doppelte `read_for_busy`-Kalender mit gleichen Events: Unique-Index
  `(google_calendar_id, google_event_id)` dedupliziert

---

## 8. Tests

### 8.1 Unit-Tests (`src/__tests__/unit/`)

- `availability-calc.service.test.ts`:
  - Wochenraster ohne Overrides
  - Override `block` zerschneidet Intervall
  - Override `free` an blockiertem Tag
  - Bestehende appointments mit eigenem Buffer
  - Buffer des neuen Slot-Typs muss in Window passen
  - 15-min-Raster: 60-min-Slot in 09:00–10:30 → 09:00, 09:15, 09:30
  - DST-Übergangstag: korrekte Slot-Anzahl
  - `min_notice_hours` filtert nahe Zukunft
  - `max_advance_days` filtert ferne Slots
  - `transparency='transparent'` ignoriert
- `appointment-token.service.test.ts`:
  - generate → verify → success
  - manipulierte Sig → fail
  - Hash-Reset → 410
  - Ablauf → 410
- `lead-match.service.test.ts`:
  - bestehende Person → wiederverwendet
  - bestehender Lead → wiederverwendet
  - neue Email → neuer Lead + Person

### 8.2 Integration-Tests (`src/__tests__/integration/`)

- `appointment.service.book.test.ts`:
  - Happy path
  - Race: paralleler `book()` → einer wirft `SlotNoLongerAvailableError`
  - Live-FreeBusy mockt Google → blockt Buchung wenn Google sagt belegt
  - Google-Insert-Fehler nach COMMIT → appointment bleibt, retry queued, `sync_error` gesetzt
- `calendar-sync.service.test.ts`:
  - Webhook Event-Insert → `external_busy` populiert
  - Webhook Event-Delete für matched appointment → cancelled + Mail
  - Webhook Event-Update (Zeit) → reschedule + Mail
  - syncToken expired (410) → full re-sync
- `availability.api.test.ts`:
  - Verschiedene Slot-Types/Tage

### 8.3 E2E (manuell vor Release)

- Mitarbeiter koppelt Google
- Wochenraster + Slot-Typ anlegen
- Öffentliche Buchung → Slot in Google sichtbar
- Reminder-Mail (Time-Travel-Test)
- Storno via Mail-Link
- Umbuchung via Mail-Link

---

## 9. Migrations & Rollout

### 9.1 Migrations

Eine neue Drizzle-Migration `add_appointments_calendar` (Numerierung wird beim
`drizzle-kit generate` automatisch vergeben):
- Tabellen 1.1–1.7
- ALTER `users` ADD `booking_slug`, `booking_page_active`, `timezone` (NOT NULL DEFAULT
  `'Europe/Berlin'`), `booking_page_title`, `booking_page_subtitle`, `booking_page_intro`
- Alle Indizes wie in §1
- Whitelist-Update in `src/lib/db/table-whitelist.ts` für die 7 neuen Tabellen
  (Pattern aus Commit `ce19d3e3`)

Seed-Migration `seed_appointment_email_templates.ts`: System-Templates idempotent anlegen.

### 9.2 Environment-Variablen

```
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
CALENDAR_TOKEN_KEY              # 32 bytes hex
APPOINTMENT_TOKEN_SECRET
APP_PUBLIC_URL                  # für absolute Mail-Links
```

Boot-Validierung: bei fehlenden Vars Soft-Disable (Buchungsseite zeigt „aktuell nicht
möglich", Backend zeigt Konfigurations-Banner). Verhindert harten Crash auf
unkonfigurierten Instanzen.

### 9.3 Rollout-Phasen

Jede Phase deploybar:

1. **Schema + Account-Connect** — Migrations, OAuth, Connect/Disconnect. Noch kein
   Buchungsflow, kein Sync.
2. **Verfügbarkeitsverwaltung** — Slot-Typen + Wochenraster + Overrides UI.
   Backend-Kalender-Übersicht (read-only).
3. **Sync** — Push-Webhook, `external_busy`, Channel-Renewal-Cron, Token-Refresh-Cron.
4. **Öffentliche Buchung** — Buchungsseite, availability-API, book-API mit
   Live-FreeBusy-Check, Google-Event-Insert, Confirmation-Mail.
5. **Reminder + Storno + Umbuchung** — Mail-Templates, Reminder-Tasks, Cancel/
   Reschedule-Tokens und -Pages.
6. **Portal-Variante** — eingeloggte Buchung mit Vorbefüllung, „Meine Termine"-Liste.
7. **Manuelle Buchung im Backend** — Mitarbeiter trägt Termin selbst ein.
8. **Polish** — Add-to-Calendar, `.ics`, Audit-Log-Einträge, Error-Banner.

Phasen 1–4 = MVP, 5 = vor öffentlichem Launch fertig, 6–8 inkrementell.

---

## 10. Out of Scope (V1)

- Multi-Mitarbeiter-Termin / Gruppentermine
- Round-Robin-Routing („nächster freier Berater")
- Bezahlte Termine (Stripe)
- Outlook / iCal / CalDAV (nur Google)
- Wartelisten
- Custom-Formularfelder pro Slot-Typ (nur Standard: Name/Email/Phone/Message)
- SMS-Reminder
- Theming der Buchungsseite über Logo + Texte hinaus
- Slot-Typ-spezifische Wochenraster (ein User-Wochenraster gilt für alle Slot-Typen;
  `is_active` reicht für „Slot-Typ pausieren")
- Manueller Timezone-Switch auf der Buchungsseite (Browser-TZ wird verwendet)

---

## 11. Open Questions / Annahmen

1. **Google Workspace vs. persönlicher Google-Account** — beide funktionieren mit den
   gewählten Scopes; User entscheidet selbst.
2. **Locale der Buchungsseite** — V1 nur Deutsch (de-DE); i18n-Hooks vorbereitet.
3. **Audit-Log-Granularität** — pro Buchung/Storno/Umbuchung ein Eintrag; einzelne
   Sync-Events nicht (zu viel Rauschen).
4. **Rate-Limiting öffentlicher Buchung** — 10/h pro IP; falls bestehende Middleware
   anders, anpassen.
5. **Slot-Typ-Wechsel bei Reschedule** — nicht erlaubt (würde als Neubuchung gelten).

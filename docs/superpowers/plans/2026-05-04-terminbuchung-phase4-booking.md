# Terminbuchung Phase 4 — Öffentliche Buchung — Implementation Plan

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1: Schema-Grundlage, Google-OAuth, Connect-UI
> - ✅ Phase 2: Slot-Typen + Wochenraster + Backend-Kalender
> - ✅ Phase 3: Push-Webhook + external_busy + Sync-Cron + Anzeige
> - **Phase 4 (diese Datei):** Öffentliche Buchungsseite + availability/book-API + Live-FreeBusy + Event-Insert + Confirmation-Mail
> - Phase 5: Reminder + Storno + Umbuchung
> - Phasen 6–8 wie Spec

**Goal:** Externe Kunden buchen einen Termin über `/buchen/<user-slug>`. Sie wählen einen Slot-Typ, ein Datum, eine Uhrzeit, geben Kontaktdaten ein und buchen verbindlich. Beim Commit prüft die App live gegen Google FreeBusy (Race-Guard), legt einen Lead an (Smart-Match per E-Mail), inseriert einen Google-Calendar-Event und schickt eine Bestätigungsmail an Kunde + Mitarbeiter.

**Architecture:** Eine neue Tabelle `appointments`. Reine Berechnungs-Funktion `AvailabilityCalcService.computeFreeSlots` (testbar ohne DB). `AppointmentService.book` als atomare Transaktion mit Race-Guard. `LeadMatchService` per E-Mail-Match in `persons` + `leads`. Erweiterung `CalendarGoogleClient` um `freeBusyQuery` + `eventsInsert`. Mail-Versand über bestehende `email_templates` + `task_queue` (Pattern wie Course-Reminders). Öffentliche Routen unter `/buchen/[slug]/...` (kein Auth, Rate-Limit per IP).

**Tech Stack:** wie Phase 1–3.

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §1.6, §2.3, §4.1, §5.8, §5.9, §6.1, §6.2, §7.

**Codebase-Patterns (wie zuvor):**
- Service: `export const FooService = { method() { ... } }`
- API: `withPermission(...)` für interne, kein Auth + Zod-`safeParse` für öffentliche Routen
- Tests: `setupDbMock()` + `vi.resetModules()` + `vi.doMock`
- Mail-Templates: System-Defaults werden idempotent geseedet, User kann sie via bestehender Template-UI editieren

**Wichtig für Phase 4:** `booking_slug` muss per User gesetzt sein. Ohne Slug → öffentliche Buchungsseite zeigt 404. UI für Slug-Pflege wird in Task 2 ins Profil integriert.

**Bewusst NICHT in Phase 4:**
- Reminder-Mails (24h / 1h) — Phase 5
- Storno + Umbuchung mit signierten Tokens — Phase 5
- Portal-Variante mit eingeloggtem User — Phase 6
- Manuelle Buchung im Backend — Phase 7
- `.ics`-Anhang + Add-to-Calendar — Phase 8 Polish
- Audit-Log-Einträge — Phase 8 Polish

---

## Phase A — Foundation

### Task 1: Migration + Schema (`appointments`)

**Files:**
- Create: `drizzle/migrations/0044_appointments.sql`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/table-whitelist.ts`

**SQL:**

```sql
-- Phase 4: Buchungen
CREATE TABLE appointments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_type_id          uuid NOT NULL REFERENCES slot_types(id) ON DELETE RESTRICT,
  start_at              timestamptz NOT NULL,
  end_at                timestamptz NOT NULL,
  status                varchar(20) NOT NULL DEFAULT 'pending',
  customer_name         varchar(255) NOT NULL,
  customer_email        varchar(255) NOT NULL,
  customer_phone        varchar(50) NOT NULL,
  customer_message      text,
  lead_id               uuid REFERENCES leads(id) ON DELETE SET NULL,
  person_id             uuid REFERENCES persons(id) ON DELETE SET NULL,
  source                varchar(20) NOT NULL,
  cancel_token_hash     varchar(64),
  reschedule_token_hash varchar(64),
  google_event_id       varchar(255),
  google_calendar_id    varchar(255),
  sync_error            text,
  staff_notes           text,
  cancelled_at          timestamptz,
  cancelled_by          varchar(20),
  cancellation_reason   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_appointments_time_order CHECK (end_at > start_at),
  CONSTRAINT chk_appointments_status CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  CONSTRAINT chk_appointments_source CHECK (source IN ('public','portal','manual'))
);
CREATE INDEX idx_appointments_user_start ON appointments(user_id, start_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_google_event ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_appointments_email ON appointments(customer_email);
```

**Drizzle:**

```typescript
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slotTypeId: uuid('slot_type_id').notNull().references(() => slotTypes.id, { onDelete: 'restrict' }),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  customerMessage: text('customer_message'),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 20 }).notNull(),
  cancelTokenHash: varchar('cancel_token_hash', { length: 64 }),
  rescheduleTokenHash: varchar('reschedule_token_hash', { length: 64 }),
  googleEventId: varchar('google_event_id', { length: 255 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  syncError: text('sync_error'),
  staffNotes: text('staff_notes'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: varchar('cancelled_by', { length: 20 }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userStartIdx: index('idx_appointments_user_start').on(t.userId, t.startAt),
  statusIdx: index('idx_appointments_status').on(t.status),
  emailIdx: index('idx_appointments_email').on(t.customerEmail),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, { fields: [appointments.userId], references: [users.id] }),
  slotType: one(slotTypes, { fields: [appointments.slotTypeId], references: [slotTypes.id] }),
  lead: one(leads, { fields: [appointments.leadId], references: [leads.id] }),
  person: one(persons, { fields: [appointments.personId], references: [persons.id] }),
}))

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
```

Whitelist: `'appointments'` zu `TENANT_TABLES`.

Commit: `feat(termine): appointments table (Phase 4)`

---

### Task 2: Booking-Slug + booking_page_active in Profil

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/profile/_components/CalendarConnectCard.tsx` ODER neue Card
- Create: `src/app/api/v1/booking-page/route.ts` (GET aktuell, PATCH update)

Pragmatisch: kleine neue Card im Profil „Buchungs-URL", oberhalb oder unterhalb der Calendar-Card. Felder:
- `booking_slug` (Pflicht für Aktivierung; Validierung lowercase a-z, 0-9, `-`, 3–60 chars; Slug-Verfügbarkeit live prüfen via API)
- `booking_page_active` (Toggle)
- (Phase 8 Polish: `booking_page_title`, `subtitle`, `intro`)

**API `src/app/api/v1/booking-page/route.ts`:**

```typescript
GET → { slug, active }
PATCH { slug, active } → mit Slug-Eindeutigkeitsprüfung
```

Tests:
- GET liefert aktuellen State des authentifizierten Users
- PATCH mit Slug-Kollision → 409
- PATCH mit invalidem Slug-Format → 400

Commit: `feat(termine): booking page settings (slug + active toggle) in profile`

---

## Phase B — Services

### Task 3: `AvailabilityCalcService` (Kernalgorithmus)

**Files:**
- Create: `src/lib/services/availability-calc.service.ts`
- Test: `src/__tests__/unit/services/availability-calc.service.test.ts`

**Public API:**

```typescript
export interface ComputeInput {
  slotType: { durationMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number; minNoticeHours: number; maxAdvanceDays: number }
  rangeStart: Date  // UTC
  rangeEnd: Date    // UTC
  rules: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]
  overrides: { startAt: Date; endAt: Date; kind: 'free' | 'block' }[]
  appointments: { startAt: Date; endAt: Date; bufferBeforeMinutes: number; bufferAfterMinutes: number }[]
  externalBusy: { startAt: Date; endAt: Date }[]  // already filtered to transparency=opaque
  userTimezone: string  // IANA, z. B. 'Europe/Berlin'
  now: Date
}

AvailabilityCalcService.computeFreeSlots(input: ComputeInput): Date[]
```

**Algorithmus (Spec §7.2):**

1. `rangeStart = max(rangeStart, now + min_notice_hours)` ; `rangeEnd = min(rangeEnd, now + max_advance_days)`
2. **baseWindows** aus `rules`: für jeden Tag im Range erzeuge UTC-Intervalle (lokale Zeit → UTC via Timezone)
3. **Overrides** anwenden:
   - `kind=free`: Window dazu, dann mergen
   - `kind=block`: Window subtrahieren
4. **Subtract** existing `appointments` (mit eigenem Buffer): `[appt.startAt - bufferBefore, appt.endAt + bufferAfter]`
5. **Subtract** `externalBusy` (1:1 Intervalle)
6. **Slot-Generierung** auf 15-min-Raster: für jedes verbleibende Window, ab `ceil15(window_start)`, schrittweise +15min, push wenn `[s - newType.bufferBefore, s + duration + newType.bufferAfter] ⊆ window`

**Hilfsfunktionen** (private im Service):
- `localTimeToUtc(date: Date, timeStr: 'HH:MM', tz: string): Date` — verwendet `Intl.DateTimeFormat`-Trick zur TZ-Konversion
- `mergeIntervals(intervals): MergedInterval[]`
- `subtract(windows, blocked)` — gibt Liste Windows zurück, ohne überlappende Bereiche
- `ceil15(d: Date): Date` — auf nächste 15-min-Grenze

**Tests** (alle ohne DB, reine Funktion):
- Wochenraster Mo–Fr 09–17, 30-min-Slot, keine Overrides → 16 Slots/Tag
- 60-min-Slot in Window 09:00–10:30 → 09:00, 09:15, 09:30 (genau 4× → 09:00, 09:15, 09:30 = 3 Slots, nicht 4)
- `kind=block` zerschneidet Window mittendrin → zwei Sub-Windows
- `kind=free` an blockiertem Tag → Slots im freigegebenen Bereich
- Bestehender appointment mit Buffer 10/10 → blockiert `[s-10, e+10]`
- Neuer Slot-Typ Buffer 5/5 → Window muss inkl. Buffer rein passen
- `min_notice_hours = 24` → Slots heute werden gefiltert
- `max_advance_days = 30` → Slots in 31 Tagen werden gefiltert
- DST-Übergang (CEST → CET im Oktober): Anzahl Slots an diesem Tag korrekt
- Externe `transparent` Events sind im Input nicht enthalten (Caller filtert)

Commit: `feat(termine): AvailabilityCalcService — pure function for slot generation`

---

### Task 4: `LeadMatchService` (Smart-Match per E-Mail)

**Files:**
- Create: `src/lib/services/lead-match.service.ts`
- Test: `src/__tests__/unit/services/lead-match.service.test.ts`

**Public API:**

```typescript
LeadMatchService.findOrCreate(input: {
  email: string
  name: string
  phone: string
  source: string  // z. B. 'public_booking'
}): Promise<{ leadId: string | null; personId: string | null }>
```

**Logik:**

1. Person via `email`-Match suchen (`persons` Tabelle hat `email`-Feld) → wenn vorhanden, `personId` setzen
2. Lead via `email` suchen (`leads.email` oder analoges Feld) → wenn vorhanden, `leadId` setzen
3. Wenn nichts gefunden:
   - Person anlegen mit `firstName`/`lastName` (Split per erstes Leerzeichen), `email`, `phone`
   - Lead anlegen mit `personId`, `email`, `name`, `source`, `status: 'new'`
4. Return IDs

**Wichtig:** Schaue dir das bestehende `persons`/`leads`-Schema an, um die richtigen Felder zu verwenden. Falls die Schema-Felder nicht 1:1 passen, an die Realität anpassen.

Tests:
- E-Mail-Match: bestehende Person + Lead → wiederverwendet, kein INSERT
- Bestehende Person aber kein Lead → neuer Lead mit der Person verknüpft
- Niemand existiert → neue Person + neuer Lead
- E-Mail wird case-insensitive normalisiert (lowercase) vor Match

Commit: `feat(termine): LeadMatchService — smart match by email`

---

### Task 5: CalendarGoogleClient — `freeBusyQuery` + `eventsInsert`

**Files:**
- Modify: `src/lib/services/calendar-google.client.ts`
- Modify: `src/__tests__/unit/services/calendar-google.client.test.ts`

```typescript
CalendarGoogleClient.freeBusyQuery(input: {
  accessToken: string
  calendarIds: string[]
  timeMin: Date
  timeMax: Date
}): Promise<{ busy: { calendarId: string; start: Date; end: Date }[] }>

CalendarGoogleClient.eventsInsert(input: {
  accessToken: string
  calendarId: string
  summary: string
  description: string
  startUtc: Date
  endUtc: Date
  attendeeEmail: string
  attendeeName: string
  appointmentId: string  // → extendedProperties.private.xkmu_appointment_id
  sendUpdates?: 'none' | 'all'  // default 'none' (we send our own mails)
}): Promise<{ id: string; htmlLink: string }>
```

Tests:
- `freeBusyQuery` POSTs to `https://www.googleapis.com/calendar/v3/freeBusy`, parses busy-Intervalle
- `eventsInsert` POSTs zu `/calendars/<id>/events`, übergibt `extendedProperties.private.xkmu_appointment_id`, attendees, `sendUpdates`

Commit: `feat(termine): CalendarGoogleClient — freeBusyQuery + eventsInsert`

---

### Task 6: `AppointmentService` (Kern: book)

**Files:**
- Create: `src/lib/services/appointment.service.ts`
- Test: `src/__tests__/unit/services/appointment.service.test.ts`

**Public API (Phase 4):**

```typescript
AppointmentService.book(input: {
  userId: string                  // owner of the calendar
  slotTypeId: string
  startAtUtc: Date
  customerName: string
  customerEmail: string
  customerPhone: string
  customerMessage: string | null
  source: 'public' | 'portal' | 'manual'
}): Promise<Appointment>

class SlotNoLongerAvailableError extends Error {}
```

**Logik:**

1. **Load resources** (in TX):
   - `slotType` via `slot_type_id`, prüfen `userId === slotType.userId` und `isActive`
   - berechne `endAt = startAt + duration_minutes`
2. **Re-check verfügbarkeit gegen lokale DB** (innerhalb TX):
   - Lade `availability_rules`, `overrides`, bestehende `appointments` (status pending/confirmed) für den User in einem engen Range um `[startAt, endAt]`
   - Kürzen über `AvailabilityCalcService.computeFreeSlots` mit dem konkreten startAt — wenn nicht in Liste → throw `SlotNoLongerAvailableError`
3. **Live-FreeBusy gegen Google** (3s Timeout, fail-open):
   - Wenn aktiver Calendar-Account vorhanden: `CalendarGoogleClient.freeBusyQuery` für alle `read_for_busy=true` Kalender im Window `[startAt, endAt]`
   - Wenn busy → throw `SlotNoLongerAvailableError`
   - Bei Google-5xx oder Timeout: fail-open + log
4. **Lead-Match:** `LeadMatchService.findOrCreate(...)` (außerhalb TX, oder innerhalb falls möglich)
5. **INSERT appointments** mit `status='pending'`, `googleEventId=null`
6. **COMMIT TX**
7. **Async (außerhalb TX):**
   - Google-Event anlegen via `eventsInsert` mit `xkmu_appointment_id` extended property
   - Bei Erfolg: UPDATE `appointments` mit `googleEventId`, `googleCalendarId`, `status='confirmed'`
   - Bei Fehler: `status='confirmed'` trotzdem setzen, `sync_error` füllen — Phase 5 Cron retried (Task 5 P3 cron könnte erweitert werden)
8. **Mail queueing:**
   - `AppointmentMailService.queueConfirmation(appointmentId)` (Task 7)
9. Return appointment

Tests:
- Happy Path: book legt appointment an, ruft Lead-Match, Google-Event-Insert, queued Mail
- Race: zwei parallele `book()` für gleichen Slot — nur einer gewinnt, anderer wirft
- Live-FreeBusy meldet busy → wirft `SlotNoLongerAvailableError`
- Google-Timeout bei FreeBusy → fail-open, appointment wird angelegt
- Google-Insert schlägt fehl (4xx) → appointment behält `status=confirmed`, `sync_error` gesetzt

Commit: `feat(termine): AppointmentService.book — atomic booking with race-guard`

---

### Task 7: `AppointmentMailService` + Email-Templates Seed

**Files:**
- Create: `src/lib/services/appointment-mail.service.ts`
- Create: `src/lib/services/appointment-mail.defaults.ts`
- Create: `drizzle/migrations/0045_appointment_email_templates_seed.sql`
- Test: `src/__tests__/unit/services/appointment-mail.service.test.ts`

**Templates für Phase 4 (zwei):**
- `appointment.customer.confirmation` — an den Kunden, deutscher Default
- `appointment.staff.notification` — an den Mitarbeiter (User der Buchung), deutscher Default

Beide Templates haben Variablen:
- `{{customer.name}}`, `{{customer.email}}`, `{{customer.phone}}`, `{{customer.message}}`
- `{{slot.type_name}}`, `{{slot.duration_minutes}}`, `{{slot.location}}`, `{{slot.location_details}}`
- `{{appointment.start_local}}`, `{{appointment.end_local}}`, `{{appointment.timezone}}`
- `{{org.name}}`

**Defaults** in `appointment-mail.defaults.ts` (deutsche Standardtexte). Migration `0045_*.sql` insert-or-update via `WHERE NOT EXISTS` Pattern (siehe `0043_calendar_cron_seed.sql`).

**Service:**

```typescript
AppointmentMailService.queueConfirmation(appointmentId: string): Promise<void>
// Lädt appointment + slotType + user + org, rendert Templates, queued zwei Tasks in task_queue (type='email', scheduledAt=now)
```

Mail-Versand selbst läuft über bestehende `task_queue` (Pattern `process_queue` Cron) und `email.service`.

Tests:
- `queueConfirmation` rendert customer + staff Templates, queued zwei tasks mit korrekten Empfängern

Commit: `feat(termine): appointment confirmation mails (customer + staff) — Phase 4`

---

## Phase C — APIs

### Task 8: `/api/buchen/[slug]/availability` (GET)

**File:** `src/app/api/buchen/[slug]/availability/route.ts`

**Query params:**
- `slotTypeId` (required)
- `date` (required, YYYY-MM-DD in user's timezone)

**Logik:**
1. User per `booking_slug` finden, `booking_page_active` prüfen → 404 wenn nicht
2. SlotType via id laden, prüfen `userId === user.id` und `isActive` → 404 wenn nicht
3. Range: `[date 00:00, date 23:59]` in `users.timezone`, konvertiert zu UTC
4. `availability_rules`, `overrides`, `appointments`, `externalBusy` für User+Range laden
5. `AvailabilityCalcService.computeFreeSlots(...)` aufrufen
6. Response: `{ slots: ['2026-05-04T07:00:00Z', '2026-05-04T07:15:00Z', ...] }`

Tests:
- Slug nicht aktiv → 404
- Happy Path
- Tag ohne Slots → leere Liste

Commit: `feat(termine): /api/buchen/[slug]/availability route`

---

### Task 9: `/api/buchen/[slug]/book` (POST)

**File:** `src/app/api/buchen/[slug]/book/route.ts`

**Body:**

```typescript
{
  slotTypeId: string (uuid)
  startAt: string (ISO datetime)
  customerName: string (1-255)
  customerEmail: string (valid email)
  customerPhone: string (1-50)
  customerMessage: string | null
  consentDsgvo: true  // muss true sein
}
```

**Logik:**
1. User per slug, active prüfen → 404
2. Zod-`safeParse` → 400 bei invalid; `consentDsgvo` muss true sein
3. **Rate-Limit per IP** (siehe ob bestehende Middleware existiert, sonst In-Memory mit IP+Counter, max 10/h pro IP)
4. `AppointmentService.book(...)` aufrufen
5. Bei `SlotNoLongerAvailableError` → 409 mit `{ error: 'slot_unavailable' }`
6. Response: `{ appointmentId, redirectUrl: '/buchen/<slug>/bestaetigt?id=<id>' }`

Tests:
- Happy Path
- Body-Validation (Zod)
- consentDsgvo=false → 400
- Slot-Konflikt → 409

Commit: `feat(termine): /api/buchen/[slug]/book POST route`

---

## Phase D — Public UI

### Task 10: Public Page Schritt 1 — Slot-Typ-Auswahl

**Files:**
- Create: `src/app/(public)/buchen/[slug]/page.tsx`
- Create: `src/app/(public)/buchen/[slug]/_components/SlotTypeChooser.tsx`

Server-Component:
- User per slug + active laden, sonst `notFound()`
- Aktive Slot-Types laden, sortiert nach `displayOrder`
- Render Header (org-Logo + `booking_page_title` oder Default „Termin vereinbaren")

Client-Component:
- Cards-Liste pro slotType: Name, Beschreibung-Auszug, Dauer, Location-Icon, „Auswählen →"-Link
- Klick navigiert zu `/buchen/<slug>/<slotTypeSlug>`

Wichtig: kein User-Name, kein Foto (Spec § Frage 4 / „buchungsurl anpassbar, keine namen").

Commit: `feat(termine): public booking page (step 1: slot type)`

---

### Task 11: Public Page Schritt 2+3 — Datepicker + Slots + Form

**Files:**
- Create: `src/app/(public)/buchen/[slug]/[slotType]/page.tsx`
- Create: `src/app/(public)/buchen/[slug]/[slotType]/_components/BookingWizard.tsx`

Wizard mit URL-State (querystring `?date=YYYY-MM-DD&slot=ISO`) damit Browser-Back funktioniert. Layout: zweispaltig auf Desktop (Datepicker links / Slot-Liste rechts), gestapelt auf Mobile.

**Schritt 2:**
- Datepicker (Monatsansicht). Vergangene Tage und Tage außerhalb `min_notice_hours`/`max_advance_days` ausgegraut
- Bei Klick auf Tag → fetch `/api/buchen/<slug>/availability?slotTypeId=...&date=...` → Slot-Liste rechts (15-min raster)
- Loading-State, Empty-State

**Schritt 3 (gleiches Pageview, scrollt zu Form):**
- Form: Name, E-Mail, Telefon, Nachricht (optional), DSGVO-Checkbox mit Link auf Datenschutz
- Zusammenfassung sichtbar (Slot-Typ + Datum + Zeit)
- Submit → POST → bei 200 redirect, bei 409 Toast „Slot leider gerade vergeben" + zurück zu Schritt 2 (refetch)

Commit: `feat(termine): public booking page (step 2+3: date/slot/form)`

---

### Task 12: Bestätigungsseite

**Files:**
- Create: `src/app/(public)/buchen/[slug]/bestaetigt/page.tsx`

Server-Component:
- searchParam `id`
- Lade appointment via id (eigenständige Route, kein Auth-Check — appointment-id ist genug; alternativ später signed token)
- Validieren: appointment.user.bookingSlug === slug, sonst 404
- Render: Eckdaten (Slot-Typ, Datum, Zeit, Mitarbeiter-frei), Hinweis auf Bestätigungs-Mail

Commit: `feat(termine): public booking confirmation page`

---

## Phase E — Tests + Smoketest + Merge

### Task 13: Vollständiger Test-Lauf + Smoketest

- [ ] `npx vitest run` — alle Phase-4-Tests grün, keine Regressionen
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` — keine neuen Fehler
- [ ] **Manueller Smoketest:**
  1. Migration `0044` + `0045` ausgeführt
  2. Im Profil: `booking_slug = 'tino'` setzen, `booking_page_active = true` toggle
  3. Im Termine-Modul: Termin-Art „Erstgespräch 30 min" anlegen (sofern nicht vorhanden)
  4. `/buchen/tino` öffnen (Inkognito) → Cards sichtbar
  5. „Erstgespräch" wählen → Datepicker
  6. Heute oder einen freien Tag wählen → Slots erscheinen
  7. Slot wählen, Form ausfüllen, DSGVO checken, „Verbindlich buchen"
  8. Bestätigungsseite zeigt Termin
  9. DB-Check: `appointments` Tabelle hat Eintrag mit status=confirmed, googleEventId gesetzt
  10. Im Backend: `/intern/termine` zeigt den Termin im Wochenkalender (in einer späteren Phase eingebaut — aktuell wird er noch nicht gerendert; check über DB)
  11. Inbox: Bestätigungsmail beim Kunden + Mitarbeiter
  12. Google Calendar: Event sichtbar mit korrekten Attendees

### Task 14: Final Code Review + Merge + Push

Subagent dispatchen für End-to-End Review (Security: Rate-Limit, DSGVO-Consent, no-name-leak; Correctness: Race-Guard, Buffer-Logik, TZ; UX: 409-Handling, Empty-States).
Issues fixen.
Merge + push wie Phasen 1-3:

```bash
git checkout main
git pull --rebase origin main
git merge --no-ff feat/termine-phase4 -m "Merge branch 'feat/termine-phase4'"
git push origin main
```

---

## Self-Review

Spec-Coverage Phase 4 (§9.3 #4):
- ✅ Öffentliche Buchungsseite → Tasks 10–12
- ✅ availability-API → Task 8
- ✅ book-API → Task 9
- ✅ Live-FreeBusy → Task 5+6
- ✅ Google-Event-Insert → Task 5+6 async
- ✅ Confirmation-Mail → Task 7

Bewusst nicht:
- Reminder, Storno, Umbuchung → Phase 5
- Portal-Variante → Phase 6
- Manuelle Buchung im Backend → Phase 7
- `.ics`, Add-to-Calendar, Audit-Log → Phase 8
- „Buchungsseite-Branding" (Title/Subtitle/Intro) — Felder existieren in users-Tabelle seit Phase 1, UI-Pflege kommt als Polish nach

Risk-Areas:
- Timezone-Handling im AvailabilityCalc — DST muss korrekt sein
- Race-Conditions beim Buchen — TX + Live-FreeBusy
- E-Mail-Versand — falls SMTP nicht konfiguriert, Buchung nicht blocken
- Rate-Limit — Schutz gegen Abuse vor öffentlich erreichbarer Route

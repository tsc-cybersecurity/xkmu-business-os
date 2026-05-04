# Terminbuchung Phase 6 — Portal-Variante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1: Schema + Google-OAuth + Connect-UI
> - ✅ Phase 2: Slot-Typen + Wochenraster + Backend-Kalender
> - ✅ Phase 3: Push-Webhook + external_busy + Sync-Cron
> - ✅ Phase 4: Öffentliche Buchung
> - ✅ Phase 5: Reminder + Storno + Umbuchung
> - **Phase 6 (diese Datei):** Portal-Variante — eingeloggte Buchung mit Vorbefüllung, „Meine Termine"-Liste mit Cancel/Reschedule
> - Phase 7: Manuelle Backend-Buchung (Mitarbeiter)
> - Phase 8: Polish (`.ics`, Audit-Log)

**Goal:** Portal-User (Kunden eines Unternehmens, die eingeloggt im `/portal` arbeiten) können einen Termin direkt aus dem Portal heraus buchen, ohne ihre Kontaktdaten neu eingeben zu müssen — diese werden aus `persons` (verlinkt via `persons.portal_user_id`) vorbefüllt. Sie sehen ihre kommenden und vergangenen Termine in einer Liste und können sie ohne Token (Auth genügt) stornieren oder umbuchen.

**Architecture:**

- **Auth-Gate**: `/api/portal/...` und `/portal/...` werden im bestehenden Portal-Gate von `src/proxy.ts` zusammen geprüft (Session + Role=`portal_user` + `companyId`). Eine kleine Erweiterung der Bedingung deckt API-Routen mit ab.
- **Service-Layer**: Drei neue Methoden auf `AppointmentService` — `bookForPortal`, `cancelByOwner`, `rescheduleByOwner`. Die ersten beiden teilen sich Mutations-Logik mit den existierenden Token-basierten Methoden via privater Helper (`_applyCancelMutation`, `_applyRescheduleMutation`). Auth-basierte Owner-Checks via `persons.portal_user_id`.
- **APIs unter `/api/portal/termin/...`**: 6 neue Routen — `staff` (list bookable users), `availability` (date+slotType→slots), `book`, `my` (own appts), `[id]/cancel`, `[id]/reschedule`.
- **UI**: Eine Server-Page `/portal/termin/page.tsx` mit zwei Sektionen:
  1. „Termin buchen"-Wizard (Multi-Step Client-Component, ähnlich `BookingWizard`, aber ohne Customer-Form-Step)
  2. „Meine Termine"-Liste mit Detail-Dialog + Cancel/Reschedule-Buttons. Reschedule öffnet einen Dialog mit Datepicker-Wizard inline (kein Token in URL nötig).
- **Source-Field**: `appointments.source = 'portal'` und `appointments.person_id = currentPerson.id` (kein Lead-Match).

**Tech Stack:** Drizzle ORM, Next.js App Router, Zod, Vitest, shadcn/ui. Keine neuen Dependencies.

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §4.4 + §9.3 #6.

**Codebase-Patterns:**
- Service: `export const FooService = { method() { ... } }`
- API: Auth via Proxy-Gate, dann zod-`safeParse`, dann Service-Call
- Session-Lookup in API-Routen: `const session = await getSession(); if (!session) return 401`
- Tests: `setupDbMock()` + `vi.doMock` (siehe Phase-5-Tests als Referenz)

**Constraints:**
- Portal-User gehören zu **einem** `companyId`. Sie können bei jedem User mit `booking_page_active=true` buchen — keine Restriction auf „nur User in der eigenen Tenant" (Single-Tenant-App, alle Termin-User gehören zur selben Org).
- Wenn der Portal-User keine `persons`-Row mit `portal_user_id = session.user.id` hat: API gibt 412 (`person_not_linked`), UI zeigt klare Fehlermeldung + Hinweis, sich beim Admin zu melden.
- „Meine Termine" listet alle Termine mit `person_id = currentPerson.id`, unabhängig davon, ob sie ursprünglich öffentlich oder via Portal gebucht wurden — solange beim Lead-Match in der Public-Buchung der Person verlinkt wurde.

**Bewusst NICHT in Phase 6:**
- `.ics`-Anhang in Bestätigungsmails (Phase 8)
- Audit-Log-Einträge für Portal-Aktionen (Phase 8)
- Multi-Tenant: Portal-User sieht User aus fremden Tenants (V1: nicht relevant, Single-Tenant)
- Konfiguration „welche User sind im Portal buchbar" jenseits von `booking_page_active` — V1 nutzt das gleiche Flag wie die Public-Seite

**File Structure:**

```
src/
  proxy.ts                                                # MOD — Gate auch fuer /api/portal/...
  lib/
    services/
      appointment.service.ts                              # MOD — bookForPortal, cancelByOwner, rescheduleByOwner
                                                          #       + private _applyCancelMutation, _applyRescheduleMutation
      person.service.ts                                   # MOD — getByPortalUserId(userId) (falls noch nicht da)
  app/
    api/
      portal/
        termin/
          staff/route.ts                                  # NEW — GET list of users with booking_page_active=true
          availability/route.ts                           # NEW — GET ?userId=&slotTypeId=&date= → slots
          book/route.ts                                   # NEW — POST {userId, slotTypeId, startAtUtc}
          my/route.ts                                     # NEW — GET — current portal user's appts
          [id]/
            cancel/route.ts                               # NEW — POST optional reason, owner check
            reschedule/route.ts                           # NEW — POST {newStartAtUtc}, owner check
    portal/
      termin/
        page.tsx                                          # NEW — Server: load staff + my-appointments
        _components/
          PortalTerminClient.tsx                          # NEW — Client wrapper for both sections
          BookingWizard.tsx                               # NEW — Multi-step wizard (staff→slot-type→date+time→confirm)
          MyAppointmentsList.tsx                          # NEW — list + detail dialog + actions
          CancelDialog.tsx                                # NEW — auth-based cancel (no token)
          RescheduleDialog.tsx                            # NEW — auth-based reschedule wizard (no token)
__tests__/
  unit/
    services/appointment.service.portal.test.ts          # NEW — bookForPortal, cancelByOwner, rescheduleByOwner
  integration/
    api/portal-termin-staff.test.ts                       # NEW
    api/portal-termin-availability.test.ts                # NEW
    api/portal-termin-book.test.ts                        # NEW
    api/portal-termin-my.test.ts                          # NEW
    api/portal-termin-cancel.test.ts                      # NEW
    api/portal-termin-reschedule.test.ts                  # NEW
```

---

## Phase A — Auth-Gate-Erweiterung

### Task 1: Proxy-Gate auch für `/api/portal/...`

**Files:**
- Modify: `src/proxy.ts`

**Spec:** Der Portal-Gate prüft Session + `role='portal_user'` + `companyId`. Aktuell nur für `/portal/...`. Wir erweitern auf `/api/portal/...`, damit alle Termin-API-Routen unter `/api/portal/termin/...` automatisch portalsessionsgeschützt sind.

- [ ] **Step 1: Existing portal-gate-Block lesen**

```bash
grep -nE "Portal gate|pathname.startsWith\('/portal'\)" src/proxy.ts
```

Der Block startet bei der Bedingung `if (pathname.startsWith('/portal'))`. Erweitern:

- [ ] **Step 2: Edit**

Ändere die Bedingung auf:

```ts
if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
```

und passe die Login-Redirect-Logik an: für `/api/portal/...` sollte ein 401-JSON zurückkommen statt eines Redirects:

```ts
const isApi = pathname.startsWith('/api/')
// ... bei fehlender Session:
if (!sessionToken) {
  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // sonst Redirect wie bisher
}
// ... bei ungültiger Session: analog 401 statt Redirect
// ... bei falscher Rolle: 403 (sowohl HTML als auch JSON)
```

Konkret: schau dir den existing block ab Zeile ~146 an und füge die `isApi`-Branches an den drei relevanten Stellen ein (no token / invalid token / wrong role).

- [ ] **Step 3: Auch `/api/portal/...` in den `/api/v1/`-API-Key-Skip nicht aufnehmen**

Die existierende API-Key-Logik prüft nur `/api/v1/...`. `/api/portal/...` umgeht sie automatisch — gut, denn Portal-Routen sollen NIE per API-Key auth-bar sein.

- [ ] **Step 4: Tests / Manuell verifizieren**

Da `proxy.ts` keine Unit-Tests hat: Smoketest ist Teil von Task 14. Hier nur tsc + manueller Code-Review.

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(termine): extend portal auth gate to /api/portal/* routes"
```

---

## Phase B — Service-Layer

### Task 2: Refactor — Mutations-Helper extrahieren

**Files:**
- Modify: `src/lib/services/appointment.service.ts`

Existierender Code in `cancel()` und `reschedule()` enthält zwei Stellen, die jetzt von Auth-basierten Pendants wiederverwendet werden:
1. `cancel`: Status-Update + null-Hashes + Reminder-Cancel + Mail-Queue + Google-Delete
2. `reschedule`: Verfügbarkeitscheck + Live-FreeBusy + Update + Mail/Reminder/Google-Patch

Damit wir keine Logik-Duplikation kriegen, extrahieren wir die jeweiligen Mutations-Pfade in **private** Helper-Funktionen (Module-scope, nicht im exportierten Service-Object):

- [ ] **Step 1: `_applyCancelMutation` extrahieren**

```ts
async function _applyCancelMutation(args: {
  appointmentId: string
  reason: string | null
  cancelledBy: 'customer' | 'staff'
  appt: Appointment   // Already-loaded row to avoid double-select
}): Promise<void> {
  // 1. DB update
  await db.update(appointments).set({
    status: 'cancelled',
    cancelTokenHash: null,
    rescheduleTokenHash: null,
    cancelledAt: new Date(),
    cancelledBy: args.cancelledBy,
    cancellationReason: args.reason,
    updatedAt: new Date(),
  }).where(eq(appointments.id, args.appointmentId))

  // 2. Cancel pending reminders
  const { AppointmentMailService } = await import('./appointment-mail.service')
  await AppointmentMailService.cancelPendingReminders(args.appointmentId)

  // 3. Queue cancel mails (fail-open)
  try { await AppointmentMailService.queueCancellation(args.appointmentId) }
  catch (err) { console.error('Failed to queue cancel mails:', err) }

  // 4. Google delete (fail-open)
  if (args.appt.googleEventId && args.appt.googleCalendarId) {
    try {
      const account = await CalendarAccountService.getActiveAccount(args.appt.userId)
      if (account) {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        await CalendarGoogleClient.eventsDelete({
          accessToken,
          calendarId: args.appt.googleCalendarId,
          eventId: args.appt.googleEventId,
          sendUpdates: 'all',
        })
      }
    } catch (err) {
      console.warn('Google event delete failed:', err)
    }
  }
}
```

- [ ] **Step 2: `cancel()` ruft `_applyCancelMutation`**

Ersetze den Mutation-Pfad in `cancel()` durch:
```ts
await _applyCancelMutation({
  appointmentId: appt.id,
  reason: args.reason ?? null,
  cancelledBy: 'customer',
  appt,
})
return { alreadyCancelled: false }
```

- [ ] **Step 3: `_applyRescheduleMutation` extrahieren**

```ts
async function _applyRescheduleMutation(args: {
  appointmentId: string
  appt: Appointment
  newStartAtUtc: Date
  newEndAtUtc: Date
  userTimezone: string
}): Promise<void> {
  // 1. DB UPDATE (token hashes get overwritten by loadContext later)
  await db.update(appointments).set({
    startAt: args.newStartAtUtc,
    endAt: args.newEndAtUtc,
    updatedAt: new Date(),
  }).where(eq(appointments.id, args.appointmentId))

  // 2. Cancel old reminders
  const { AppointmentMailService } = await import('./appointment-mail.service')
  await AppointmentMailService.cancelPendingReminders(args.appointmentId)

  // 3. Queue reschedule mails + new reminders (fail-open)
  try { await AppointmentMailService.queueReschedule(args.appointmentId) }
  catch (err) { console.error('Failed to queue reschedule mails:', err) }
  try { await AppointmentMailService.queueReminders(args.appointmentId) }
  catch (err) { console.error('Failed to queue new reminders:', err) }

  // 4. Google patch (fail-open)
  if (args.appt.googleEventId && args.appt.googleCalendarId) {
    try {
      const account = await CalendarAccountService.getActiveAccount(args.appt.userId)
      if (account) {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        await CalendarGoogleClient.eventsPatch({
          accessToken,
          calendarId: args.appt.googleCalendarId,
          eventId: args.appt.googleEventId,
          startUtc: args.newStartAtUtc,
          endUtc: args.newEndAtUtc,
          timeZone: args.userTimezone,
          sendUpdates: 'all',
        })
      }
    } catch (err) {
      console.warn('Google event patch failed:', err)
    }
  }
}
```

- [ ] **Step 4: `reschedule()` ruft `_applyRescheduleMutation`**

- [ ] **Step 5: Bestehende Tests laufen lassen — alles muss weiterhin grün sein**

```bash
npx vitest run src/__tests__/unit/services/appointment.service.cancel.test.ts src/__tests__/unit/services/appointment.service.reschedule.test.ts
```

Erwartung: alle Tests aus Phase 5 weiterhin grün. Wir haben keine Verhalten geändert, nur intern strukturiert.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/appointment.service.ts
git commit -m "refactor(termine): extract _applyCancelMutation + _applyRescheduleMutation helpers"
```

### Task 3: Service-Methode `bookForPortal`

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Create: `src/__tests__/unit/services/appointment.service.portal.test.ts`

**Sub-Step 1: `book()` um `personIdOverride` erweitern**

Das ist eine kleine Schema-Erweiterung von `BookInput`:

```ts
export interface BookInput {
  // ... bestehende Felder
  personIdOverride?: string  // wenn gesetzt: skip LeadMatch, verwende diese personId
}
```

In `book()` Section 5:
```ts
const { leadId, personId } = args.personIdOverride
  ? { leadId: null, personId: args.personIdOverride }
  : await LeadMatchService.findOrCreate({ email, name, phone, source: 'public_booking' })
```

Damit wird beim Portal-Flow der bekannte `personId` verwendet, kein Lead-Match.

**Sub-Step 2: `bookForPortal` implementieren**

```ts
async bookForPortal(args: {
  portalUserId: string  // session.user.id
  userId: string        // staff user being booked with
  slotTypeId: string
  startAtUtc: Date
  message?: string | null
}): Promise<BookResult> {
  // 1. Find linked person via FK (NOT via email-match — that would risk creating a second person)
  const [person] = await db.select().from(persons).where(eq(persons.portalUserId, args.portalUserId)).limit(1)
  if (!person) throw new Error('person_not_linked')
  if (!person.email) throw new Error('person_missing_email')

  // 2. Delegate to existing book() with pre-filled customer fields + personIdOverride
  return AppointmentService.book({
    userId: args.userId,
    slotTypeId: args.slotTypeId,
    startAtUtc: args.startAtUtc,
    customerName: `${person.firstName} ${person.lastName}`.trim(),
    customerEmail: person.email,
    customerPhone: person.phone ?? person.mobile ?? '',
    customerMessage: args.message ?? null,
    source: 'portal',
    personIdOverride: person.id,  // skip lead-match
  })
},
```

Damit ist der Owner-Check in `cancelByOwner`/`rescheduleByOwner` zuverlässig: `appointment.person_id` zeigt garantiert auf die Person, die via `portal_user_id` zum aktuellen Portal-User gehört.

- [ ] **Step 1: Test schreiben — `bookForPortal` happy path**

```ts
it('looks up person by portalUserId and delegates to book()', async () => {
  // Mock persons select → return one person
  // Mock AppointmentService.book → return a fake BookResult
  // Spy on AppointmentService.book to verify it was called with source='portal' + person's email
  // Call AppointmentService.bookForPortal({...}) → assert result === book's return
})

it('throws person_not_linked when no person row exists for portalUserId', async () => {
  // Mock persons select → []
  // Expect throw
})

it('throws person_missing_email when person has null email', async () => {
  // Mock persons select → [{firstName, lastName, email: null}]
  // Expect throw
})
```

- [ ] **Step 2: Implementierung wie oben**

- [ ] **Step 3: Tests grün**

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/appointment.service.ts src/__tests__/unit/services/appointment.service.portal.test.ts
git commit -m "feat(termine): AppointmentService.bookForPortal — pre-fill from linked person"
```

### Task 4: Service-Methode `cancelByOwner`

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Modify: `src/__tests__/unit/services/appointment.service.portal.test.ts`

```ts
async cancelByOwner(args: {
  appointmentId: string
  portalUserId: string
  reason?: string | null
}): Promise<{ alreadyCancelled: boolean }> {
  // 1. Verify ownership: appointment.personId belongs to person.portalUserId == args.portalUserId
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, args.appointmentId)).limit(1)
  if (!appt) throw new Error('appointment_not_found')
  if (!appt.personId) throw new Error('not_owned')

  const [person] = await db.select({ portalUserId: persons.portalUserId })
    .from(persons).where(eq(persons.id, appt.personId)).limit(1)
  if (!person || person.portalUserId !== args.portalUserId) throw new Error('not_owned')

  // 2. Idempotent
  if (appt.status === 'cancelled') return { alreadyCancelled: true }

  // 3. Apply mutation (shared with token-based cancel())
  await _applyCancelMutation({
    appointmentId: appt.id,
    reason: args.reason ?? null,
    cancelledBy: 'customer',  // portal user is still the customer
    appt,
  })
  return { alreadyCancelled: false }
},
```

- [ ] **Step 1: 4 Test-Cases:**
  1. happy path: appt belongs to portal user → status='cancelled'
  2. appt has personId pointing to a different portal user → throws `not_owned`
  3. appt.personId is null → throws `not_owned`
  4. already-cancelled → returns `{alreadyCancelled: true}`

- [ ] **Step 2: Implementierung**
- [ ] **Step 3: Tests grün**
- [ ] **Step 4: Commit**
```bash
git commit -m "feat(termine): AppointmentService.cancelByOwner — auth-based cancel for portal users"
```

### Task 5: Service-Methode `rescheduleByOwner`

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Modify: `src/__tests__/unit/services/appointment.service.portal.test.ts`

Analog `reschedule(token)` aber:
- Identifikation des Termins via `appointmentId` + Owner-Check via `persons.portal_user_id`
- Sonst gleicher Flow wie `reschedule()`: Verfügbarkeitscheck (mit `ne(id, appt.id)`-Filter), Live-FreeBusy, dann `_applyRescheduleMutation`

```ts
async rescheduleByOwner(args: {
  appointmentId: string
  portalUserId: string
  newStartAtUtc: Date
}): Promise<{ startAt: Date; endAt: Date }> {
  // 1. Owner check
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, args.appointmentId)).limit(1)
  if (!appt) throw new Error('appointment_not_found')
  if (!appt.personId) throw new Error('not_owned')
  const [person] = await db.select({ portalUserId: persons.portalUserId })
    .from(persons).where(eq(persons.id, appt.personId)).limit(1)
  if (!person || person.portalUserId !== args.portalUserId) throw new Error('not_owned')
  if (appt.status === 'cancelled') throw new Error('appointment_cancelled')

  // 2. Reuse the existing availability re-check + freeBusy logic. The simplest path:
  // factor out `_validateNewSlot` from reschedule() into a helper that returns the new endAtUtc + userTimezone.
  // Or: copy the relevant block here and live with duplication for now (10 lines).

  // ... re-check (excluding this appt) ...
  // ... live FreeBusy ...

  // 3. Apply mutation
  await _applyRescheduleMutation({
    appointmentId: appt.id,
    appt,
    newStartAtUtc: args.newStartAtUtc,
    newEndAtUtc,
    userTimezone,
  })
  return { startAt: args.newStartAtUtc, endAt: newEndAtUtc }
},
```

> Recommended: extract the entire validation block into a private `_validateNewSlot(appt, newStartAtUtc): { newEndAtUtc, userTimezone }` helper. Both `reschedule()` and `rescheduleByOwner()` then call it. This reduces ~80 lines duplicated to a clean call.

- [ ] **Step 1: Extract `_validateNewSlot` helper from existing `reschedule()`**
- [ ] **Step 2: Implement `rescheduleByOwner` using the helper**
- [ ] **Step 3: Tests** (4 cases: happy path, not_owned, cancelled, slot_unavailable)
- [ ] **Step 4: Verify existing reschedule tests still pass**
- [ ] **Step 5: Commit**
```bash
git commit -m "feat(termine): AppointmentService.rescheduleByOwner — auth-based reschedule"
```

---

## Phase C — APIs

### Task 6: `GET /api/portal/termin/staff`

**Files:**
- Create: `src/app/api/portal/termin/staff/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-staff.test.ts`

Returns users with `booking_page_active=true`. No body validation needed.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, slotTypes } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const staff = await db.select({
    id: users.id, firstName: users.firstName, lastName: users.lastName,
    bookingSlug: users.bookingSlug,
    bookingPageTitle: users.bookingPageTitle,
    bookingPageSubtitle: users.bookingPageSubtitle,
    timezone: users.timezone,
  }).from(users).where(eq(users.bookingPageActive, true))

  // Optionally also pre-load slot types for first-fetch optimization (Step-2)
  const slots = await db.select({
    id: slotTypes.id, userId: slotTypes.userId, name: slotTypes.name,
    durationMinutes: slotTypes.durationMinutes, location: slotTypes.location, locationDetails: slotTypes.locationDetails,
    description: slotTypes.description, color: slotTypes.color,
    minNoticeHours: slotTypes.minNoticeHours, maxAdvanceDays: slotTypes.maxAdvanceDays,
  }).from(slotTypes).where(and(eq(slotTypes.isActive, true)))

  // Group slot types by user
  const slotsByUser = new Map<string, typeof slots>()
  for (const s of slots) {
    const list = slotsByUser.get(s.userId) ?? []
    list.push(s)
    slotsByUser.set(s.userId, list)
  }

  return NextResponse.json({
    staff: staff.map(u => ({
      ...u,
      slotTypes: slotsByUser.get(u.id) ?? [],
    })),
  })
}
```

- [ ] **Step 1: Implement route**
- [ ] **Step 2: Test (auth required + returns staff)**
- [ ] **Step 3: tsc + commit**
```bash
git commit -m "feat(termine): GET /api/portal/termin/staff"
```

### Task 7: `GET /api/portal/termin/availability`

**Files:**
- Create: `src/app/api/portal/termin/availability/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-availability.test.ts`

Identisch zu `src/app/api/buchen/[slug]/availability/route.ts` (siehe Phase 4), aber:
- Auth via `getSession` (Pfad ist schon portal-gegated)
- Query-Param `userId` statt `slug` (oder weiterhin `slug`, einfacher)

Empfehlung: nutze weiterhin `slug` als Query-Param — dann ist die existierende public-Route 1:1 mit minimalem Reuse-Risk in eine private Variante kopierbar. Oder: query-Param `userId` + interner Lookup.

Implementiere `userId`-basierten Path (Portal kennt User-IDs aus `staff`).

- [ ] **Step 1: Copy logic from public availability route, adjust params**
- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): GET /api/portal/termin/availability"
```

### Task 8: `POST /api/portal/termin/book`

**Files:**
- Create: `src/app/api/portal/termin/book/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-book.test.ts`

```ts
const BodySchema = z.object({
  userId: z.string().uuid(),       // Staff being booked
  slotTypeId: z.string().uuid(),
  startAtUtc: z.string().datetime(),
  message: z.string().max(2000).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const result = await AppointmentService.bookForPortal({
      portalUserId: session.user.id,
      userId: parsed.data.userId,
      slotTypeId: parsed.data.slotTypeId,
      startAtUtc: new Date(parsed.data.startAtUtc),
      message: parsed.data.message ?? null,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof SlotNoLongerAvailableError) {
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 })
    }
    if (err instanceof Error && err.message === 'person_not_linked') {
      return NextResponse.json({ error: 'person_not_linked' }, { status: 412 })
    }
    if (err instanceof Error && err.message === 'person_missing_email') {
      return NextResponse.json({ error: 'person_missing_email' }, { status: 412 })
    }
    console.error('Portal book error:', err)
    return NextResponse.json({ error: 'book_failed' }, { status: 500 })
  }
}
```

- [ ] **Step 1: Implement route**
- [ ] **Step 2: Tests (happy path, slot_unavailable, person_not_linked, invalid_body)**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): POST /api/portal/termin/book"
```

### Task 9: `GET /api/portal/termin/my`

**Files:**
- Create: `src/app/api/portal/termin/my/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-my.test.ts`

Returns appointments where `appointments.person_id` belongs to the current portal user.

```ts
export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Find linked person
  const [person] = await db.select({ id: persons.id })
    .from(persons).where(eq(persons.portalUserId, session.user.id)).limit(1)
  if (!person) return NextResponse.json({ appointments: [] })

  // List appointments with slot type + staff info
  const rows = await db.select({
    id: appointments.id,
    startAt: appointments.startAt,
    endAt: appointments.endAt,
    status: appointments.status,
    customerMessage: appointments.customerMessage,
    cancelledAt: appointments.cancelledAt,
    cancellationReason: appointments.cancellationReason,
    slotTypeName: slotTypes.name,
    slotTypeColor: slotTypes.color,
    location: slotTypes.location,
    locationDetails: slotTypes.locationDetails,
    durationMinutes: slotTypes.durationMinutes,
    staffFirstName: users.firstName,
    staffLastName: users.lastName,
    staffTimezone: users.timezone,
  }).from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .innerJoin(users, eq(appointments.userId, users.id))
    .where(eq(appointments.personId, person.id))
    .orderBy(desc(appointments.startAt))

  return NextResponse.json({ appointments: rows })
}
```

- [ ] **Step 1: Implement route + tests**
- [ ] **Step 2: Commit**
```bash
git commit -m "feat(termine): GET /api/portal/termin/my"
```

### Task 10: `POST /api/portal/termin/[id]/cancel`

**Files:**
- Create: `src/app/api/portal/termin/[id]/cancel/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-cancel.test.ts`

```ts
const BodySchema = z.object({ reason: z.string().max(500).nullable().optional() })

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  let raw: unknown = {}
  try { raw = await req.json() } catch { /* empty body OK */ }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const { alreadyCancelled } = await AppointmentService.cancelByOwner({
      appointmentId: id,
      portalUserId: session.user.id,
      reason: parsed.data.reason,
    })
    return NextResponse.json({ success: true, alreadyCancelled })
  } catch (err) {
    if (err instanceof Error && err.message === 'not_owned') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (err instanceof Error && err.message === 'appointment_not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    console.error('Portal cancel error:', err)
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }
}
```

- [ ] **Step 1: Implement + tests (4 cases)**
- [ ] **Step 2: Commit**
```bash
git commit -m "feat(termine): POST /api/portal/termin/[id]/cancel"
```

### Task 11: `POST /api/portal/termin/[id]/reschedule`

**Files:**
- Create: `src/app/api/portal/termin/[id]/reschedule/route.ts`
- Create: `src/__tests__/integration/api/portal-termin-reschedule.test.ts`

Analog Task 10 aber:
- Body: `{ startAtUtc: string }`
- Service: `rescheduleByOwner`
- Errors: `not_owned` → 403, `appointment_cancelled` → 410, `slot_unavailable` (SlotNoLongerAvailableError) → 409

- [ ] **Step 1: Implement**
- [ ] **Step 2: Tests**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): POST /api/portal/termin/[id]/reschedule"
```

---

## Phase D — UI

### Task 12: Server-Page `/portal/termin/page.tsx`

**Files:**
- Create: `src/app/portal/termin/page.tsx`
- Create: `src/app/portal/termin/_components/PortalTerminClient.tsx`

```tsx
// page.tsx (server component)
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { persons, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { PortalTerminClient } from './_components/PortalTerminClient'

export default async function PortalTerminPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') redirect('/intern/login')

  // Find linked person — show error if not linked
  const [person] = await db.select().from(persons)
    .where(eq(persons.portalUserId, session.user.id)).limit(1)
  if (!person) {
    return (
      <main className="container max-w-md py-12">
        <h1 className="text-2xl font-semibold mb-4">Termin buchen</h1>
        <p className="text-muted-foreground">
          Dein Account ist noch nicht mit einem Personenprofil verknüpft. Bitte wende dich an deinen Administrator.
        </p>
      </main>
    )
  }

  return (
    <main className="container max-w-3xl py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Termine</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hier kannst du neue Termine buchen und bestehende einsehen oder anpassen.
        </p>
      </header>

      <PortalTerminClient />
    </main>
  )
}
```

```tsx
// PortalTerminClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { BookingWizard } from './BookingWizard'
import { MyAppointmentsList } from './MyAppointmentsList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function PortalTerminClient() {
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  return (
    <Tabs defaultValue="my">
      <TabsList>
        <TabsTrigger value="my">Meine Termine</TabsTrigger>
        <TabsTrigger value="book">Termin buchen</TabsTrigger>
      </TabsList>
      <TabsContent value="my" className="pt-4">
        <MyAppointmentsList key={`my-${refreshKey}`} onChanged={triggerRefresh} />
      </TabsContent>
      <TabsContent value="book" className="pt-4">
        <BookingWizard onBooked={triggerRefresh} />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 1: Create page + container component**
- [ ] **Step 2: tsc clean**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): /portal/termin page shell with tabs"
```

### Task 13: `BookingWizard.tsx` (Portal-Variante)

**Files:**
- Create: `src/app/portal/termin/_components/BookingWizard.tsx`

Steps:
1. Lade `/api/portal/termin/staff` beim mount → Cards
   - Bei genau 1 aktiven User: skip Step 1, jump to Step 2 mit dem User pre-selected
2. Slot-Type-Auswahl Cards des gewählten Users
3. Datum-Picker + Slots (fetch `/api/portal/termin/availability?userId=&slotTypeId=&date=`)
4. Confirm + optionale Nachricht → POST `/api/portal/termin/book`

Re-use UI-Patterns aus `src/app/(public)/buchen/[slug]/[slotType]/_components/BookingWizard.tsx` (Calendar, Slot-Liste). Keine Customer-Form-Step (nur Nachricht-Textarea).

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface SlotType {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  location: string
  locationDetails: string | null
  minNoticeHours: number
  maxAdvanceDays: number
  color: string
}
interface StaffEntry {
  id: string
  firstName: string | null
  lastName: string | null
  bookingPageTitle: string | null
  bookingPageSubtitle: string | null
  timezone: string
  slotTypes: SlotType[]
}

export function BookingWizard({ onBooked }: { onBooked?: () => void }) {
  const [staff, setStaff] = useState<StaffEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1|2|3|4>(1)
  const [selStaff, setSelStaff] = useState<StaffEntry | null>(null)
  const [selSlotType, setSelSlotType] = useState<SlotType | null>(null)
  // ... date/slot state, message state, submitting state
  // ... fetch logic, calendar grid, slot list, submit handler

  useEffect(() => {
    fetch('/api/portal/termin/staff').then(r => r.json()).then(d => {
      setStaff(d.staff ?? [])
      // Auto-skip step 1 if exactly one staff member
      if ((d.staff ?? []).length === 1) {
        setSelStaff(d.staff[0])
        setStep(2)
      }
      setLoading(false)
    }).catch(() => { toast.error('Fehler beim Laden'); setLoading(false) })
  }, [])

  // ... rest similar to public BookingWizard but no customer form, posting to /api/portal/termin/book
}
```

> **DRY-Hinweis:** der Datepicker + Slot-Liste sind nahezu identisch mit dem Public-`BookingWizard`. Falls Zeit ist, lohnt es sich, beide Wizards zu refactoren und `<DateSlotPicker />` als Sub-Component zu extrahieren — aber das ist Phase-7-Refactor-Material. Für Phase 6 reicht copy-paste der UI-Blöcke.

- [ ] **Step 1: Implement (use public BookingWizard as reference)**
- [ ] **Step 2: tsc + ESLint clean**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): portal booking wizard"
```

### Task 14: `MyAppointmentsList.tsx` + Cancel/Reschedule-Dialoge

**Files:**
- Create: `src/app/portal/termin/_components/MyAppointmentsList.tsx`
- Create: `src/app/portal/termin/_components/CancelDialog.tsx`
- Create: `src/app/portal/termin/_components/RescheduleDialog.tsx`

`MyAppointmentsList`: lädt `GET /api/portal/termin/my`. Zeigt zwei Sektionen (zukünftig + vergangen). Pro Termin:
- Slot-Typ-Name + Datum/Uhrzeit (im timezone des Staff-Users formatiert)
- Status-Badge
- Bei status='confirmed' und startAt in der Zukunft: „Stornieren" + „Umbuchen"-Buttons → öffnen entsprechenden Dialog
- Bei status='cancelled': dimmed mit „Storniert am ..."

`CancelDialog`: einfacher Confirm-Dialog mit optionalem Grund-Textarea. POST `/api/portal/termin/[id]/cancel`. Bei Erfolg: Liste neu laden via `onChanged`.

`RescheduleDialog`: Datepicker + Slot-Liste (auth-required Variante der Availability — eventuell hier neue Endpoint `/api/portal/termin/[id]/reschedule-availability` falls anderer Owner-Check nötig, sonst reuse `availability` mit dem userId+slotTypeId aus dem Termin). POST `/api/portal/termin/[id]/reschedule` mit dem neuen `startAtUtc`.

- [ ] **Step 1: Implement all three components**
- [ ] **Step 2: tsc + ESLint clean**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(termine): portal my-appointments list + cancel/reschedule dialogs"
```

---

## Phase E — Tests + Smoketest

### Task 15: Vollständiger Test-Lauf

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` keine neuen Fehler
- [ ] `npx vitest run` — alle Phase-6-Tests grün, keine Regressionen ggü. Stand vor Phase 6
- [ ] **Manueller Smoketest (Portal-User):**
  1. Als Portal-User einloggen (vorher Person + Portal-User-Verknüpfung erstellen falls noch nicht)
  2. `/portal/termin` öffnen → Tabs „Meine Termine" + „Termin buchen"
  3. Tab „Termin buchen" → Staff-Cards (oder Auto-Skip bei 1 User)
  4. Slot-Typ wählen → Datepicker → freier Slot → optional Nachricht → buchen
  5. Erfolgsmeldung, Tab springt zurück zu „Meine Termine", neuer Termin in Liste
  6. DB-Check: `appointments.source = 'portal'`, `person_id` gesetzt
  7. Bestätigungsmail kommt an (gleiche Templates wie Public-Buchung)
  8. „Stornieren" auf den neuen Termin → Confirm → Status-Update → Liste aktualisiert (Termin grayed)
  9. DB: status='cancelled', cancelTokenHash null
  10. **Reschedule-Test:** zweiten Termin buchen, „Umbuchen" klicken → Datepicker → neuen Slot → Submit → Erfolg → DB hat neue Zeit
  11. **Permission-Test:** versuche `/api/portal/termin/staff` ohne Login → 401 erwartet
  12. **Cross-Owner-Test:** versuche `/api/portal/termin/{id-eines-fremden-Termins}/cancel` → 403 erwartet
  13. **Person-not-linked-Test:** Portal-User ohne `persons.portal_user_id` → klare Fehlermeldung statt Crash

### Task 16: Final Code Review + Push

Subagent dispatchen für End-to-End Review (Auth-Gate, Owner-Check, DRY, UX).

```bash
git push origin main
```

---

## Self-Review

**Spec-Coverage Phase 6 (§4.4 + §9.3 #6):**
- ✅ Portal-Page mit User-Cards (Auto-Skip bei 1 User) → Task 12+13
- ✅ Kontaktdaten vorbefüllt + readonly via `bookForPortal` (kein Form-Step) → Task 3+13
- ✅ `appointments.source='portal'`, `person_id` direkt verlinkt → Task 3 (via book() → Lead-Match findet die Person via E-Mail)
- ✅ „Meine Termine"-Liste mit Cancel/Reschedule ohne Token → Tasks 4+5+10+11+14

**Bewusst nicht:**
- `.ics`-Anhang → Phase 8
- Audit-Log-Einträge für Portal-Actions → Phase 8

**Risk-Areas:**
- **Owner-Check via Person-Email-Match:** wenn der Portal-User eine andere E-Mail hat als die `persons.email` (oder mehrere `persons` mit derselben E-Mail existieren), könnte der Cancel/Reschedule-Owner-Check failen. Mitigation: Owner-Check via `persons.portal_user_id` (direkter FK), nicht via E-Mail.
- **Lead-Match überschreibt `personId`:** `book()` ruft `LeadMatchService.findOrCreate({email})` auf, der eine neue Person anlegt, wenn die E-Mail nicht gefunden wird. Im Portal-Pfad sollte die Person gefunden werden (sie ist verlinkt). Falls nicht: Fallback wird eine zweite Person-Row erstellt, was zu Owner-Check-Inkonsistenzen führen kann. → Im `bookForPortal` direkt `personId` an `book()` durchreichen statt via E-Mail-Match laufen lassen. **Plan-Anpassung:** `book()` muss optional einen `personIdOverride`-Parameter akzeptieren, der den Lead-Match überspringt. Diese kleine Erweiterung gehört in Task 3.
- **Timezone in „Meine Termine":** Termine werden in der TZ des **Staff-Users** dargestellt (nicht des Portal-Users), weil das die kanonische Termin-TZ ist. Wenn der Portal-User in einer anderen TZ ist, sieht er die Zeit "wie sie der Staff-User sieht". Das ist konsistent mit Email-Templates. UX-OK für V1.
- **CSRF im Portal-API-Gate:** der bestehende Portal-Block in proxy.ts macht CSRF-Check für Mutation-Methoden. Stelle sicher, dass die Erweiterung auf `/api/portal/...` das beibehält (ist im Standard-Pfad enthalten).

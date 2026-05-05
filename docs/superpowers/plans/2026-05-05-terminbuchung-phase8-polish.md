# Terminbuchung Phase 8 — Polish (.ics + Audit-Log + Add-to-Calendar) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1–7 fertig
> - **Phase 8 (diese Datei):** Polish — `.ics`-Anhang, Audit-Log, Add-to-Calendar

**Goal:** Bestätigungs-/Reschedule-/Storno-Mails enthalten `.ics`-Anhänge (RFC 5545). Mutationen am Termin (book/cancel/reschedule) werden revisionssicher in `audit_logs` persistiert. Bestätigungsseite zeigt `.ics`-Download + Google-Calendar-Quicklink.

**Architecture:**

- **`.ics`:** Pure-Function-Util `buildIcs(args, method)` baut RFC 5545 VCALENDAR-String. Migration `0048` ergänzt `appointments.ics_sequence` (int, default 0). `AppointmentMailService.queueConfirmation` / `queueReschedule` / `queueCancellation` legen den `.ics` als String in den `task_queue`-Payload (Feld `attachments`). Der `email`-Handler reicht `attachments` durch `EmailService.send` → `EmailSmtpService.send` (aktuell drop, muss geplumbt werden).
- **Audit-Log:** Aufrufe in den **Route-Handlern** (nicht im Service), weil dort `NextRequest` für IP/UA verfügbar ist. Drei Actions: `appointment.create`, `appointment.cancel`, `appointment.reschedule`. Payload je nach Aktion (z.B. source, slotTypeId, oldStartAt, cancelledBy). Cancel/Reschedule via Token: `userRole='customer'`, `userId=null`. Portal: `userRole='portal_user'`, `userId=portalSession.userId`. Manuell: `userRole='staff'`, `userId=session.user.id`.
- **Add-to-Calendar:** Neuer Endpoint `GET /api/v1/appointments/[id]/ics` (öffentlich, UUID-guarded — selbes Trust-Model wie die `/buchen/<slug>/bestaetigt`-Seite). Bestätigungsseite zeigt Download-Button + Google-Quicklink (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`).

**Tech Stack:** Next.js 15, TypeScript, Drizzle, vitest. Kein neues NPM-Dependency — `.ics` wird per String-Builder generiert (RFC 5545 ist textbasiert).

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §6.4 (`.ics`), §8 (Audit-Log), §9.3 #8 (Phase-Liste).

**Codebase-Patterns:**

- Tests-Konvention wie Phase 5–7 (`src/__tests__/unit/services/appointment.service.*.test.ts`)
- Audit-Log-Service liegt unter `src/lib/services/audit-log.service.ts` und exportiert `AuditLogService.log({userId?, userRole?, action, entityType?, entityId?, payload?, request?})`. Wirft bei DB-Fehler — Caller entscheidet über fail-safe vs. propagieren.
- `EmailSmtpService.send` (DB-Account-Pfad in `src/lib/services/email-smtp.service.ts`) **droppt aktuell `attachments`** — das muss geplumbt werden, sonst landen `.ics`-Anhänge nicht beim Kunden.
- Migration-Numerierung: nächste freie ist `0048`.

**Bewusst NICHT in Phase 8:**

- Outlook-Quicklink (nur Google in V1; Spec nennt nur Google).
- Add-to-Calendar im **Portal** „Meine Termine" (nur öffentliche Bestätigungsseite — Portal kommt nach).
- `.ics` für Reminder-Mails (nur Confirmation/Reschedule/Cancel — Reminder ist Erinnerung, kein Kalender-Event-Statement).
- Locale-Detection für `.ics` (de-DE-only, hardcoded).

**File Structure:**

```
drizzle/
  migrations/
    0048_appointments_ics_sequence.sql                       # NEW

src/
  lib/
    services/
      appointment-ics.util.ts                                # NEW — buildIcs() pure
      appointment-mail.service.ts                            # MOD — attach .ics on confirmation/reschedule/cancellation
      appointment.service.ts                                 # MOD — increment ics_sequence on reschedule + cancel
      email-smtp.service.ts                                  # MOD — pass attachments through to nodemailer
      task-queue.service.ts                                  # MOD — email handler forwards attachments from payload
    db/
      schema.ts                                              # MOD — appointments.icsSequence column
  app/
    api/
      buchen/
        [slug]/book/route.ts                                 # MOD — write audit-log on success
        cancel/route.ts                                      # MOD — write audit-log on success
        reschedule/route.ts                                  # MOD — write audit-log on success
      portal/
        termin/
          book/route.ts                                      # MOD — write audit-log
          [id]/cancel/route.ts                               # MOD — write audit-log
          [id]/reschedule/route.ts                           # MOD — write audit-log
      v1/
        appointments/
          route.ts                                           # MOD — write audit-log (manual)
          [id]/
            ics/
              route.ts                                       # NEW — GET .ics download
    (public)/
      buchen/
        [slug]/
          bestaetigt/
            page.tsx                                         # MOD — add download + Google-Quicklink

__tests__/
  unit/services/
    appointment-ics.util.test.ts                             # NEW — buildIcs unit (REQUEST + CANCEL + reschedule SEQUENCE)
    appointment-mail.ics.test.ts                             # NEW — attachment plumbed to taskQueue payload
  integration/api/
    appointment-ics-download.test.ts                         # NEW — GET /api/v1/appointments/[id]/ics
    appointment-audit-log.test.ts                            # NEW — three audit-log actions land in DB
```

---

## Phase A — `.ics`-Anhang

### Task 1: `appointment-ics.util.ts`

**Files:**
- Create: `src/lib/services/appointment-ics.util.ts`
- Create: `src/__tests__/unit/services/appointment-ics.util.test.ts`

**Goal:** Pure function builds RFC 5545 VCALENDAR string for METHOD:REQUEST or METHOD:CANCEL.

```ts
// src/lib/services/appointment-ics.util.ts
export interface IcsArgs {
  uid: string                  // appointments.id (becomes UID with @xkmu.de domain)
  sequence: number             // appointments.icsSequence (incremented on reschedule/cancel)
  method: 'REQUEST' | 'CANCEL'
  startUtc: Date
  endUtc: Date
  summary: string              // e.g. slot type name
  description: string          // multi-line; auto-escaped
  location: string             // free text
  organizerEmail: string       // staff
  organizerName: string
  attendeeEmail: string        // customer
  attendeeName: string
  status?: 'CONFIRMED' | 'CANCELLED'   // defaults: REQUEST→CONFIRMED, CANCEL→CANCELLED
}

export function buildIcs(args: IcsArgs): string {
  // RFC 5545: lines must use CRLF; >75 octets per line should be folded
  // (we use short lines so folding rarely needed; still apply foldLine to TEXT props)
  // ...
}
```

**Rules to honor:**
- CRLF line endings (`\r\n`).
- Escape `\` `;` `,` `\n` in TEXT properties (per RFC 5545 §3.3.11).
- DTSTART/DTEND in UTC: `YYYYMMDDTHHMMSSZ`.
- DTSTAMP set to `now()` UTC.
- UID format: `${args.uid}@xkmu.de`.
- METHOD set per arg; STATUS defaults to CONFIRMED for REQUEST and CANCELLED for CANCEL.
- VEVENT fields: UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, STATUS, SEQUENCE, ORGANIZER (`mailto:`), ATTENDEE (`mailto:`).
- For CANCEL: STATUS:CANCELLED, METHOD:CANCEL, identical UID + bumped SEQUENCE.

**Steps:**

- [ ] **Step 1: Write failing tests**
  Create `src/__tests__/unit/services/appointment-ics.util.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'
  import { buildIcs } from '@/lib/services/appointment-ics.util'

  const baseArgs = {
    uid: 'a0000000-0000-4000-8000-000000000001',
    sequence: 0,
    startUtc: new Date('2026-05-08T13:00:00Z'),
    endUtc: new Date('2026-05-08T13:30:00Z'),
    summary: 'Erstgespräch',
    description: 'Telefon: +49\nE-Mail: kunde@example.com',
    location: 'Telefon',
    organizerEmail: 'staff@xkmu-digitalsolutions.de',
    organizerName: 'Tino Stenzel',
    attendeeEmail: 'kunde@example.com',
    attendeeName: 'Anna Schmidt',
  }

  describe('buildIcs', () => {
    it('REQUEST produces VCALENDAR with method REQUEST + status CONFIRMED', () => {
      const ics = buildIcs({ ...baseArgs, method: 'REQUEST' })
      expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
      expect(ics).toContain('METHOD:REQUEST')
      expect(ics).toContain('STATUS:CONFIRMED')
      expect(ics).toContain('UID:a0000000-0000-4000-8000-000000000001@xkmu.de')
      expect(ics).toContain('DTSTART:20260508T130000Z')
      expect(ics).toContain('DTEND:20260508T130000Z'.replace('130000', '133000'))
      expect(ics).toContain('SEQUENCE:0')
      expect(ics).toContain('SUMMARY:Erstgespräch')
      expect(ics).toContain('ORGANIZER;CN=Tino Stenzel:mailto:staff@xkmu-digitalsolutions.de')
      expect(ics).toContain('ATTENDEE;CN=Anna Schmidt;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:kunde@example.com')
      expect(ics).toMatch(/END:VCALENDAR\r\n$/)
    })

    it('escapes \\, ;, , and \\n in TEXT properties', () => {
      const ics = buildIcs({ ...baseArgs, method: 'REQUEST', description: 'a;b,c\\d\ne' })
      expect(ics).toContain('DESCRIPTION:a\\;b\\,c\\\\d\\ne')
    })

    it('CANCEL produces METHOD:CANCEL + STATUS:CANCELLED with same UID', () => {
      const ics = buildIcs({ ...baseArgs, method: 'CANCEL', sequence: 2 })
      expect(ics).toContain('METHOD:CANCEL')
      expect(ics).toContain('STATUS:CANCELLED')
      expect(ics).toContain('SEQUENCE:2')
      expect(ics).toContain('UID:a0000000-0000-4000-8000-000000000001@xkmu.de')
    })

    it('uses CRLF line endings exclusively', () => {
      const ics = buildIcs({ ...baseArgs, method: 'REQUEST' })
      // No bare \n
      expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/)
    })
  })
  ```

- [ ] **Step 2: Run tests, verify they fail**
  `npx vitest run src/__tests__/unit/services/appointment-ics.util.test.ts`
  Expected: FAIL with "Cannot find module '@/lib/services/appointment-ics.util'".

- [ ] **Step 3: Implement `buildIcs`**

  ```ts
  // src/lib/services/appointment-ics.util.ts
  export interface IcsArgs {
    uid: string
    sequence: number
    method: 'REQUEST' | 'CANCEL'
    startUtc: Date
    endUtc: Date
    summary: string
    description: string
    location: string
    organizerEmail: string
    organizerName: string
    attendeeEmail: string
    attendeeName: string
    status?: 'CONFIRMED' | 'CANCELLED'
  }

  function escapeText(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  function fmtUtc(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  }

  /** Fold lines longer than 75 octets per RFC 5545 §3.1 (continuation = CRLF + space). */
  function foldLine(line: string): string {
    if (line.length <= 75) return line
    const out: string[] = []
    let rest = line
    out.push(rest.slice(0, 75))
    rest = rest.slice(75)
    while (rest.length > 74) {
      out.push(' ' + rest.slice(0, 74))
      rest = rest.slice(74)
    }
    if (rest.length > 0) out.push(' ' + rest)
    return out.join('\r\n')
  }

  export function buildIcs(args: IcsArgs): string {
    const status = args.status ?? (args.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED')
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//xKMU//Business OS//DE',
      'CALSCALE:GREGORIAN',
      `METHOD:${args.method}`,
      'BEGIN:VEVENT',
      `UID:${args.uid}@xkmu.de`,
      `DTSTAMP:${fmtUtc(new Date())}`,
      `DTSTART:${fmtUtc(args.startUtc)}`,
      `DTEND:${fmtUtc(args.endUtc)}`,
      `SUMMARY:${escapeText(args.summary)}`,
      `DESCRIPTION:${escapeText(args.description)}`,
      `LOCATION:${escapeText(args.location)}`,
      `STATUS:${status}`,
      `SEQUENCE:${args.sequence}`,
      `ORGANIZER;CN=${escapeText(args.organizerName)}:mailto:${args.organizerEmail}`,
      `ATTENDEE;CN=${escapeText(args.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${args.attendeeEmail}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
    return lines.map(foldLine).join('\r\n') + '\r\n'
  }
  ```

- [ ] **Step 4: Run tests, verify they pass**
  `npx vitest run src/__tests__/unit/services/appointment-ics.util.test.ts`
  Expected: 4/4 pass.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/services/appointment-ics.util.ts src/__tests__/unit/services/appointment-ics.util.test.ts
  git commit -m "feat(termine): appointment-ics.util — RFC 5545 VCALENDAR builder"
  ```

---

### Task 2: Migration `0048` — `appointments.ics_sequence`

**Files:**
- Create: `drizzle/migrations/0048_appointments_ics_sequence.sql`
- Modify: `src/lib/db/schema.ts`

**Goal:** Add `ics_sequence integer NOT NULL DEFAULT 0` to `appointments`. Used as the SEQUENCE field on every emitted `.ics` and incremented on reschedule + cancel (so calendar clients honor updates per RFC 5545 §3.8.7.4).

**Steps:**

- [ ] **Step 1: Write the SQL migration**
  ```sql
  -- drizzle/migrations/0048_appointments_ics_sequence.sql
  ALTER TABLE appointments
    ADD COLUMN ics_sequence integer NOT NULL DEFAULT 0;
  ```

- [ ] **Step 2: Add the column to the Drizzle schema**
  Find the `appointments` table in `src/lib/db/schema.ts` and add:
  ```ts
  icsSequence: integer('ics_sequence').notNull().default(0),
  ```
  Place it near `googleEventId` / `cancelTokenHash` for grouping.

- [ ] **Step 3: tsc + lint clean**
  `npx tsc --noEmit` → no output.

- [ ] **Step 4: Apply migration locally**
  `npm run db:migrate` (or whatever the project's migrate script is — check `package.json`).

- [ ] **Step 5: Commit**
  ```bash
  git add drizzle/migrations/0048_appointments_ics_sequence.sql src/lib/db/schema.ts drizzle/migrations/meta
  git commit -m "chore(db): migration 0048 — appointments.ics_sequence"
  ```

---

### Task 3: Plumb attachments through email pipeline

**Files:**
- Modify: `src/lib/services/email-smtp.service.ts`
- Modify: `src/lib/services/task-queue.service.ts`

**Goal:** Currently `EmailService.send()`'s env-fallback path passes `attachments` to nodemailer (line ~238), but the **DB-account path** (`EmailSmtpService.send`) drops them silently. Plus the `task-queue` `email` handler doesn't forward `attachments` from payload to `EmailService.sendWithTemplate`. Both gaps must be closed before `.ics` attachments work.

**Steps:**

- [ ] **Step 1: Extend `EmailSmtpService.send` signature**
  In `src/lib/services/email-smtp.service.ts`, find the existing input interface for `send()` and add:
  ```ts
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
  ```
  Then pass them through to `mailOptions`:
  ```ts
  if (input.attachments && input.attachments.length > 0) {
    mailOptions.attachments = input.attachments
  }
  ```
  (Place before the `transport.sendMail(mailOptions)` call.)

- [ ] **Step 2: Forward attachments from `EmailService.send` (DB-account path) to `EmailSmtpService.send`**
  In `src/lib/services/email.service.ts` around line 186, the call to `EmailSmtpService.send({...})` currently passes `to/cc/subject/bodyHtml/bodyText` only. Add `attachments: input.attachments` to that call.

- [ ] **Step 3: Forward attachments from task-queue payload to EmailService**
  In `src/lib/services/task-queue.service.ts` `case 'email':` block (around line 268), the `sendWithTemplate` call passes `{cc, leadId, companyId, personId}`. Add:
  ```ts
  attachments: payload.attachments as SendEmailInput['attachments'] | undefined,
  ```
  Same for the direct `EmailService.send` branch right below.

  Note: The payload comes from `taskQueue.payload` (jsonb). Buffer doesn't survive JSON serialization — `.ics` is plain text, so we'll pass it as `{ filename, content: <ics-string>, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }`. Nodemailer accepts `string` content directly.

- [ ] **Step 4: Tests**
  Create `src/__tests__/unit/services/appointment-mail.ics.test.ts` (skeleton — fully fleshed out in Task 4):
  ```ts
  // placeholder — Task 4 will cover this
  describe('attachments forwarding', () => {
    it.todo('TaskQueue email handler forwards payload.attachments to EmailService')
  })
  ```

- [ ] **Step 5: tsc clean**
  `npx tsc --noEmit`.

- [ ] **Step 6: Commit**
  ```bash
  git add src/lib/services/email-smtp.service.ts src/lib/services/email.service.ts src/lib/services/task-queue.service.ts
  git commit -m "fix(email): plumb attachments through DB-account SMTP + task-queue handler"
  ```

---

### Task 4: `AppointmentMailService` attaches `.ics` on confirmation, reschedule, cancellation

**Files:**
- Modify: `src/lib/services/appointment-mail.service.ts`
- Modify: `src/lib/services/appointment.service.ts` (increment `icsSequence` on reschedule + cancel)
- Create: `src/__tests__/unit/services/appointment-mail.ics.test.ts` (real test, replaces skeleton)

**Goal:** Each of `queueConfirmation`, `queueReschedule`, `queueCancellation` builds the `.ics` and includes it as `payload.attachments` on the `task_queue` row going to the customer (NOT staff — staff already has the calendar event in Google).

**Steps:**

- [ ] **Step 1: Increment `icsSequence` in `_applyRescheduleMutation` and `_applyCancelMutation`**
  In `src/lib/services/appointment.service.ts`:
  - In `_applyRescheduleMutation` (around line 130), within the existing `db.update(appointments).set({...})` call, add `icsSequence: sql\`${appointments.icsSequence} + 1\``.
  - In `_applyCancelMutation` (around line 84), same: add `icsSequence: sql\`${appointments.icsSequence} + 1\`` inside the existing update.

  Import `sql` from `drizzle-orm` if not already.

- [ ] **Step 2: Build helper in `appointment-mail.service.ts` to produce the `.ics` payload entry**

  Add at the top of the file (after `loadContext`):
  ```ts
  import { buildIcs } from './appointment-ics.util'
  import type { IcsArgs } from './appointment-ics.util'

  function buildIcsAttachment(args: {
    appointmentId: string
    sequence: number
    method: 'REQUEST' | 'CANCEL'
    startUtc: Date
    endUtc: Date
    summary: string
    description: string
    location: string
    organizerEmail: string
    organizerName: string
    attendeeEmail: string
    attendeeName: string
  }): { filename: string; content: string; contentType: string } {
    const ics = buildIcs({
      uid: args.appointmentId,
      sequence: args.sequence,
      method: args.method,
      startUtc: args.startUtc,
      endUtc: args.endUtc,
      summary: args.summary,
      description: args.description,
      location: args.location,
      organizerEmail: args.organizerEmail,
      organizerName: args.organizerName,
      attendeeEmail: args.attendeeEmail,
      attendeeName: args.attendeeName,
    })
    return {
      filename: 'termin.ics',
      content: ics,
      contentType: `text/calendar; charset=utf-8; method=${args.method}`,
    }
  }
  ```

- [ ] **Step 3: Update `queueConfirmation` to attach REQUEST**
  In the existing `queueConfirmation`, the customer-mail-row insert currently looks like:
  ```ts
  payload: {
    templateSlug: 'appointment.customer.confirmation',
    to: appt.customerEmail,
    placeholders: buildPlaceholders(ctx),
    leadId: appt.leadId,
    personId: appt.personId,
  },
  ```
  Extend with `attachments: [buildIcsAttachment({...})]`. Compute `icsSequence` from `appt.icsSequence` (load it in the existing `db.select` if not already returning all columns).

- [ ] **Step 4: Update `queueReschedule` similarly — METHOD:REQUEST with bumped sequence**
  (loadContext already re-fetches `appt`, which by now has the incremented `icsSequence`).

- [ ] **Step 5: Update `queueCancellation` — METHOD:CANCEL**

- [ ] **Step 6: Write tests in `appointment-mail.ics.test.ts`**
  Use the same vitest scaffolding as existing `appointment-mail.service.test.ts`. Mock DB; assert that the inserted `task_queue` row's `payload.attachments[0]` has:
  - `filename === 'termin.ics'`
  - `contentType` includes `method=REQUEST` (or `=CANCEL` for the cancel test)
  - `content` is a string starting with `BEGIN:VCALENDAR` and containing `UID:<id>@xkmu.de`

  Three test cases:
  1. `queueConfirmation` attaches `.ics` (METHOD:REQUEST, SEQUENCE:0) on the customer row
  2. `queueReschedule` attaches `.ics` with bumped SEQUENCE
  3. `queueCancellation` attaches `.ics` with METHOD:CANCEL

  Verify the **staff row** does NOT carry the attachment (staff gets the calendar event via Google directly).

- [ ] **Step 7: Run all appointment + ics tests**
  `npx vitest run src/__tests__/unit/services/appointment` → all green.

- [ ] **Step 8: Commit**
  ```bash
  git add src/lib/services/appointment-mail.service.ts src/lib/services/appointment.service.ts src/__tests__/unit/services/appointment-mail.ics.test.ts
  git commit -m "feat(termine): attach .ics (RFC 5545) to confirmation/reschedule/cancel mails"
  ```

---

## Phase B — Audit-Log

### Task 5: Audit-Log entries on appointment mutations (route layer)

**Files:**
- Modify: `src/app/api/buchen/[slug]/book/route.ts`
- Modify: `src/app/api/buchen/cancel/route.ts`
- Modify: `src/app/api/buchen/reschedule/route.ts`
- Modify: `src/app/api/portal/termin/book/route.ts`
- Modify: `src/app/api/portal/termin/[id]/cancel/route.ts`
- Modify: `src/app/api/portal/termin/[id]/reschedule/route.ts`
- Modify: `src/app/api/v1/appointments/route.ts`

**Goal:** After every successful mutation, write one `audit_logs` row. Routes are the right layer because they have `NextRequest` (for IP/UA) and the active session/role.

**Audit-log shape:**

| Action                    | userId            | userRole       | entityType    | entityId   | payload (selected fields)                                  |
|---------------------------|-------------------|----------------|---------------|------------|-------------------------------------------------------------|
| `appointment.create`      | session?.user.id  | inferred       | `appointment` | appt.id    | `source` (public/portal/manual), `slotTypeId`, `startAt`, `customerEmail` |
| `appointment.cancel`      | session?.user.id  | customer/portal_user/staff | `appointment` | appt.id | `cancelledBy`, `reason` (truncated 200 chars)         |
| `appointment.reschedule`  | session?.user.id  | customer/portal_user/staff | `appointment` | appt.id | `oldStartAt`, `newStartAt`                              |

`userRole` mapping:
- Public token-based cancel/reschedule → `'customer'`, `userId: null`
- Portal cancel/reschedule → `'portal_user'`, `userId: portalSession.userId`
- Internal/manual → `'staff'`, `userId: session.user.id`
- Public booking via `/buchen/<slug>/book` → `'customer'`, `userId: null`
- Portal booking → `'portal_user'`
- Manual via `/api/v1/appointments` → `'staff'`

**fail-safe vs propagate:** Per the audit-logging memory ("niemals silent writes"), if audit-log write fails, the action MUST fail too. We've already done the booking/cancellation; rolling that back atomically is hard, so the pragmatic compromise is:
- Wrap the audit-log call in try/catch.
- On error: `console.error(...)` AND respond 500 to the caller (so the operator notices). Do NOT silently 200.

For now (V1): log the error and respond 500 if audit-log fails, but the DB mutation is already committed. This is consistent with the project memory's "fail-safe" guidance — operator is alerted, even though the underlying mutation isn't reversed. Note in a code comment.

**Steps:**

- [ ] **Step 1: Public booking — `src/app/api/buchen/[slug]/book/route.ts`**
  After the successful `apiSuccess(...)` path (where `appt.id` is known), call:
  ```ts
  await AuditLogService.log({
    userId: null,
    userRole: 'customer',
    action: 'appointment.create',
    entityType: 'appointment',
    entityId: appt.id,
    payload: {
      source: 'public',
      slotTypeId: parsed.data.slotTypeId,
      startAt: appt.startAt.toISOString(),
      customerEmail: parsed.data.customerEmail,
    },
    request,
  })
  ```
  Wrap in try/catch — on failure, return 500 `audit_log_failed` and `console.error` the underlying error.

- [ ] **Step 2: Manual booking — `src/app/api/v1/appointments/route.ts`**
  Same pattern but `userRole: 'staff'`, `userId: auth.userId`, `source: 'manual'`.

- [ ] **Step 3: Portal booking — `src/app/api/portal/termin/book/route.ts`**
  `userRole: 'portal_user'`, `userId: portalSession.userId`, `source: 'portal'`.

- [ ] **Step 4: Public cancel — `src/app/api/buchen/cancel/route.ts`**
  Action `'appointment.cancel'`, `userRole: 'customer'`, `userId: null`. Payload: `{ cancelledBy: 'customer', reason: parsed.data.reason?.slice(0, 200) }`.

- [ ] **Step 5: Portal cancel — `src/app/api/portal/termin/[id]/cancel/route.ts`**
  Action `'appointment.cancel'`, `userRole: 'portal_user'`, `userId: portalSession.userId`. Payload: `{ cancelledBy: 'portal' }`.

- [ ] **Step 6: Public reschedule — `src/app/api/buchen/reschedule/route.ts`**
  Action `'appointment.reschedule'`, `userRole: 'customer'`, `userId: null`. Payload: `{ oldStartAt: oldStart.toISOString(), newStartAt: newStart.toISOString() }`.

- [ ] **Step 7: Portal reschedule — `src/app/api/portal/termin/[id]/reschedule/route.ts`**
  Same action; `userRole: 'portal_user'`.

- [ ] **Step 8: Manual cancel/reschedule** — currently no internal API for staff cancel/reschedule (Phase 7 didn't add any). **Skip for V1.** Note in plan self-review.

- [ ] **Step 9: Tests**
  Create `src/__tests__/integration/api/appointment-audit-log.test.ts`:
  - 1 case for public booking → asserts `auditLogs` row inserted with `action='appointment.create'`, `userRole='customer'`, `entityId=<appt.id>`.
  - 1 case for manual booking → asserts row with `userRole='staff'`, `userId=<session.user.id>`.
  - 1 case for public cancel via token → asserts row with `action='appointment.cancel'`, `userRole='customer'`.

  Mock `AuditLogService.log` and assert call args (don't actually hit DB for the audit table).

- [ ] **Step 10: tsc + tests green**
  `npx tsc --noEmit && npx vitest run src/__tests__/integration/api/appointment-audit-log.test.ts`.

- [ ] **Step 11: Commit**
  ```bash
  git add src/app/api/buchen src/app/api/portal/termin src/app/api/v1/appointments src/__tests__/integration/api/appointment-audit-log.test.ts
  git commit -m "feat(termine): audit-log entries for create/cancel/reschedule"
  ```

---

## Phase C — Add-to-Calendar

### Task 6: GET `/api/v1/appointments/[id]/ics` download endpoint

**Files:**
- Create: `src/app/api/v1/appointments/[id]/ics/route.ts`
- Create: `src/__tests__/integration/api/appointment-ics-download.test.ts`

**Goal:** Customer (or staff) can download the `.ics` for a specific appointment by UUID. UUID is the only auth — same trust model as the bestaetigt page itself, which loads the appt by UUID without auth.

**Implementation:**

```ts
// src/app/api/v1/appointments/[id]/ics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, slotTypes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildIcs } from '@/lib/services/appointment-ics.util'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const [row] = await db
    .select({
      apptId: appointments.id,
      icsSequence: appointments.icsSequence,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      customerPhone: appointments.customerPhone,
      customerMessage: appointments.customerMessage,
      slotTypeName: slotTypes.name,
      slotTypeLocation: slotTypes.location,
      slotTypeLocationDetails: slotTypes.locationDetails,
      organizerEmail: users.email,
      organizerFirst: users.firstName,
      organizerLast: users.lastName,
    })
    .from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .innerJoin(users, eq(appointments.userId, users.id))
    .where(eq(appointments.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const ics = buildIcs({
    uid: row.apptId,
    sequence: row.icsSequence,
    method: row.status === 'cancelled' ? 'CANCEL' : 'REQUEST',
    startUtc: row.startAt,
    endUtc: row.endAt,
    summary: row.slotTypeName,
    description: [
      `Telefon: ${row.customerPhone}`,
      row.customerMessage ? `\nNachricht:\n${row.customerMessage}` : '',
    ].filter(Boolean).join('\n'),
    location: row.slotTypeLocationDetails || row.slotTypeLocation,
    organizerEmail: row.organizerEmail || 'noreply@xkmu.de',
    organizerName: `${row.organizerFirst ?? ''} ${row.organizerLast ?? ''}`.trim() || 'xKMU',
    attendeeEmail: row.customerEmail,
    attendeeName: row.customerName,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="termin.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
```

**Steps:**

- [ ] **Step 1: Write failing tests**
  Create `src/__tests__/integration/api/appointment-ics-download.test.ts`:
  ```ts
  // 4 cases:
  // - happy: 200, Content-Type 'text/calendar', body contains 'BEGIN:VCALENDAR' + UID
  // - 404 unknown id
  // - 400 malformed id (non-UUID)
  // - cancelled appt → METHOD:CANCEL
  ```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement the route as above**

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: tsc clean**

- [ ] **Step 6: Commit**
  ```bash
  git add src/app/api/v1/appointments/\[id\]/ics/route.ts src/__tests__/integration/api/appointment-ics-download.test.ts
  git commit -m "feat(termine): GET /api/v1/appointments/[id]/ics — download endpoint"
  ```

---

### Task 7: Bestätigungsseite — Download-Button + Google-Quicklink

**Files:**
- Modify: `src/app/(public)/buchen/[slug]/bestaetigt/page.tsx`

**Goal:** Below the existing summary card, show two buttons:
- **Termin als `.ics` herunterladen** → links to `/api/v1/appointments/<id>/ics`
- **Zu Google Kalender hinzufügen** → opens `https://calendar.google.com/calendar/render?action=TEMPLATE&...` in new tab

**Google-Quicklink builder (inline at bottom of page.tsx, no new util file):**

```ts
function buildGoogleCalendarUrl(args: {
  title: string
  startUtc: Date
  endUtc: Date
  details: string
  location: string
}): string {
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: args.title,
    dates: `${fmt(args.startUtc)}/${fmt(args.endUtc)}`,
    details: args.details,
    location: args.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
```

**Steps:**

- [ ] **Step 1: Add the buttons to the page (server-rendered links)**

  Below the existing `<div className="mt-6 rounded-md bg-muted/40 ...">` block, add:
  ```tsx
  <div className="mt-6 flex flex-wrap gap-2">
    <a
      href={`/api/v1/appointments/${appt.id}/ics`}
      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
    >
      <Download className="h-4 w-4" />
      Termin als .ics herunterladen
    </a>
    <a
      href={buildGoogleCalendarUrl({
        title: slotType.name,
        startUtc: appt.startAt,
        endUtc: appt.endAt,
        details: appt.customerMessage ?? '',
        location: slotType.locationDetails || slotType.location,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
    >
      <Calendar className="h-4 w-4" />
      Zu Google Kalender hinzufügen
    </a>
  </div>
  ```

  Add imports: `Download`, `Calendar` from `lucide-react`. Add `buildGoogleCalendarUrl` helper at bottom.

- [ ] **Step 2: tsc + lint clean**

- [ ] **Step 3: Manual smoketest (visual only — no automated test for static page)**
  Open `/buchen/<slug>/bestaetigt?id=<appt-id>` in browser, click both buttons:
  - `.ics` should download
  - Google Calendar should open pre-filled

- [ ] **Step 4: Commit**
  ```bash
  git add 'src/app/(public)/buchen/[slug]/bestaetigt/page.tsx'
  git commit -m "feat(termine): bestaetigt page — .ics download + Google-Calendar quicklink"
  ```

---

## Phase D — Verification + Push

### Task 8: Vollständiger Test-Lauf

- [ ] **Step 1: tsc**
  `npx tsc --noEmit` → clean.

- [ ] **Step 2: Lint**
  `npm run lint` → no new findings on Phase-8 files.

- [ ] **Step 3: Vitest**
  `npx vitest run` → all green; specifically:
  - `appointment-ics.util.test.ts` → 4/4
  - `appointment-mail.ics.test.ts` → 3/3
  - `appointment-ics-download.test.ts` → 4/4
  - `appointment-audit-log.test.ts` → 3/3
  - All previous Phase 1–7 tests still green (no regressions).

- [ ] **Step 4: Manual smoketest checklist** (operator does this — list it for the user)
  1. Make a public booking → Bestätigungsmail enthält `termin.ics`-Anhang. Open in Apple Calendar / Outlook / Thunderbird → event imports cleanly with correct UTC time.
  2. `/buchen/<slug>/bestaetigt`-Seite zeigt beide Buttons; Download liefert valide `.ics`; Google-Quicklink öffnet vorbefülltes Event.
  3. Reschedule via Token → neue Mail enthält `.ics` mit höherem `SEQUENCE`. Calendar update is honored on import.
  4. Storno via Token → Storno-Mail enthält `.ics` mit `METHOD:CANCEL` + `STATUS:CANCELLED`. Calendar removes the event on import.
  5. DB: `SELECT action, user_role, entity_id, payload FROM audit_logs WHERE entity_type='appointment' ORDER BY created_at DESC LIMIT 5;` — drei Einträge sichtbar (create, reschedule, cancel) mit korrekten Rollen.
  6. Manuelle Backend-Buchung → audit_logs-Eintrag mit `user_role='staff'`, `user_id=<session-user>`.
  7. Portal-Buchung (eingeloggt) → audit_logs mit `user_role='portal_user'`.

### Task 9: Push

- [ ] Commit Versionsbump (passend zur xKMU-Konvention `chore: bump version to 1.5.X [skip ci]`).
- [ ] `git push origin main`.

---

## Self-Review

**Spec-Coverage Phase 8 (§6.4 + §8 + §9.3 #8):**
- ✅ `.ics`-Anhang auf Confirmation-Mail → Task 4
- ✅ Reschedule mit erhöhter SEQUENCE → Task 4 (icsSequence-Inkrement)
- ✅ Storno mit METHOD:CANCEL → Task 4
- ✅ `.ics`-Download auf Bestätigungsseite → Task 6 + 7
- ✅ Google-Calendar-Quicklink → Task 7
- ✅ Audit-Log-Eintrag pro Buchung/Storno/Umbuchung → Task 5

**Bewusst nicht:**
- Outlook/Office365-Quicklink → Backlog. Nur Google in V1, weil Spec nur Google nennt.
- Add-to-Calendar im Portal „Meine Termine" → Backlog.
- `.ics` für Reminder-Mails → bewusst nicht; Reminder ist nur Erinnerung.
- Atomische Transaktion zwischen DB-Mutation und Audit-Log → V1 lässt die Mutation drinnen, wenn audit-log-write danach fehlschlägt (operator wird via 500-Response benachrichtigt). Bei tightening später: TRANSACTION wrappen.
- Audit-Log für interne Status-Change-Aktionen (z.B. "vom Mitarbeiter manuell auf Erledigt setzen") — gibt's noch keine Route dafür; falls in Phase 9 ergänzt, dort gleich Audit-Log mitnehmen.

**Risk-Areas:**
- **`.ics`-Charset/Locale:** Wir senden UTF-8, Outlook 2010 frisst das, aber in seltenen Fällen kann ein Mail-Server `Content-Transfer-Encoding` umkodieren. Wenn Probleme: später Base64-encoded multipart attachment statt rohem String.
- **`SEQUENCE`-Drift:** Falls jemand zwischen `_applyCancelMutation` und `_applyRescheduleMutation` parallel beide auslöst, könnte SEQUENCE doppelt-inkrementiert werden. RFC erlaubt das (höher ist besser). Akzeptiert.
- **Audit-Log fail-but-mutation-committed:** Operator-Alert via 500. Akzeptiert für V1.
- **Public `.ics`-Download trust model:** UUID-guarded, kein Enumeration-Risiko, aber ein Leak des Links gibt Lesezugriff auf die Termin-Daten (Name, Telefon, Slot-Typ). Akzeptiert — selbes Niveau wie die `bestaetigt`-Seite, der Link wird sowieso per Mail an Customer + Staff geschickt.

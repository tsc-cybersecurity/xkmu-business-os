# Terminbuchung Phase 5 — Reminder + Storno + Umbuchung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1: Schema-Grundlage, Google-OAuth, Connect-UI
> - ✅ Phase 2: Slot-Typen + Wochenraster + Backend-Kalender
> - ✅ Phase 3: Push-Webhook + external_busy + Sync-Cron
> - ✅ Phase 4: Öffentliche Buchung + availability/book-API + Confirmation-Mail
> - **Phase 5 (diese Datei):** Reminder (24h + 1h) + Storno + Umbuchung
> - Phase 6: Portal-Variante (eingeloggte Buchung)
> - Phase 7: Manuelle Backend-Buchung
> - Phase 8: Polish (`.ics`, Audit-Log, Add-to-Calendar)

**Goal:** Kunden können gebuchte Termine über signierte Links in der Bestätigungsmail stornieren oder umbuchen, ohne sich einzuloggen. Vor dem Termin erhalten sie automatische Reminder (24h und 1h vorher). Storno und Umbuchung halten Google-Calendar, Mail-Queue und DB konsistent.

**Architecture:**
- **Token-Layer**: HMAC-signierte URL-Safe-Tokens (`<base64url(payload)>.<base64url(sig)>`), Klartext nur in Mail, sha256-Hash in DB. Generation + Verification in `src/lib/utils/appointment-token.util.ts`.
- **Reminder-Layer**: Eigener Task-Type `appointment_reminder` mit `referenceType='appointment'`. Handler prüft `appointments.status` vor Versand → cancelled → skip + mark task cancelled. Idempotent.
- **Cancel-Flow**: Public Page `/buchen/cancel?token=…` → POST `/api/buchen/cancel` → `AppointmentService.cancel()` (Token-Verify, status='cancelled', Hashes null, Reminders cancelln, Mails queuen, Google-Event löschen).
- **Reschedule-Flow**: Public Page `/buchen/reschedule?token=…` mit volldetailliertem Wizard (gleiche Verfügbarkeits-Logik wie Booking) → POST `/api/buchen/reschedule` → `AppointmentService.reschedule()` (Token-Verify, neuen Slot live-prüfen, DB updaten, neue Tokens generieren, alte Reminder löschen, neue queuen, Google patch, Mails).
- **Confirmation-Mail-Update**: Tokens werden bei `book()` generiert, Klartext-URLs als Placeholder `{{links.cancel_url}}` und `{{links.reschedule_url}}` an Confirmation-Mail übergeben. Bestehendes Confirmation-Template wird angepasst (Migration), Defaults in `appointment-mail.defaults.ts`.

**Tech Stack:** Drizzle ORM (PostgreSQL), Next.js App Router, Zod, Vitest. Keine neuen NPM-Dependencies.

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §6 (E-Mail-Flow & Storno-Tokens), §9.3 #5.

**Codebase-Patterns (wie Phase 4):**
- Service: `export const FooService = { async method() { ... } }`
- API: kein Auth + Zod-`safeParse` + Rate-Limit-Util für öffentliche Routen, `withPermission(...)` falls je intern benötigt
- Tests: `setupDbMock()` + `vi.resetModules()` + `vi.doMock` für Services; `createTestClient()` für API-Routen
- Mail-Templates: System-Defaults idempotent geseedet, User editiert via bestehender Template-UI

**Konstanten / ENV:**
- `APPOINTMENT_TOKEN_SECRET` (32+ bytes hex, neu) — Boot-Validierung in `src/lib/env.ts`
- `APP_PUBLIC_URL` (existiert ggf. als `NEXT_PUBLIC_SITE_URL` aus Phase 4-Bugfix; wird wiederverwendet)

**Bewusst NICHT in Phase 5:**
- `.ics`-Anhang, Add-to-Calendar-Quicklink → Phase 8
- Audit-Log-Einträge für Buchung/Storno/Reschedule → Phase 8
- Race-Guard mit echter DB-Transaktion (FOR UPDATE etc.) → Phase 5 nutzt weiterhin den Phase-4-Pattern (Live-FreeBusy + Optimismus)
- Custom-Cancel-Reasons via Form (V1: optional Plain-Textfeld, persistiert in `cancellation_reason`)

**File Structure:**

```
src/
  lib/
    utils/
      appointment-token.util.ts            # NEW — sign/verify/hash
    services/
      appointment-mail.defaults.ts         # NEW — Defaults für 8 Templates
      appointment-mail.service.ts          # MOD — queueReminders, queueCancellation, queueRescheduled, cancelPendingReminders, queueConfirmation um Links
      appointment.service.ts               # MOD — book() generiert Tokens + queueReminders; +cancel(); +reschedule()
      task-queue.service.ts                # MOD — neuer Handler 'appointment_reminder'
  app/
    api/
      buchen/
        cancel/route.ts                    # NEW — POST {token}
        reschedule/
          availability/route.ts            # NEW — GET ?token=&date=
          route.ts                         # NEW — POST {token, startAtUtc}
    (public)/
      buchen/
        cancel/page.tsx                    # NEW — token verify + confirm
        cancel/_components/CancelConfirm.tsx
        reschedule/page.tsx                # NEW — token verify + wizard
        reschedule/_components/RescheduleWizard.tsx
drizzle/
  migrations/
    0046_appointment_email_templates_phase5.sql  # NEW — Seed 6 Templates + UPDATE confirmation/staff für Links
  __tests__/
    unit/
      utils/appointment-token.util.test.ts
      services/appointment-mail-phase5.test.ts
      services/appointment.service.cancel.test.ts
      services/appointment.service.reschedule.test.ts
    integration/
      api/buchen-cancel.test.ts
      api/buchen-reschedule.test.ts
```

---

## Phase A — Token-Layer

### Task 1: Token-Utility

**Files:**
- Create: `src/lib/utils/appointment-token.util.ts`
- Create: `src/__tests__/unit/utils/appointment-token.util.test.ts`

**Spec:** §6.3

- [ ] **Step 1: Test schreiben (TDD)**

```ts
// src/__tests__/unit/utils/appointment-token.util.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const ORIG_ENV = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIG_ENV, APPOINTMENT_TOKEN_SECRET: 'a'.repeat(64) }
})

describe('appointment-token.util', () => {
  it('round-trips a valid token (generate → verify)', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const expiresAt = new Date(Date.now() + 60_000)
    const { token, hash } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt,
    })
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(hash).toHaveLength(64)
    const verified = mod.verifyAppointmentToken(token)
    expect(verified.ok).toBe(true)
    if (verified.ok) {
      expect(verified.payload.a).toBe('apt-1')
      expect(verified.payload.p).toBe('cancel')
    }
  })

  it('rejects modified payload (signature mismatch)', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const { token } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60_000),
    })
    const [, sig] = token.split('.')
    const tampered = mod.encodeBase64Url(JSON.stringify({ a: 'apt-2', p: 'cancel', e: Date.now() + 60_000, n: 'x' })) + '.' + sig
    const result = mod.verifyAppointmentToken(tampered)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('bad_signature')
  })

  it('rejects expired tokens', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const { token } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() - 1000),
    })
    const result = mod.verifyAppointmentToken(token)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('expired')
  })

  it('hashOf is deterministic and uses sha256', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const a = mod.hashOf('hello')
    const b = mod.hashOf('hello')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('different purposes yield different signatures for same appointment', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const exp = new Date(Date.now() + 60_000)
    const a = mod.generateAppointmentToken({ appointmentId: 'apt-1', purpose: 'cancel', expiresAt: exp })
    const b = mod.generateAppointmentToken({ appointmentId: 'apt-1', purpose: 'reschedule', expiresAt: exp })
    expect(a.token).not.toBe(b.token)
  })
})
```

- [ ] **Step 2: Tests laufen lassen → fail erwartet (Modul existiert nicht)**

Run: `npx vitest run src/__tests__/unit/utils/appointment-token.util.test.ts`
Expected: FAIL — Cannot find module

- [ ] **Step 3: Implementierung schreiben**

```ts
// src/lib/utils/appointment-token.util.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type TokenPurpose = 'cancel' | 'reschedule'

export interface TokenPayload {
  a: string  // appointmentId
  p: TokenPurpose
  e: number  // expiresEpoch (ms)
  n: string  // nonce
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

function getSecret(): Buffer {
  const secret = process.env.APPOINTMENT_TOKEN_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('APPOINTMENT_TOKEN_SECRET is not set or too short (need ≥32 chars)')
  }
  return Buffer.from(secret, 'utf8')
}

export function encodeBase64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

export function hashOf(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateAppointmentToken(args: {
  appointmentId: string
  purpose: TokenPurpose
  expiresAt: Date
}): { token: string; hash: string } {
  const payload: TokenPayload = {
    a: args.appointmentId,
    p: args.purpose,
    e: args.expiresAt.getTime(),
    n: randomBytes(8).toString('hex'),
  }
  const payloadStr = JSON.stringify(payload)
  const payloadEnc = encodeBase64Url(payloadStr)
  const sig = createHmac('sha256', getSecret()).update(payloadEnc).digest()
  const sigEnc = encodeBase64Url(sig)
  const token = `${payloadEnc}.${sigEnc}`
  return { token, hash: hashOf(token) }
}

export function verifyAppointmentToken(token: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [payloadEnc, sigEnc] = parts
  let payload: TokenPayload
  try {
    payload = JSON.parse(decodeBase64Url(payloadEnc).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (typeof payload?.a !== 'string' || typeof payload?.e !== 'number' || typeof payload?.n !== 'string'
      || (payload.p !== 'cancel' && payload.p !== 'reschedule')) {
    return { ok: false, reason: 'malformed' }
  }
  const expectedSig = createHmac('sha256', getSecret()).update(payloadEnc).digest()
  let providedSig: Buffer
  try {
    providedSig = decodeBase64Url(sigEnc)
  } catch {
    return { ok: false, reason: 'bad_signature' }
  }
  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: 'bad_signature' }
  }
  if (payload.e <= Date.now()) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}
```

- [ ] **Step 4: Tests grün**

Run: `npx vitest run src/__tests__/unit/utils/appointment-token.util.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/appointment-token.util.ts src/__tests__/unit/utils/appointment-token.util.test.ts
git commit -m "feat(termine): HMAC-signed cancel/reschedule appointment tokens"
```

---

## Phase B — Mail-Defaults + Templates

### Task 2: Defaults-Datei

**Files:**
- Create: `src/lib/services/appointment-mail.defaults.ts`

**Inhalt:** 8 Template-Defaults (2 bestehende werden hier zentral abgelegt für die Seed-Migration; 6 neue dazu).

- [ ] **Step 1: Datei schreiben**

```ts
// src/lib/services/appointment-mail.defaults.ts
//
// System-Default-Texte für alle appointment.* Email-Templates.
// Diese werden idempotent in `email_templates` geseedet. User kann sie
// danach via /intern/inbox/templates editieren.

export interface AppointmentTemplateDefault {
  slug: string
  subject: string
  bodyHtml: string
  variables: { key: string; label: string }[]
}

const SHARED_VARIABLES = [
  { key: 'customer.name', label: 'Kunde Name' },
  { key: 'customer.email', label: 'Kunde E-Mail' },
  { key: 'customer.phone', label: 'Kunde Telefon' },
  { key: 'slot.type_name', label: 'Termin-Art' },
  { key: 'slot.duration_minutes', label: 'Dauer (min)' },
  { key: 'slot.location', label: 'Ort/Form' },
  { key: 'slot.location_details', label: 'Ort-Details' },
  { key: 'appointment.start_local', label: 'Start (lokal)' },
  { key: 'appointment.end_local', label: 'Ende (lokal)' },
  { key: 'appointment.timezone', label: 'Zeitzone' },
  { key: 'appointment.message', label: 'Kunde Nachricht' },
  { key: 'links.cancel_url', label: 'Storno-Link' },
  { key: 'links.reschedule_url', label: 'Umbuchungs-Link' },
  { key: 'org.name', label: 'Organisation' },
]

export const APPOINTMENT_TEMPLATES: AppointmentTemplateDefault[] = [
  {
    slug: 'appointment.customer.confirmation',
    subject: 'Ihre Terminbuchung am {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>vielen Dank für Ihre Buchung. Hier die Details:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} (Zeitzone: {{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den Termin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>, falls erforderlich.</p>
<p>Bis bald,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.notification',
    subject: 'Neuer Termin: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
    bodyHtml: `<p>Neue Buchung:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}}, {{customer.phone}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}}</li>
  <li><strong>Nachricht:</strong> {{appointment.message}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.reminder_24h',
    subject: 'Erinnerung: Termin morgen um {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>nur eine kurze Erinnerung an Ihren Termin morgen:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Falls Sie nicht teilnehmen können: <a href="{{links.cancel_url}}">stornieren</a> oder <a href="{{links.reschedule_url}}">umbuchen</a>.</p>
<p>Bis morgen,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.reminder_1h',
    subject: 'Ihr Termin in einer Stunde',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> beginnt in einer Stunde um {{appointment.start_local}}.</p>
<p>Ort/Form: {{slot.location}}{{slot.location_details}}</p>
<p>Bis gleich,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.cancelled',
    subject: 'Ihr Termin am {{appointment.start_local}} wurde storniert',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> am {{appointment.start_local}} wurde storniert.</p>
<p>Falls Sie einen neuen Termin möchten, buchen Sie gerne wieder über unsere Website.</p>
<p>Viele Grüße,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.rescheduled',
    subject: 'Ihr Termin wurde verschoben — neuer Termin: {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> wurde verschoben:</p>
<ul>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den neuen Termin weiterhin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>.</p>
<p>Viele Grüße,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.cancelled',
    subject: 'Termin storniert: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
    bodyHtml: `<p>Storniert:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Original-Datum:</strong> {{appointment.start_local}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.rescheduled',
    subject: 'Termin verschoben: {{slot.type_name}} mit {{customer.name}} → {{appointment.start_local}}',
    bodyHtml: `<p>Verschoben:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
]
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/appointment-mail.defaults.ts
git commit -m "feat(termine): default texts for all 8 appointment email templates"
```

### Task 3: Seed-Migration für 6 neue + UPDATE bestehende

**Files:**
- Create: `drizzle/migrations/0046_appointment_email_templates_phase5.sql`

**Wichtig:** Migration ist idempotent (`WHERE NOT EXISTS`) für Inserts und überschreibt bestehende `appointment.customer.confirmation` + `appointment.staff.notification` per `UPDATE` mit den neuen Texten (die jetzt `{{links.*}}` enthalten).

- [ ] **Step 1: Migration schreiben**

```sql
-- Phase 5: 6 neue appointment-Templates + Update der 2 bestehenden um Storno/Reschedule-Links

-- ---------- UPDATE: bestehende Templates um Links erweitern ----------

UPDATE email_templates
SET subject = 'Ihre Terminbuchung am {{appointment.start_local}}',
    body_html = '<p>Hallo {{customer.name}},</p>
<p>vielen Dank für Ihre Buchung. Hier die Details:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} (Zeitzone: {{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den Termin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>, falls erforderlich.</p>
<p>Bis bald,<br>{{org.name}}</p>',
    variables = '[
      {"key":"customer.name","label":"Kunde Name"},
      {"key":"slot.type_name","label":"Termin-Art"},
      {"key":"appointment.start_local","label":"Start (lokal)"},
      {"key":"appointment.timezone","label":"Zeitzone"},
      {"key":"slot.duration_minutes","label":"Dauer (min)"},
      {"key":"slot.location","label":"Ort/Form"},
      {"key":"slot.location_details","label":"Ort-Details"},
      {"key":"links.cancel_url","label":"Storno-Link"},
      {"key":"links.reschedule_url","label":"Umbuchungs-Link"},
      {"key":"org.name","label":"Organisation"}
    ]'::jsonb
WHERE slug = 'appointment.customer.confirmation';

-- ---------- INSERT: 6 neue Templates ----------

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.customer.reminder_24h', 'Termin-Erinnerung 24h vorher',
  'Erinnerung: Termin morgen um {{appointment.start_local}}',
  '<p>Hallo {{customer.name}},</p>
<p>nur eine kurze Erinnerung an Ihren Termin morgen:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
</ul>
<p>Falls Sie nicht teilnehmen können: <a href="{{links.cancel_url}}">stornieren</a> oder <a href="{{links.reschedule_url}}">umbuchen</a>.</p>
<p>Bis morgen,<br>{{org.name}}</p>',
  '[{"key":"customer.name"},{"key":"slot.type_name"},{"key":"appointment.start_local"},{"key":"appointment.timezone"},{"key":"links.cancel_url"},{"key":"links.reschedule_url"},{"key":"org.name"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.reminder_24h');

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.customer.reminder_1h', 'Termin-Erinnerung 1h vorher',
  'Ihr Termin in einer Stunde',
  '<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> beginnt in einer Stunde um {{appointment.start_local}}.</p>
<p>Bis gleich,<br>{{org.name}}</p>',
  '[{"key":"customer.name"},{"key":"slot.type_name"},{"key":"appointment.start_local"},{"key":"org.name"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.reminder_1h');

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.customer.cancelled', 'Termin-Stornierung Kunde',
  'Ihr Termin am {{appointment.start_local}} wurde storniert',
  '<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> am {{appointment.start_local}} wurde storniert.</p>
<p>Falls Sie einen neuen Termin möchten, buchen Sie gerne wieder über unsere Website.</p>
<p>Viele Grüße,<br>{{org.name}}</p>',
  '[{"key":"customer.name"},{"key":"slot.type_name"},{"key":"appointment.start_local"},{"key":"org.name"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.cancelled');

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.customer.rescheduled', 'Termin-Verschiebung Kunde',
  'Ihr Termin wurde verschoben — neuer Termin: {{appointment.start_local}}',
  '<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> wurde verschoben.</p>
<p>Neuer Termin: {{appointment.start_local}} ({{appointment.timezone}})</p>
<p>Sie können weiterhin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>.</p>
<p>Viele Grüße,<br>{{org.name}}</p>',
  '[{"key":"customer.name"},{"key":"slot.type_name"},{"key":"appointment.start_local"},{"key":"appointment.timezone"},{"key":"links.cancel_url"},{"key":"links.reschedule_url"},{"key":"org.name"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.rescheduled');

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.staff.cancelled', 'Termin-Stornierung Mitarbeiter',
  'Termin storniert: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
  '<p>Storniert:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Original-Datum:</strong> {{appointment.start_local}}</li>
</ul>',
  '[{"key":"customer.name"},{"key":"customer.email"},{"key":"slot.type_name"},{"key":"appointment.start_local"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.staff.cancelled');

INSERT INTO email_templates (slug, name, subject, body_html, variables, is_system)
SELECT 'appointment.staff.rescheduled', 'Termin-Verschiebung Mitarbeiter',
  'Termin verschoben: {{slot.type_name}} mit {{customer.name}} → {{appointment.start_local}}',
  '<p>Verschoben:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}}</li>
</ul>',
  '[{"key":"customer.name"},{"key":"customer.email"},{"key":"slot.type_name"},{"key":"appointment.start_local"}]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.staff.rescheduled');
```

- [ ] **Step 2: Migration anwenden (lokal/dev)**

Run: `npx drizzle-kit migrate`
Expected: 0046 migrated, no errors

- [ ] **Step 3: Verifikation**

Run (psql/PG-Tool):
```sql
SELECT slug FROM email_templates WHERE slug LIKE 'appointment.%' ORDER BY slug;
```
Expected: 8 rows.

- [ ] **Step 4: Commit**

```bash
git add drizzle/migrations/0046_appointment_email_templates_phase5.sql
git commit -m "feat(termine): seed reminder/cancel/reschedule email templates"
```

---

## Phase C — Confirmation-Mail um Links erweitern + Tokens beim Buchen

### Task 4: Tokens beim Buchen generieren + Bestätigungsmail mit Links

**Files:**
- Modify: `src/lib/services/appointment-mail.service.ts`
- Modify: `src/lib/services/appointment.service.ts`
- Create/Modify: `src/__tests__/unit/services/appointment-mail-phase5.test.ts`

- [ ] **Step 1: Test (TDD) — `queueConfirmation` rendert `links.cancel_url` + `links.reschedule_url`**

```ts
// src/__tests__/unit/services/appointment-mail-phase5.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/db-mock'

beforeEach(() => {
  vi.resetModules()
  process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.xkmu.de'
})

describe('AppointmentMailService.queueConfirmation (phase 5 links)', () => {
  it('passes both cancel_url and reschedule_url placeholders', async () => {
    const inserts: any[] = []
    setupDbMock({
      select: () => ({
        // appointments → slotTypes → users (3 chained selects from the source)
        // Mock minimal data
      }),
      insert: (table: any) => ({
        values: (v: any) => { inserts.push(v); return { returning: async () => [{ id: 'task-1' }] } },
      }),
    })
    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    // Stub queries to return one appt + slot + user
    vi.doMock('@/lib/db', () => ({ db: { /* set in setupDbMock */ } }))

    // Act: queueConfirmation
    await AppointmentMailService.queueConfirmation('apt-test')

    // Assert: customer mail payload contains both URL placeholders, both non-empty
    const customerInsert = inserts.find(i => i.payload?.templateSlug === 'appointment.customer.confirmation')
    expect(customerInsert).toBeDefined()
    const ph = customerInsert.payload.placeholders as Record<string, string>
    expect(ph['links.cancel_url']).toMatch(/\/buchen\/cancel\?token=/)
    expect(ph['links.reschedule_url']).toMatch(/\/buchen\/reschedule\?token=/)
  })
})
```
*(Bei Bedarf das DB-Mock-Setup an existierende Helper anpassen; siehe `src/__tests__/unit/services/appointment-mail.service.test.ts` als Vorlage.)*

- [ ] **Step 2: Implementierung — Tokens lazy generieren in `queueConfirmation`**

In `appointment-mail.service.ts` neue Helper-Funktion + bei jedem Aufruf der placeholder-Map: Tokens generieren (cancel + reschedule), Hashes auf Appointment persistieren wenn noch null, Klartext-URLs in Placeholders einsetzen.

```ts
// In appointment-mail.service.ts, oben Imports erweitern:
import { generateAppointmentToken } from '@/lib/utils/appointment-token.util'
import { eq } from 'drizzle-orm'

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.xkmu.de'

async function ensureTokensAndUrls(appt: { id: string; startAt: Date; cancelTokenHash: string | null; rescheduleTokenHash: string | null }): Promise<{ cancelUrl: string; rescheduleUrl: string }> {
  const cancel = generateAppointmentToken({ appointmentId: appt.id, purpose: 'cancel', expiresAt: appt.startAt })
  const reschedule = generateAppointmentToken({ appointmentId: appt.id, purpose: 'reschedule', expiresAt: appt.startAt })
  // Persist hashes (always overwrite — single-source-of-truth = latest mail)
  await db.update(appointments).set({
    cancelTokenHash: cancel.hash,
    rescheduleTokenHash: reschedule.hash,
    updatedAt: new Date(),
  }).where(eq(appointments.id, appt.id))
  return {
    cancelUrl: `${PUBLIC_SITE_URL}/buchen/cancel?token=${encodeURIComponent(cancel.token)}`,
    rescheduleUrl: `${PUBLIC_SITE_URL}/buchen/reschedule?token=${encodeURIComponent(reschedule.token)}`,
  }
}
```

Erweitere `RenderContext` um `links: { cancel_url: string; reschedule_url: string }`.
Erweitere `buildPlaceholders` um die zwei Keys.
In `queueConfirmation`: vor `ctx`-Aufbau → `const { cancelUrl, rescheduleUrl } = await ensureTokensAndUrls(appt)` → in `ctx.links` einsetzen.

- [ ] **Step 3: tsc + bestehende Tests**

Run: `npx tsc --noEmit && npx vitest run src/__tests__/unit/services/appointment-mail`
Expected: alle grün, neu-geschriebener Test grün.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/appointment-mail.service.ts src/__tests__/unit/services/appointment-mail-phase5.test.ts
git commit -m "feat(termine): generate cancel/reschedule tokens at booking, include links in confirmation mail"
```

---

## Phase D — Reminder-Pipeline

### Task 5: Task-Handler `appointment_reminder`

**Files:**
- Modify: `src/lib/services/task-queue.service.ts`
- Create: `src/__tests__/unit/services/task-queue-appointment-reminder.test.ts`

- [ ] **Step 1: Test (TDD)**

```ts
// src/__tests__/unit/services/task-queue-appointment-reminder.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => { vi.resetModules() })

describe('task-queue handler: appointment_reminder', () => {
  it('sends mail when appointment status is confirmed', async () => {
    const sendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'm1' })
    vi.doMock('@/lib/services/email.service', () => ({ EmailService: { sendWithTemplate: sendMock } }))
    vi.doMock('@/lib/db', () => ({
      db: {
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ status: 'confirmed' }] }) }) }),
      },
    }))
    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    // call private handler via execute() with a mock task — use exported helper or build minimal item
    // (Adapt to existing test pattern that drives executeHandler.)
    // ...
  })

  it('skips and marks task cancelled when appointment status is cancelled', async () => {
    // ...
  })
})
```
*Test an bestehende Handler-Tests anpassen (siehe wie `task-queue.service.test.ts` reminder/email testet).*

- [ ] **Step 2: Implementierung im `executeHandler`**

In `src/lib/services/task-queue.service.ts`:

```ts
case 'appointment_reminder': {
  const apptId = item.referenceId ?? (payload.appointmentId as string | undefined)
  if (!apptId) {
    return { skipped: true, reason: 'no_appointment_id' }
  }
  const { db } = await import('@/lib/db')
  const { appointments } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [appt] = await db.select({ status: appointments.status }).from(appointments).where(eq(appointments.id, apptId)).limit(1)
  if (!appt || appt.status === 'cancelled') {
    return { skipped: true, reason: 'appointment_cancelled_or_missing' }
  }
  if (!payload.templateSlug || !payload.to) {
    return { skipped: true, reason: 'no_template_or_to' }
  }
  const { EmailService } = await import('@/lib/services/email.service')
  const result = await EmailService.sendWithTemplate(
    String(payload.templateSlug),
    String(payload.to),
    (payload.placeholders || {}) as Record<string, string>,
    {
      leadId: payload.leadId ? String(payload.leadId) : undefined,
      personId: payload.personId ? String(payload.personId) : undefined,
    },
  )
  if (!result.success) throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
  return { sent: true, to: payload.to, template: payload.templateSlug }
}
```

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/task-queue-appointment-reminder.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/task-queue.service.ts src/__tests__/unit/services/task-queue-appointment-reminder.test.ts
git commit -m "feat(termine): appointment_reminder task handler with status pre-check"
```

### Task 6: `queueReminders` + `cancelPendingReminders` in AppointmentMailService

**Files:**
- Modify: `src/lib/services/appointment-mail.service.ts`

- [ ] **Step 1: Tests schreiben**

In `appointment-mail-phase5.test.ts` ergänzen:
- `queueReminders(apptId)` legt 2 task-rows an (24h + 1h vor `start_at`) mit type='appointment_reminder', referenceId=apptId, templateSlug korrekt, scheduledFor korrekt, placeholders gesetzt.
- `cancelPendingReminders(apptId)` setzt status='cancelled' auf alle pending tasks mit type='appointment_reminder' AND referenceId=apptId.

- [ ] **Step 2: Implementierung**

```ts
// In AppointmentMailService:

async queueReminders(appointmentId: string): Promise<void> {
  const ctx = await this._loadContext(appointmentId)  // refactor: extract context-build into private helper
  const startMs = ctx.startAtUtc.getTime()
  const reminders = [
    { templateSlug: 'appointment.customer.reminder_24h', scheduledFor: new Date(startMs - 24 * 60 * 60 * 1000) },
    { templateSlug: 'appointment.customer.reminder_1h', scheduledFor: new Date(startMs - 60 * 60 * 1000) },
  ]
  for (const r of reminders) {
    if (r.scheduledFor.getTime() <= Date.now()) continue  // don't queue past reminders
    await db.insert(taskQueue).values({
      type: 'appointment_reminder',
      status: 'pending',
      priority: 4,
      scheduledFor: r.scheduledFor,
      payload: {
        templateSlug: r.templateSlug,
        to: ctx.customer.email,
        placeholders: buildPlaceholders(ctx),
        leadId: ctx.leadId,
        personId: ctx.personId,
      },
      referenceType: 'appointment',
      referenceId: appointmentId,
    })
  }
},

async cancelPendingReminders(appointmentId: string): Promise<number> {
  const result = await db.update(taskQueue)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(
      eq(taskQueue.type, 'appointment_reminder'),
      eq(taskQueue.referenceId, appointmentId),
      eq(taskQueue.status, 'pending'),
    ))
    .returning({ id: taskQueue.id })
  return result.length
},
```

*(`_loadContext` per Refactor aus `queueConfirmation` extrahieren, damit DRY.)*

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/appointment-mail-phase5.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/appointment-mail.service.ts src/__tests__/unit/services/appointment-mail-phase5.test.ts
git commit -m "feat(termine): queueReminders + cancelPendingReminders in mail service"
```

### Task 7: `book()` queued zusätzlich Reminders

**Files:**
- Modify: `src/lib/services/appointment.service.ts`

- [ ] **Step 1: Implementierung**

In `appointment.service.ts` Section 8 (queueConfirmation), direkt nach `queueConfirmation`:

```ts
try {
  await AppointmentMailService.queueReminders(appt.id)
} catch (err) {
  console.error('Failed to queue reminders:', err)
}
```

- [ ] **Step 2: tsc + Tests**

Run: `npx tsc --noEmit && npx vitest run src/__tests__/unit/services/appointment.service.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/appointment.service.ts
git commit -m "feat(termine): queue 24h+1h reminders on booking"
```

---

## Phase E — Cancel-Flow

### Task 8: `AppointmentService.cancel(token)` + Mail-Service-Helper

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Modify: `src/lib/services/appointment-mail.service.ts`
- Create: `src/__tests__/unit/services/appointment.service.cancel.test.ts`

- [ ] **Step 1: Tests schreiben (TDD) — Cases:**

1. valid token + confirmed appt → status='cancelled', hash null, reminders cancelled, both mails queued, Google delete called
2. expired token → throws TokenExpired
3. bad signature → throws TokenInvalid
4. token hash mismatch with DB → throws TokenInvalid (revoked)
5. already-cancelled appt → idempotent (no double mail, no double Google call)
6. token signed for purpose='reschedule' → throws TokenInvalid

- [ ] **Step 2: Implementierung in `appointment.service.ts`**

```ts
export class AppointmentTokenError extends Error {
  constructor(public reason: 'expired' | 'invalid' | 'revoked' | 'wrong_purpose', message?: string) {
    super(message ?? reason)
    this.name = 'AppointmentTokenError'
  }
}

async cancel(args: { token: string; reason?: string }): Promise<{ alreadyCancelled: boolean }> {
  const { verifyAppointmentToken, hashOf } = await import('@/lib/utils/appointment-token.util')
  const v = verifyAppointmentToken(args.token)
  if (!v.ok) {
    if (v.reason === 'expired') throw new AppointmentTokenError('expired')
    throw new AppointmentTokenError('invalid')
  }
  if (v.payload.p !== 'cancel') throw new AppointmentTokenError('wrong_purpose')

  const [appt] = await db.select().from(appointments).where(eq(appointments.id, v.payload.a)).limit(1)
  if (!appt) throw new AppointmentTokenError('invalid')
  if (appt.cancelTokenHash !== hashOf(args.token)) throw new AppointmentTokenError('revoked')

  if (appt.status === 'cancelled') return { alreadyCancelled: true }

  // 1. DB update first (revoke tokens + status)
  await db.update(appointments).set({
    status: 'cancelled',
    cancelTokenHash: null,
    rescheduleTokenHash: null,
    cancelledAt: new Date(),
    cancelledBy: 'customer',
    cancellationReason: args.reason ?? null,
    updatedAt: new Date(),
  }).where(eq(appointments.id, appt.id))

  // 2. Cancel pending reminders
  const { AppointmentMailService } = await import('./appointment-mail.service')
  await AppointmentMailService.cancelPendingReminders(appt.id)

  // 3. Queue cancel mails (customer + staff)
  try { await AppointmentMailService.queueCancellation(appt.id) }
  catch (err) { console.error('Failed to queue cancel mails:', err) }

  // 4. Google delete (best-effort)
  if (appt.googleEventId && appt.googleCalendarId) {
    try {
      const account = await CalendarAccountService.getActiveAccount(appt.userId)
      if (account) {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        await CalendarGoogleClient.eventsDelete({
          accessToken,
          calendarId: appt.googleCalendarId,
          eventId: appt.googleEventId,
          sendUpdates: 'all',
        })
      }
    } catch (err) {
      console.warn('Google event delete failed:', err)
    }
  }

  return { alreadyCancelled: false }
},
```

In `CalendarGoogleClient` ggf. `eventsDelete` ergänzen, falls noch nicht vorhanden (ein-Methode-Wrapper um `DELETE /calendars/{calendarId}/events/{eventId}`).

In `AppointmentMailService` `queueCancellation(apptId)` analog `queueConfirmation` aber mit Templates `appointment.customer.cancelled` + `appointment.staff.cancelled`.

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/appointment.service.cancel.test.ts`
Expected: PASS (6/6)

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/appointment.service.ts src/lib/services/appointment-mail.service.ts src/lib/services/calendar-google.client.ts src/__tests__/unit/services/appointment.service.cancel.test.ts
git commit -m "feat(termine): AppointmentService.cancel with token verify + mails + Google delete"
```

### Task 9: API `POST /api/buchen/cancel`

**Files:**
- Create: `src/app/api/buchen/cancel/route.ts`
- Create: `src/__tests__/integration/api/buchen-cancel.test.ts`

- [ ] **Step 1: Test (TDD) — Cases:**

1. valid body `{token}` → 200 `{success:true, alreadyCancelled:false}`
2. malformed body → 400 zod_invalid
3. expired token → 410 `{error:'token_expired'}`
4. invalid token → 403 `{error:'token_invalid'}`
5. revoked (hash mismatch) → 403 `{error:'token_invalid'}`
6. rate-limit hit → 429

- [ ] **Step 2: Implementierung**

```ts
// src/app/api/buchen/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppointmentService, AppointmentTokenError } from '@/lib/services/appointment.service'
import { rateLimit } from '@/lib/utils/rate-limit'

const Body = z.object({
  token: z.string().min(10),
  reason: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  if (!rateLimit(`cancel:${ip}`, { windowMs: 60_000, max: 10 })) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  try {
    const { alreadyCancelled } = await AppointmentService.cancel({
      token: parsed.data.token,
      reason: parsed.data.reason,
    })
    return NextResponse.json({ success: true, alreadyCancelled })
  } catch (err) {
    if (err instanceof AppointmentTokenError) {
      const code = err.reason === 'expired' ? 410 : 403
      return NextResponse.json({ error: `token_${err.reason}` }, { status: code })
    }
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }
}
```

`/api/buchen/cancel` muss in `PUBLIC_PATHS` von `src/proxy.ts` enthalten sein. Bereits durch `'/api/buchen'` gedeckt? — Ja, `pathname.startsWith(path + '/')` gilt.

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/integration/api/buchen-cancel.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/buchen/cancel/route.ts src/__tests__/integration/api/buchen-cancel.test.ts
git commit -m "feat(termine): POST /api/buchen/cancel"
```

### Task 10: Public Cancel-Page

**Files:**
- Create: `src/app/(public)/buchen/cancel/page.tsx`
- Create: `src/app/(public)/buchen/cancel/_components/CancelConfirm.tsx`

- [ ] **Step 1: Server-Page (`page.tsx`)**

```tsx
// src/app/(public)/buchen/cancel/page.tsx
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { appointments, slotTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyAppointmentToken, hashOf } from '@/lib/utils/appointment-token.util'
import { CancelConfirm } from './_components/CancelConfirm'

interface Props { searchParams: Promise<{ token?: string }> }

export default async function CancelPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) return <ErrorBox kind="missing" />

  const v = verifyAppointmentToken(token)
  if (!v.ok) return <ErrorBox kind={v.reason === 'expired' ? 'expired' : 'invalid'} />
  if (v.payload.p !== 'cancel') return <ErrorBox kind="invalid" />

  const [row] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      customerName: appointments.customerName,
      cancelTokenHash: appointments.cancelTokenHash,
      slotTypeName: slotTypes.name,
    })
    .from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .where(eq(appointments.id, v.payload.a))
    .limit(1)

  if (!row) return <ErrorBox kind="invalid" />
  if (row.cancelTokenHash !== hashOf(token)) return <ErrorBox kind="invalid" />
  if (row.status === 'cancelled') return <ErrorBox kind="already_cancelled" />

  return (
    <main className="container max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Termin stornieren</h1>
      <p className="text-muted-foreground mb-6">
        Möchtest du wirklich folgenden Termin stornieren?
      </p>
      <div className="rounded-lg border p-4 mb-6 space-y-1">
        <div><strong>Termin-Art:</strong> {row.slotTypeName}</div>
        <div><strong>Datum:</strong> {row.startAt.toLocaleString('de-DE')} – {row.endAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div><strong>Kunde:</strong> {row.customerName}</div>
      </div>
      <CancelConfirm token={token} />
    </main>
  )
}

function ErrorBox({ kind }: { kind: 'missing' | 'expired' | 'invalid' | 'already_cancelled' }) {
  const messages = {
    missing: 'Kein Token übergeben.',
    expired: 'Dieser Storno-Link ist abgelaufen (der Termin liegt in der Vergangenheit).',
    invalid: 'Dieser Storno-Link ist ungültig oder wurde bereits verwendet.',
    already_cancelled: 'Dieser Termin wurde bereits storniert.',
  }
  return (
    <main className="container max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Storno nicht möglich</h1>
      <p className="text-muted-foreground">{messages[kind]}</p>
    </main>
  )
}
```

- [ ] **Step 2: Client-Component (`CancelConfirm.tsx`)**

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function CancelConfirm({ token }: { token: string }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const res = await fetch('/api/buchen/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Stornierung fehlgeschlagen')
      }
      setDone(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-4 text-emerald-900">
        <p className="font-medium">Termin storniert.</p>
        <p className="text-sm mt-1">Eine Bestätigung wurde an deine E-Mail-Adresse gesendet.</p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Grund (optional)</label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
      </div>
      <Button type="submit" disabled={busy} variant="destructive">
        {busy ? 'Wird storniert…' : 'Termin stornieren'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: tsc + manuell**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/buchen/cancel"
git commit -m "feat(termine): public cancel page with token verify + confirm form"
```

---

## Phase F — Reschedule-Flow

### Task 11: `AppointmentService.reschedule(token, newStartAtUtc)`

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Create: `src/__tests__/unit/services/appointment.service.reschedule.test.ts`

- [ ] **Step 1: Tests (TDD) — Cases:**

1. valid token + free new slot → DB update (startAt, endAt, neue Token-Hashes), alte Reminders cancelled, neue Reminders gequeued, Mails queued, Google patch called
2. neuer Slot überschneidet sich mit anderem Termin → throws SlotNoLongerAvailableError, kein DB-Update
3. expired token → throws TokenExpired
4. wrong purpose (cancel-Token) → throws TokenInvalid
5. cancelled appointment → throws InvalidState

- [ ] **Step 2: Implementierung — Re-Verfügbarkeitscheck via gleicher Logik wie `book`**

Hauptpunkte:
- Wie `book()`: `computeFreeSlots` mit aktuellem state (rules, overrides, externalBusy, andere appts EXKL. dieses) + Live-FreeBusy
- `appointments` filter: `status IN ('pending','confirmed') AND id != currentApptId` — sonst blockt der eigene Termin sich selbst
- DB update: neue startAt/endAt, neue Hashes, googleEventId bleibt (für patch)
- Google: `eventsPatch` (analog `eventsInsert` aber UPDATE) — Pflicht-Param `timeZone: string` mitgeben (IANA der Mitarbeiter-TZ aus `users.timezone`), nicht 'UTC' hardcoden.
- `eventsDelete`: einfacher Wrapper um `DELETE /calendars/{id}/events/{eventId}`, braucht keine TZ.

- [ ] **Step 3: Tests grün**

Run: `npx vitest run src/__tests__/unit/services/appointment.service.reschedule.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/appointment.service.ts src/lib/services/calendar-google.client.ts src/__tests__/unit/services/appointment.service.reschedule.test.ts
git commit -m "feat(termine): AppointmentService.reschedule with live recheck + Google patch"
```

### Task 12: API `GET /api/buchen/reschedule/availability` + `POST /api/buchen/reschedule`

**Files:**
- Create: `src/app/api/buchen/reschedule/availability/route.ts`
- Create: `src/app/api/buchen/reschedule/route.ts`
- Create: `src/__tests__/integration/api/buchen-reschedule.test.ts`

- [ ] **Step 1: Tests (TDD) — Cases:**

availability:
- valid token + valid date → 200 `{slots: ISO[]}`
- expired/invalid token → 410/403

reschedule POST:
- valid token + body → 200 `{success:true, startAt, endAt}`
- slot taken → 409 `{error:'slot_unavailable'}`
- token mismatch → 403

- [ ] **Step 2: Implementierung — beide Routes nutzen Token-Verify zur Identifikation**

```ts
// availability/route.ts (skizziert)
const QSchema = z.object({ token: z.string().min(10), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
// → verify, lookup appt, get slotTypeId + userId, call AvailabilityCalcService for that day
//   excluding the current appointment's window. Return free slots as ISO timestamps.
```

```ts
// reschedule/route.ts (POST)
const Body = z.object({ token: z.string().min(10), startAtUtc: z.string().datetime() })
// → AppointmentService.reschedule({ token, newStartAtUtc: new Date(body.startAtUtc) })
```

- [ ] **Step 3: Tests grün + Commit**

```bash
git add src/app/api/buchen/reschedule src/__tests__/integration/api/buchen-reschedule.test.ts
git commit -m "feat(termine): GET reschedule/availability + POST reschedule routes"
```

### Task 13: Public Reschedule-Page mit Wizard

**Files:**
- Create: `src/app/(public)/buchen/reschedule/page.tsx`
- Create: `src/app/(public)/buchen/reschedule/_components/RescheduleWizard.tsx`

Architektur: Server-Page validiert Token + lädt Termin-/Slot-Type-Daten. Reicht alles an Client-Wizard durch. Wizard kopiert die Datepicker+Slots-UI vom existing `BookingWizard.tsx` (gleicher Slot-Typ, gleiche Dauer, gleiche Buffer/min-notice/max-advance), aber hits `/api/buchen/reschedule/availability` und finalisiert via `/api/buchen/reschedule`.

- [ ] **Step 1: Server-Page**

Pattern wie cancel-page, aber mehr Daten (Slot-Typ-Settings für Wizard).

- [ ] **Step 2: Wizard-Component**

DRY-Punkt: BookingWizard ist Class/Function — falls die Datepicker+Slot-Liste-UI dort als Subkomponente extrahierbar ist, wiederverwenden. Falls nicht (engerer Refactor): nur die Inputs/Hooks kopieren mit `?token=` statt `?slug=`.

Submit-Button POSTet an `/api/buchen/reschedule` und zeigt Erfolg analog zu `bestaetigt`-Page (oder redirect dort hin).

- [ ] **Step 3: tsc + Smoke + Commit**

```bash
git add "src/app/(public)/buchen/reschedule"
git commit -m "feat(termine): public reschedule page with full datepicker wizard"
```

---

## Phase G — Tests + Smoketest

### Task 14: Vollständiger Test-Lauf

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — keine neuen Fehler aus Phase 5 (Bestand erlaubt)
- [ ] `npx vitest run` — alle Phase-5-Tests grün, keine Regressionen ggü. Stand vor Phase 5
- [ ] **Manueller Smoketest:**
  1. Migration `0046` ausgeführt (8 Templates, 6 davon neu)
  2. Buchung anlegen (wie Phase-4-Smoketest)
  3. Bestätigungsmail-Inbox: Cancel-Link + Reschedule-Link sichtbar
  4. DB: `cancelTokenHash` + `rescheduleTokenHash` gesetzt
  5. DB: 2 task_queue Rows mit type='appointment_reminder', scheduledFor 24h+1h vor `start_at`
  6. **Cancel-Flow:** Cancel-Link öffnen → Detail-Seite → "Stornieren" → Erfolg → DB: status='cancelled', Hashes null → Inbox: Customer + Staff Cancel-Mail → Google-Calendar: Event entfernt → DB: pending appointment_reminder Tasks haben status='cancelled'
  7. **Reschedule-Flow:** neuen Test-Termin anlegen → Reschedule-Link öffnen → Datepicker → freien Slot wählen → Submit → Erfolg → DB: startAt/endAt aktualisiert, neue Hashes → Inbox: rescheduled Mails → Google-Calendar: Event verschoben
  8. **Reminder-Re-Check:** manuell `/api/cron/tick` (oder via process_queue Cron-Job) → Reminder-Tasks pending? Versand bei zeitlich fälligem Termin? Bei stornierten Termin: Task wird übersprungen?
  9. **Token-Reuse:** alten Cancel-Link aus Schritt 3 nochmal verwenden → 403 invalid
  10. **Token-Tampering:** Payload manipulieren → 403

### Task 15: Final Code Review + Push

Subagent dispatchen für End-to-End Review:
- **Security:** Rate-Limit, Token-Verify-Edge-Cases, kein PII in Logs, kein Klartext-Token in DB, kein Status-Leak
- **Correctness:** Reschedule-Race-Guard (eigener Termin nicht in apptIntervals!), idempotente Cancel, Reminder-Skip bei cancelled, Token-Lifecycle (sha-Vergleich konstantzeit)
- **UX:** klare Fehlerseiten (expired/invalid/already_cancelled), DSGVO-Hinweis fehlend?, Erfolgsmeldung mit Bestätigungsmail-Hinweis

```bash
git push origin main
```

---

## Self-Review

**Spec-Coverage Phase 5 (§9.3 #5 + §6):**
- ✅ 8 Mail-Templates → Tasks 2 + 3
- ✅ Tokens (HMAC, Hash in DB) → Task 1, integriert in Task 4
- ✅ Reminder 24h/1h mit Status-Re-Check → Tasks 5–7
- ✅ Cancel inkl. Hash-null + Reminder-Cancel + Google-Delete → Tasks 8–10
- ✅ Reschedule mit neuem Datepicker + neuen Tokens + Google-Patch → Tasks 11–13
- ✅ Tests + Smoketest → Task 14

**Bewusst nicht:**
- `.ics`-Anhang & Add-to-Calendar → Phase 8
- Audit-Log-Einträge → Phase 8

**Risk-Areas:**
- **Token-Secret-Wechsel:** würde alle ausgegebenen Tokens invalidieren. Akzeptabel, da Tokens kurzlebig sind (bis `start_at`). Doku im README erwähnen.
- **Race beim Reschedule:** zwei Kunden submitten gleichzeitig → einer überschneidet sich mit dem anderen post-update. Live-FreeBusy fängt das in den meisten Fällen, restliches Risiko = optimistic-V1-acceptable (gleich wie `book`).
- **Reminder-Drift bei Migration:** wenn `start_at` nicht-trivial verschoben wurde (Reschedule), müssen alte Reminder gelöscht und neue eingefügt werden. Ist im Reschedule-Flow gehandhabt.
- **Reminder-Past-Schedule:** bei sehr kurzfristigen Buchungen (<24h vor `start_at`) wird der 24h-Reminder nicht gequeued (skip wenn `scheduledFor <= now`). 1h-Reminder kann ähnlich skipped werden.
- **Mail-Versand-Failure:** queueAll-Calls sind try/catch — Buchung/Cancel/Reschedule schlägt nicht fehl, wenn Mail-Queue-Insert scheitert. User kriegt vielleicht keine Mail, aber DB-State ist konsistent.

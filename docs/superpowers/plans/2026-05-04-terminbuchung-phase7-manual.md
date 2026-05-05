# Terminbuchung Phase 7 — Manuelle Backend-Buchung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1–6 fertig (Public Buchung, Reminder, Storno, Umbuchung, Portal-Variante)
> - **Phase 7 (diese Datei):** Manuelle Backend-Buchung
> - Phase 8: Polish (`.ics`, Audit-Log, Add-to-Calendar)

**Goal:** Mitarbeiter können einen Termin direkt aus dem Backend-Kalender heraus anlegen — Use-Case: Kunde ruft an, Mitarbeiter trägt sofort ein. Bestehender Lead/Person kann gepickt werden (vorausgefüllt), neue Kontakte per Form. Default sendet Bestätigungsmail an Kunden (mit Storno/Umbuchungs-Links wie bei Public-Buchung), Checkbox kann unterdrücken.

**Architecture:**

- **Service:** `AppointmentService.bookManual({userId, slotTypeId, startAtUtc, customer..., personId?, suppressCustomerMail})` — wenn `personId` gesetzt: nutzt `personIdOverride` (skip Lead-Match), sonst: nutzt bestehenden Lead-Match-Pfad. Bei `suppressCustomerMail=true` wird `queueConfirmation` übersprungen für den Customer (Staff-Mail bleibt). `appointments.source = 'manual'`.
- **API:** `POST /api/v1/appointments` (intern, `withPermission('appointments', 'create')` — Permission ist neu im RBAC-Modul `appointments`).
- **UI:** Ein Dialog `ManualBookingDialog` mit Slot-Typ-Select + Datepicker + Person-Picker (Combobox-Search aus `persons`) + Form (Name/E-Mail/Telefon, mit Tab-Switch zwischen Picker und Form) + Suppress-Mail-Checkbox. Auf `/intern/termine`:
  1. Button **„+ Termin anlegen"** im Header öffnet Dialog ohne Vorbelegung
  2. Klick auf einen freien (`available` / `free-override`) 15-Min-Cell im `WeekCalendarView` öffnet Dialog mit `startAtUtc` der Cell vorausgewählt; Slot-Typ-Auswahl bleibt frei

**Tech Stack:** wie Phasen 5+6.

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §9.3 #7.

**Codebase-Patterns:** wie zuvor.

**Bewusst NICHT in Phase 7:**
- `.ics`-Anhang in der Bestätigungsmail → Phase 8
- Audit-Log-Eintrag „manual booking" → Phase 8
- Inline-Edit der manuell gebuchten Termine ohne Dialog (Reschedule via existing flow)

**File Structure:**

```
src/
  lib/
    services/
      appointment.service.ts                              # MOD — bookManual()
  app/
    api/
      v1/
        appointments/
          route.ts                                        # NEW — POST {userId, slotTypeId, startAtUtc, customer..., suppressCustomerMail}
        persons/
          search/
            route.ts                                      # NEW — GET ?q= → list[id, name, email, phone] (used by Person-Picker)
    intern/
      (dashboard)/
        termine/
          _components/
            WeekCalendarView.tsx                          # MOD — Header-Button + clickable empty cells
            ManualBookingDialog.tsx                       # NEW — Dialog with picker/form/suppress-mail
__tests__/
  unit/services/
    appointment.service.manual.test.ts                    # NEW — bookManual happy + suppress + lead-match + personIdOverride
  integration/api/
    appointments-create.test.ts                           # NEW
    persons-search.test.ts                                # NEW
```

---

## Phase A — Service-Layer

### Task 1: `AppointmentService.bookManual`

**Files:**
- Modify: `src/lib/services/appointment.service.ts`
- Create: `src/__tests__/unit/services/appointment.service.manual.test.ts`

```ts
async bookManual(args: {
  userId: string                  // staff being booked
  slotTypeId: string
  startAtUtc: Date
  customer: {
    name: string
    email: string
    phone: string
    message?: string | null
  }
  personId?: string               // skip lead-match if provided
  suppressCustomerMail?: boolean  // default false
}): Promise<BookResult> {
  // Validate staff has booking_page_active true OR override (manual booking
  // bypasses the public-booking gate; staff can book for themselves regardless)
  // → For Phase 7: skip the bookingPageActive check (staff-internal is always allowed).

  const result = await AppointmentService.book({
    userId: args.userId,
    slotTypeId: args.slotTypeId,
    startAtUtc: args.startAtUtc,
    customerName: args.customer.name,
    customerEmail: args.customer.email,
    customerPhone: args.customer.phone,
    customerMessage: args.customer.message ?? null,
    source: 'manual',
    personIdOverride: args.personId,
    suppressCustomerMail: args.suppressCustomerMail ?? false,
  })
  return result
},
```

**Note:** `book()` muss um `suppressCustomerMail?: boolean` erweitert werden — wenn `true`, wird der `queueConfirmation`-Call übersprungen (Staff-Mail bleibt; aber `queueConfirmation` queued beide). Cleaner: extract or split.

**Cleanest approach for `book()`:** statt `queueConfirmation` immer aufzurufen, splitte in `queueConfirmationCustomerOnly()` / `queueConfirmationStaffOnly()` ODER füge Parameter zu `queueConfirmation(appointmentId, opts?)`:

```ts
// in appointment-mail.service.ts
async queueConfirmation(appointmentId: string, opts?: { skipCustomer?: boolean }): Promise<void> {
  const { appt, user, ctx } = await loadContext(appointmentId)

  if (!opts?.skipCustomer) {
    await db.insert(taskQueue).values({...customerMailRow})
  }

  if (user.email) {
    await db.insert(taskQueue).values({...staffMailRow})
  }
},
```

In `book()`:
```ts
await AppointmentMailService.queueConfirmation(appt.id, { skipCustomer: input.suppressCustomerMail })
```

`BookInput` erweitern um `suppressCustomerMail?: boolean`.

**Reminders bei suppressCustomerMail:** Auch Reminders sollten unterdrückt werden (sonst kriegt der Kunde später trotzdem eine Mail). `book()` fragt `if (!input.suppressCustomerMail) await AppointmentMailService.queueReminders(...)`.

**Steps:**
- [ ] Test schreiben (4 cases: happy, suppressMail, with personId, lead-match fallback)
- [ ] BookInput um `suppressCustomerMail` erweitern
- [ ] `book()` ruft `queueConfirmation(id, {skipCustomer})` und `queueReminders` nur wenn nicht suppressed
- [ ] `queueConfirmation` honoriert `skipCustomer`-Option
- [ ] `bookManual()` schickt `source='manual'` + propagiert suppressCustomerMail/personId
- [ ] Tests grün
- [ ] Commit
```bash
git add src/lib/services/appointment.service.ts src/lib/services/appointment-mail.service.ts src/__tests__/unit/services/appointment.service.manual.test.ts
git commit -m "feat(termine): AppointmentService.bookManual + suppressCustomerMail option"
```

---

## Phase B — APIs

### Task 2: `POST /api/v1/appointments`

**Files:**
- Create: `src/app/api/v1/appointments/route.ts`
- Create: `src/__tests__/integration/api/appointments-create.test.ts`

```ts
const BodySchema = z.object({
  userId: z.string().uuid(),
  slotTypeId: z.string().uuid(),
  startAtUtc: z.string().datetime(),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(1).max(50),
  customerMessage: z.string().max(2000).nullable().optional(),
  personId: z.string().uuid().optional(),
  suppressCustomerMail: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async () => {
    let raw: unknown
    try { raw = await request.json() }
    catch { return apiError('VALIDATION_ERROR', 'invalid_json', 400) }
    const v = validateAndParse(BodySchema, raw)
    if (!v.success) return apiValidationError(formatZodErrors(v.errors))

    try {
      const result = await AppointmentService.bookManual({
        userId: v.data.userId,
        slotTypeId: v.data.slotTypeId,
        startAtUtc: new Date(v.data.startAtUtc),
        customer: {
          name: v.data.customerName,
          email: v.data.customerEmail,
          phone: v.data.customerPhone,
          message: v.data.customerMessage ?? null,
        },
        personId: v.data.personId,
        suppressCustomerMail: v.data.suppressCustomerMail,
      })
      return apiSuccess(result, undefined, 201)
    } catch (err) {
      if (err instanceof SlotNoLongerAvailableError) {
        return apiError('SLOT_UNAVAILABLE', 'slot_unavailable', 409)
      }
      const msg = err instanceof Error ? err.message : 'book_failed'
      return apiError('BOOK_FAILED', msg, 500)
    }
  })
}
```

**RBAC-Permission:** Falls `appointments.create` noch nicht im RBAC-Modul-Set ist, in `src/lib/types/permissions.ts` ergänzen. Vermutlich existiert `appointments` schon (siehe Phase 1). Verifizieren.

**Steps:**
- [ ] Permission-Check verifizieren (oder ergänzen)
- [ ] Route + Tests (5 cases: happy, validation, slot_unavailable, missing-permission, suppress-mail)
- [ ] Commit
```bash
git commit -m "feat(termine): POST /api/v1/appointments — manual booking"
```

### Task 3: `GET /api/v1/persons/search`

**Files:**
- Create: `src/app/api/v1/persons/search/route.ts`
- Create: `src/__tests__/integration/api/persons-search.test.ts`

Used by the Person-Picker in the dialog. Returns persons matching name or email.

```ts
const QuerySchema = z.object({
  q: z.string().min(2).max(100),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'persons', 'read', async () => {
    const searchParams = (request.nextUrl ?? new URL(request.url)).searchParams
    const v = QuerySchema.safeParse({ q: searchParams.get('q') ?? '' })
    if (!v.success) return apiError('VALIDATION_ERROR', 'invalid_query', 400)

    const q = `%${v.data.q.toLowerCase()}%`
    const rows = await db.select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      email: persons.email,
      phone: persons.phone,
      mobile: persons.mobile,
    }).from(persons).where(or(
      sql`lower(${persons.firstName} || ' ' || ${persons.lastName}) like ${q}`,
      sql`lower(coalesce(${persons.email}, '')) like ${q}`,
    )).limit(20)

    return apiSuccess(rows)
  })
}
```

**Steps:**
- [ ] Route + 3 Tests (auth, valid query, short query → 400)
- [ ] Commit
```bash
git commit -m "feat(termine): GET /api/v1/persons/search — for manual booking person picker"
```

---

## Phase C — UI

### Task 4: `ManualBookingDialog`

**Files:**
- Create: `src/app/intern/(dashboard)/termine/_components/ManualBookingDialog.tsx`

Single Dialog mit allen Inputs (kein Multi-Step-Wizard, da der Mitarbeiter Geschwindigkeit will).

Layout (sm:max-w-2xl):
- **Slot-Typ-Select** (alle aktiven Slot-Typen des aktuellen User)
- **Datum + Uhrzeit** (Datepicker + freie Zeit-Auswahl per Time-Input ODER Slots-Liste)
- **Kunde:**
  - Tab-Switch: „Bestehende Person" / „Neuer Kontakt"
  - Bestehende: Combobox mit Search (debounced fetch zu `/api/v1/persons/search?q=`), Auswahl füllt Name/E-Mail/Telefon read-only
  - Neuer Kontakt: Name + E-Mail + Telefon-Inputs
- **Optionale Nachricht** (Textarea, klein)
- **Bestätigungsmail an Kunden** (Checkbox, default: ON)
- **Submit/Cancel**

State:
```tsx
const [slotTypeId, setSlotTypeId] = useState('')
const [date, setDate] = useState('')          // YYYY-MM-DD
const [time, setTime] = useState('')          // HH:MM
const [tab, setTab] = useState<'existing' | 'new'>('new')
const [pickedPerson, setPickedPerson] = useState<Person | null>(null)
const [searchQ, setSearchQ] = useState('')
const [searchResults, setSearchResults] = useState<Person[]>([])
const [name, setName] = useState('')
const [email, setEmail] = useState('')
const [phone, setPhone] = useState('')
const [message, setMessage] = useState('')
const [sendCustomerMail, setSendCustomerMail] = useState(true)
const [saving, setSaving] = useState(false)
```

Auf Submit:
1. Build `startAtUtc` from `date + time` (interpreted in user's timezone, converted to UTC — use the same `localTimeToUtc` helper as in availability route)
2. POST `/api/v1/appointments`
3. Auf Success: dialog schließen, parent reload triggern

Pre-fill (props):
```tsx
interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  preset?: { slotTypeId?: string; startAtUtc?: Date }   // when triggered from a calendar slot click
  slotTypes: SlotType[]
  userTimezone: string
}
```

Wenn `preset.startAtUtc` gesetzt: `date` und `time` daraus prefillen (in user's TZ formatiert).

**Steps:**
- [ ] Implement (~200 Zeilen)
- [ ] tsc + ESLint clean
- [ ] Commit
```bash
git commit -m "feat(termine): ManualBookingDialog — picker/form + suppress-mail toggle"
```

### Task 5: `WeekCalendarView` Integration

**Files:**
- Modify: `src/app/intern/(dashboard)/termine/_components/WeekCalendarView.tsx`
- Modify: `src/app/intern/(dashboard)/termine/page.tsx` (zum slot-types Laden + an View durchreichen)

**Header-Button:**

```tsx
<Button onClick={() => setManualOpen({ open: true, preset: undefined })}>
  <Plus className="h-4 w-4" /> Termin anlegen
</Button>
```

**Empty-Slot-Click:**

Aktuell ist die Render-Schicht der 15-Min-Cells `<div>` ohne onClick. Erweitern:
- Wenn `state === 'available' || state === 'free-override'`: `<button>` mit onClick → setze `preset = { startAtUtc: cellStartUtc }` und open dialog
- Andere States bleiben passive `<div>`

```tsx
const isClickable = state === 'available' || state === 'free-override'
if (isClickable) {
  return (
    <button
      key={min}
      type="button"
      onClick={() => onSlotClick({ startAtUtc: cellStart })}
      className={`${baseClass} cursor-pointer hover:opacity-70 ${cellClass(state)}`}
      title={`${cellStart.toLocaleString('de-DE')} — Termin hier anlegen`}
    />
  )
}
return <div ... />
```

`page.tsx` lädt zusätzlich `slotTypes` + reicht an `WeekCalendarView` durch. Dialog wird im View gerendert.

**State im View:**
```tsx
const [manualOpen, setManualOpen] = useState<{ open: boolean; preset?: { startAtUtc: Date } }>({ open: false })
```

Auf `onCreated`: `router.refresh()` damit der Server-Component neu lädt und der neue Termin im Kalender erscheint.

**Steps:**
- [ ] page.tsx erweitert um slotTypes + userTimezone
- [ ] WeekCalendarView: Button + clickable empty cells + Dialog-Render
- [ ] tsc + ESLint clean
- [ ] Commit
```bash
git commit -m "feat(termine): manual booking trigger — header button + empty-slot click"
```

---

## Phase D — Tests + Smoketest

### Task 6: Vollständiger Test-Lauf

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` keine neuen Fehler
- [ ] `npx vitest run` — neue Phase-7-Tests grün, keine Regressionen
- [ ] **Manueller Smoketest:**
  1. `/intern/termine` → Header zeigt „+ Termin anlegen"
  2. Klick → Dialog öffnet ohne Pre-Fill
  3. Slot-Typ wählen, Datum + Uhrzeit, Tab „Neuer Kontakt", Name/Mail/Telefon, „Bestätigungsmail" angehakt → Submit
  4. Erfolg, Dialog schließt, Termin erscheint im Wochenkalender
  5. DB: `appointments.source='manual'`, `personId` gesetzt (via Lead-Match), `cancelTokenHash`/`rescheduleTokenHash` gesetzt
  6. Mail-Inboxen: Customer + Staff bekommen Mail; Reminder-Tasks im task_queue
  7. **Suppress-Test:** neuen Termin anlegen, Häkchen weg → Submit → DB-Eintrag da, aber kein Customer-Mail-Task; Staff-Mail-Task da; KEINE Reminder-Tasks
  8. **Empty-Slot-Click:** im Wochenkalender auf eine grüne (verfügbare) Zelle klicken → Dialog öffnet mit dem Datum/Uhrzeit dieses Slots
  9. **Person-Picker:** Dialog → Tab „Bestehende Person", search „Walt" → Liste mit Treffern → Walter Heiner pickern → Felder pre-filled, read-only → Submit → DB: appointment.personId zeigt direkt auf den gepickten person.id (kein Lead-Match)
  10. **Slot-Konflikt:** versuche, einen Slot zu doppelbuchen → 409 SlotNoLongerAvailable

### Task 7: Final Review + Push

- [ ] Subagent dispatchen: Security (RBAC `appointments.create`), Correctness (suppressMail propagation), UX (Pre-Fill, Search-Debounce)
- [ ] Push

---

## Self-Review

**Spec-Coverage Phase 7 (§9.3 #7):**
- ✅ Manuelles Anlegen → Tasks 1–4
- ✅ Person-Picker UND Form → Task 4 Tab-Switch
- ✅ Suppress-Mail-Option → Tasks 1+2+4
- ✅ Trigger via Button + Slot-Click → Task 5

**Bewusst nicht:**
- `.ics`-Anhang → Phase 8
- Audit-Log → Phase 8
- Manuelle Buchung in der Vergangenheit (Backdating) → V1 lassen wir vergangene Termine zu, wenn der Mitarbeiter es so will (kein min-notice-Check für `source='manual'`); falls erwünscht, kann das später per Flag gegated werden

**Risk-Areas:**
- **`bookingPageActive`-Bypass:** `bookManual` umgeht den Bookable-Check (anders als `bookForPortal`), weil Mitarbeiter auch für nicht-public-bookable User booken können sollen — z. B. Admin-Termin im Team-Kalender. Akzeptiert.
- **Backdating:** Mitarbeiter kann theoretisch Termine in der Vergangenheit anlegen (Datepicker akzeptiert beliebiges Datum). Akzeptiert für V1 — Use-Case: nachträgliches Eintragen einer Telefonbesprechung. Validation kann später ergänzt werden.
- **Race bei sehr schnellen Doppelbuchungen:** dieselbe Optimistic-V1-Limitation wie `book()` und `reschedule()`. KNOWN GAP.
- **Person-Suche `lower(... like ...)`:** kein Index auf lower-trim — funktional OK für kleine bis mittlere Tenants. Bei >10k persons: GIN-Index auf trgm später.

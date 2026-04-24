# Portal-User ↔ Ansprechpartner-Integration

**Status:** approved (brainstorming)
**Datum:** 2026-04-24
**Kontext:** Portal-P1–P6 sind abgeschlossen. Portal-User werden bisher als eigener Tab „Portal-Zugänge" pro Firma verwaltet, getrennt von den Ansprechpartnern. Das Duplikat-Feeling und der separate Änderungsanträge-Tab sollen aufgelöst werden: Portal-Zugänge gehören logisch zu Ansprechpartnern, und der Änderungsanträge-Tab ist Redundanz zur globalen Admin-Seite `/intern/portal/change-requests`.

## 1. Ziel

Portal-Zugänge werden direkt an Ansprechpartner gebunden. Admin legt einen Portal-User aus der Ansprechpartner-Liste heraus an. Der separate „Portal-Zugänge"-Tab verschwindet. Der Änderungsanträge-Tab verschwindet ebenfalls — CRs erscheinen stattdessen als Eintrag im Aktivitäten-Log der Firma.

## 2. Scope

**In scope:**
- `persons.portalUserId` (nullable FK → `users.id`, ON DELETE SET NULL) + Index.
- Migration 014: Schema-Änderung + Auto-Backfill per (Email, CompanyId)-Match für existierende Portal-User.
- `PersonService.createPortalAccess(personId, { method, password? })` — Create-Portal-User + Rückverknüpfung in einem Zug.
- Neuer API-Endpoint `POST /api/v1/persons/[id]/portal-access`.
- Erweiterung des bestehenden `POST /api/v1/companies/[id]/persons` um optional `portalUserId` (für Verwaisten-Übernahme).
- Erweiterung des bestehenden `GET /api/v1/companies/[id]/portal-users` um ein `linkedPersonId`-Feld in der Response (Server-Join über `persons.portalUserId`).
- `company-contacts-section.tsx`: neue Spalte Portal-Status + erweiterter Actions-Dropdown (inline, identische Actions wie bisheriger Portal-Zugänge-Tab).
- Neuer Block „Verwaiste Portal-Zugänge" unterhalb der Kontakte-Liste.
- Löschung des Tabs „Portal-Zugänge" (`portal-users-tab.tsx` entfernt, Tab-Eintrag aus `page.tsx` raus).
- Löschung des Tabs „Änderungsanträge" (`change-requests-tab.tsx` entfernt, Tab-Eintrag raus).
- Change-Request-API erzeugt zusätzlich einen Activity-Eintrag (`type='change_request'`) mit lesbarer Änderungsliste.
- Aktivitäten-UI rendert den neuen `change_request`-Typ mit passendem Icon/Label.

**Out of scope (P8-Kandidaten):**
- „Person vom Portal-User entlinken ohne User zu löschen" (manuelle Action).
- Bulk-Einladung aller Ansprechpartner.
- Automatische Portal-Einladung beim Person-Anlegen (Default-Toggle).

## 3. Architektur

### 3.1 Schema

In `src/lib/db/schema.ts`, `persons`-Tabelle um folgende Spalte ergänzen (nach `companyId`):

```ts
portalUserId: uuid('portal_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
```

Zusätzlicher Index:

```ts
index('idx_persons_portal_user_id').on(table.portalUserId),
```

`AnyPgColumn`-Thunk ist nötig, weil `users` vor `persons` deklariert ist (zirkuläre Typinferenz sonst).

Relations-Block erhält einen Eintrag für den Link:

```ts
portalUser: one(users, {
  fields: [persons.portalUserId],
  references: [users.id],
}),
```

### 3.2 Migration 014

Idempotent, mit Auto-Backfill:

```sql
-- ============================================================
-- Migration 014: persons.portal_user_id + Backfill
-- ============================================================

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_persons_portal_user_id ON persons(portal_user_id);

-- Backfill: existing portal_users per (email, companyId) an Personen verknüpfen
UPDATE persons p
SET portal_user_id = u.id
FROM users u
WHERE u.role = 'portal_user'
  AND u.company_id IS NOT NULL
  AND p.company_id = u.company_id
  AND LOWER(p.email) = LOWER(u.email)
  AND p.portal_user_id IS NULL;
```

Migration-Registry-Eintrag und Pre-Drizzle-Block in `docker/app/entrypoint.prod.sh` identisch spiegeln.

**Backfill-Verhalten:** Nur exakter (case-insensitive) Email-Match + gleiche CompanyId. Alles andere bleibt `NULL` und taucht im „Verwaiste Portal-Zugänge"-Block auf.

## 4. Service-Layer

### 4.1 `PersonService.createPortalAccess`

Neu in `src/lib/services/person.service.ts` (falls Service nicht existiert, neu anlegen; ansonsten Method ergänzen):

```ts
async createPortalAccess(personId: string, input: {
  method: 'password' | 'invite'
  password?: string
}): Promise<{ user: User; person: Person }>
```

Schritte:
1. Person laden. Wenn nicht gefunden → `Error('Person nicht gefunden')`.
2. Wenn `person.companyId` null → `Error('Person ohne Firma kann keinen Portal-Zugang erhalten')`.
3. Wenn `person.portalUserId` gesetzt → `Error('Person hat bereits einen Portal-Zugang')`.
4. Wenn `person.email` null/leer → `Error('Person ohne E-Mail kann keinen Portal-Zugang erhalten')`.
5. `UserService.createPortalUser({ companyId: person.companyId, firstName: person.firstName, lastName: person.lastName, email: person.email, method, password })` (existierender Service aus P1, wirft bei Duplicate-Email).
6. `UPDATE persons SET portal_user_id = <user.id> WHERE id = personId`.
7. Return `{ user, person (with portalUserId set) }`.

## 5. API

### 5.1 `POST /api/v1/persons/[id]/portal-access`

Gate: `withPermission('users', 'create')`.

Body (zod-validiert):

```ts
discriminatedUnion('method', [
  z.object({ method: z.literal('password'), password: z.string().min(10) }),
  z.object({ method: z.literal('invite') }),
])
```

Flow:
1. `PersonService.createPortalAccess(id, body)`.
2. Audit-Log: `person.portal_access_created` — `{ personId, userId, method }`.
3. Bei `method='invite'`: TaskQueue-Eintrag für `portal_invite`-Template an Person-Email (Pattern analog zur bestehenden `POST /companies/[id]/portal-users`-Route).
4. Response: `apiSuccess({ user: { id, email, role, status, firstLoginAt, hasPendingInvite }, personId }, 201)`.

Fehler-Mapping:
- `nicht gefunden` → 404.
- `bereits` → 409.
- `ohne Firma|ohne E-Mail` → 400.
- `bereits vorhanden` (Email-Duplicate aus UserService) → 409.

### 5.2 `POST /api/v1/companies/[id]/persons` — Erweiterung

Body erhält optional `portalUserId: uuid`. Wenn gesetzt, Server-Validation:
- User mit dieser ID existiert.
- `user.role === 'portal_user'`.
- `user.companyId === <param id>` (Verknüpfung innerhalb der Firma).
- `user` ist noch nicht durch eine andere Person verlinkt (SELECT 1 FROM persons WHERE portal_user_id = userId LIMIT 1).

Bei Verletzung → 400 `VALIDATION_ERROR`. Bei Erfolg wird die erzeugte Person mit `portalUserId` gesetzt.

Audit: `person.portal_access_linked` — `{ personId, userId }`.

### 5.3 `GET /api/v1/companies/[id]/portal-users` — Erweiterung

Response-Items bekommen ein zusätzliches Feld:

```ts
linkedPersonId: string | null
```

Serverseitig via `LEFT JOIN persons ON persons.portal_user_id = users.id AND persons.company_id = users.company_id`. Der Client filtert damit in der UI die „Verwaisten" (wo `linkedPersonId === null`).

### 5.4 Change-Request-API erweitern

In `src/app/api/v1/portal/me/company/change-request/route.ts`, nach dem existierenden Audit-Log (fail-safe try/catch):

```ts
try {
  // Person für den Portal-User finden (optional, für activity.personId)
  const [linkedPerson] = await db.select({ id: persons.id })
    .from(persons)
    .where(eq(persons.portalUserId, auth.userId))
    .limit(1)

  await db.insert(activities).values({
    companyId: auth.companyId,
    personId: linkedPerson?.id ?? null,
    userId: auth.userId,
    type: 'change_request',
    subject: 'Portal: Änderungsantrag Firmendaten',
    content: aenderungenText,  // die bereits vorhandene lesbare Änderungsliste
    metadata: { changeRequestId: created.id, proposedChanges: validation.data.proposedChanges },
  })
} catch (err) {
  logger.error('Activity write for change_request failed', err, { module: 'PortalChangeRequestAPI' })
}
```

Bei Approve/Reject (`/api/v1/portal/change-requests/[id]/approve|reject`): jeweils ein Folge-Activity (`type='change_request_decided'` oder gleicher `type` mit anderem `subject`) optional — aus Scope-Gründen **nicht** in P7 verpflichtend. Der Create-Event reicht als „Dokumentation" laut User-Anforderung.

## 6. UI

### 6.1 `company-contacts-section.tsx` — Erweiterungen

**Neue Spalte „Portal" in der bestehenden Tabelle**, positioniert zwischen E-Mail-Spalte und Actions-Dropdown:

| Portal-User-State | Darstellung |
|---|---|
| `persons.portalUserId === null` | `<span className="text-muted-foreground">—</span>` |
| `user.status === 'inactive'` | `<Badge variant="secondary">Deaktiviert</Badge>` |
| `user.inviteToken !== null` && `user.firstLoginAt === null` | `<Badge variant="outline">Eingeladen</Badge>` |
| `user.status === 'active'` && `user.firstLoginAt !== null` | `<Badge>Aktiv</Badge>` |

Status wird ermittelt, indem die Section zusätzlich zu den Personen einmalig die Portal-User-Liste der Firma lädt (`GET /api/v1/companies/[id]/portal-users`) und clientseitig je Person nach `portalUserId` joint.

**Actions-Dropdown-Erweiterungen** (zusätzlich zu bestehenden Person-Actions wie Edit/Delete):

| State | Neue Menu-Items |
|---|---|
| Kein Portal-Zugang | „Als Portal-User anlegen" (öffnet Dialog mit Tabs „Invite-Link" / „Passwort direkt") |
| Eingeladen | „Invite erneut senden", „Deaktivieren" |
| Aktiv | „Deaktivieren" |
| Deaktiviert | „Reaktivieren" |

Der Dialog für „Als Portal-User anlegen" wiederverwendet die Komponente aus dem ursprünglichen `portal-users-tab.tsx` (Tabs + Passwort-Generator + Invite-Hinweis). Submit zielt auf `POST /api/v1/persons/[id]/portal-access`, nicht mehr auf die Company-Route.

Resend/Deactivate/Reactivate nutzen weiterhin `PATCH /api/v1/users/[id]/portal-access` mit entsprechendem `action`-Feld.

### 6.2 „Verwaiste Portal-Zugänge"-Block

Neuer Bereich unterhalb der Kontakte-Liste, wird nur gerendert, wenn mindestens ein Portal-User der Firma `linkedPersonId === null` hat:

```
┌─ Verwaiste Portal-Zugänge ──────────────────────┐
│ Diese Portal-Zugänge sind keiner Person zugeordnet: │
│ • max@kunde.de — Max Muster (aktiv)               │
│   [Als Ansprechpartner übernehmen]                │
└───────────────────────────────────────────────────┘
```

Button „Als Ansprechpartner übernehmen" öffnet Dialog:
- Vorname (pre-filled aus `user.firstName`, editierbar).
- Nachname (pre-filled aus `user.lastName`, editierbar).
- Position/Department (leer, editierbar).
- E-Mail: read-only (aus `user.email`).

Submit: `POST /api/v1/companies/[id]/persons` mit den Formdaten **und** `portalUserId: user.id`. Nach Erfolg: Refresh der Kontakte + Verwaisten-Liste.

### 6.3 Tab-Löschungen

In `src/app/intern/(dashboard)/contacts/companies/[id]/page.tsx`:
- `<TabsTrigger value="portal-users">` + `<TabsContent value="portal-users">` entfernen.
- `<TabsTrigger value="change-requests">` + `<TabsContent value="change-requests">` entfernen.
- Entsprechende Imports `PortalUsersTab` und `ChangeRequestsTab` entfernen.

Dateien löschen:
- `src/app/intern/(dashboard)/contacts/companies/[id]/_components/portal-users-tab.tsx`
- `src/app/intern/(dashboard)/contacts/companies/[id]/_components/change-requests-tab.tsx`

### 6.4 Aktivitäten-UI erweitern

Die Activity-Liste rendert bereits `type`-abhängig. Neuen Typ `'change_request'` als zusätzlichen Case aufnehmen (oder in der bestehenden Type-Map-Struktur eintragen), mit passendem Icon (z.B. `FileEdit` oder `Edit` aus lucide-react) und Label „Änderungsantrag". Visuelle Behandlung analog zu bestehenden Typen.

## 7. Sicherheit

- Server-side Validierung im Person-Create-Endpoint mit optionalem `portalUserId`: User existiert, role stimmt, companyId matcht, User nicht bereits anderweitig verknüpft. Verletzung → 400.
- `PersonService.createPortalAccess` wirft bei fehlender Firma/Email/Dupe. Die Endpoints mappen das auf 4xx.
- Keine neue Permission-Scope nötig — `users:create` + `users:update` decken alles ab.
- E-Mail-Duplicate-Prevention fällt durch die bestehende `UserService.createPortalUser`-Prüfung.
- Cross-Company-Isolation: `user.companyId === person.companyId` wird serverseitig erzwungen, nicht nur UI-Filter.

## 8. Testing

**Unit (`setupDbMock`-Pattern):**
- `PersonService.createPortalAccess` — Happy-Path, Person ohne companyId, Person bereits verlinkt, Person ohne email, Duplicate-Email via UserService.

**Integration (`integration-real/`):**
- `persons-portal-access-flow.test.ts`:
  1. Person anlegen.
  2. `createPortalAccess({ method: 'invite' })` → Person hat portalUserId, User hat companyId + inviteToken + dummy passwordHash.
  3. Re-Create wirft `bereits`.
  4. Accept-Invite-Endpoint mit dem Token setzt Passwort und löscht Token; Person behält den Link.
- `persons-portal-link-isolation.test.ts`:
  1. Person in Firma A, Portal-User in Firma B.
  2. `POST /companies/A/persons { portalUserId: <B-User> }` → 400.
- `change-request-activity.test.ts`:
  1. Portal-CR-Create erzeugt Activity mit `type='change_request'`, korrekte `companyId`, `personId` gesetzt wenn Person existiert, `metadata.changeRequestId` vorhanden.

## 9. Audit

Zusätzliche Audit-Events:
- `person.portal_access_created` — bei `POST /persons/[id]/portal-access`.
- `person.portal_access_linked` — bei `POST /companies/[id]/persons` mit `portalUserId`.

Bestehende Events (`users.created`, `portal_user.created` etc. aus P1) bleiben wie sie sind.

## 10. Implementierungs-Reihenfolge (für Planning)

1. Schema + Migration 014 + Pre-Drizzle-Block.
2. `PersonService.createPortalAccess` + Unit-Tests.
3. `POST /api/v1/persons/[id]/portal-access` + Audit + E-Mail-Queue.
4. Erweiterung `POST /api/v1/companies/[id]/persons` um optional `portalUserId`.
5. Erweiterung `GET /api/v1/companies/[id]/portal-users` um `linkedPersonId`.
6. `company-contacts-section.tsx`: Portal-Spalte + Actions-Dropdown + Dialog.
7. „Verwaiste Portal-Zugänge"-Block + Übernahme-Dialog.
8. Tab-Löschungen + Datei-Entfernungen (`portal-users-tab.tsx`, `change-requests-tab.tsx`).
9. Change-Request-API: Activity-Write ergänzen.
10. Activity-UI: `change_request`-Typ rendern.
11. Integration-Tests.
12. Manual E2E + Deploy.

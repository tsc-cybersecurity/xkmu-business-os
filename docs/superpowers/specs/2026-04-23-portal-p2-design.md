# Portal-P2 — Firmendaten-Antrag (mit Audit-Foundation)

**Projekt:** xkmu-business-os Customer Portal
**Phase:** P2 (nach P1; setzt P1.5 Audit-Foundation voraus)
**Datum:** 2026-04-23

## Zielbild

Portal-User können eigene Firmendaten selbst pflegen — allerdings nicht direkt, sondern über einen **Antrags-Workflow**: Sie ändern Werte, submitten → Admin prüft → Admin genehmigt (Änderungen werden auf `companies` appliziert) oder lehnt ab (mit Kommentar).

Zusätzlich: **Revisionssichere Audit-Trail** für alle ändernden Portal-Aktionen sowie Login/Logout (inkl. interner Aktionen auf Portal-User-Ressourcen). Dies ist Voraussetzung für P2 und ein eigenständiger Phase-1.5-Sweep vorweg.

## Abgrenzung

- **In Scope P2:** Firmendaten-Antrag, Admin-Queue, Approve/Reject, Audit, Notifications (optional).
- **Out of Scope P2:** Vertrags-/Projektansicht (P3), Auftrags-Bestellung (P4), Chat (P5).
- **Vor P2 (P1.5):** Audit-Foundation, Retrofit P1-Endpoints, Task-Queue-Retry-UX, Test-Cleanup.

## Entscheidungen (user-bestätigt)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Approval-Workflow | Single-Step: ein Admin mit `users:update`-Permission genehmigt = sofort live |
| 2 | Kunde darf ändern | Alle portal-safe-Felder AUSSER `name` (legalForm, street, houseNumber, postalCode, city, country, phone, email, website, industry, vatId) |
| 3 | Admin-Queue-Ort | Beides: Tab auf Firmen-Detail (lokal) + zentrale Seite `/intern/(dashboard)/portal/change-requests` (global) |
| 4 | Audit-Retention | Append-only. Archivierung später (out of scope P2). |
| 5 | Antrags-Speicherung | Diff (nur geänderte Felder als JSON), Apply bei Approve |

## Architektur

### Audit-Foundation (P1.5)

**Tabelle `audit_logs`:**
```
id             UUID PK
userId         UUID NULL REFERENCES users(id) ON DELETE SET NULL (NULL für anonyme/system-Aktionen)
userRole       VARCHAR(50) NULL  (role at time of action — denormalisiert wegen Rollenwechsel)
action         VARCHAR(100) NOT NULL  (z.B. 'portal_user.login', 'portal.company_change_requested')
entityType     VARCHAR(50) NULL  (z.B. 'company', 'user', 'company_change_request')
entityId       UUID NULL
payload        JSONB NOT NULL DEFAULT '{}'  (aktionsspezifisch, z.B. diff, failure-reason)
ipAddress      VARCHAR(45) NULL  (IPv6-kompatibel)
userAgent      TEXT NULL
createdAt      TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_audit_logs_user_id ON (userId, createdAt DESC)
INDEX idx_audit_logs_entity ON (entityType, entityId, createdAt DESC)
INDEX idx_audit_logs_action ON (action, createdAt DESC)
```

**Service `AuditLogService`:**
```ts
interface AuditLogInput {
  userId?: string | null
  userRole?: string | null
  action: string          // z.B. 'portal_user.login', 'portal.company_change_requested'
  entityType?: string | null
  entityId?: string | null
  payload?: Record<string, unknown>
  request?: NextRequest   // für IP + User-Agent extraction
}

AuditLogService.log(input): Promise<void>   // fail-safe: throws if write fails
AuditLogService.list({ userId?, entityType?, entityId?, action?, limit?, offset? }): Promise<AuditLog[]>
```

**Fail-safe Policy:** Wenn `log()` in einem API-Handler scheitert, soll die Aktion abbrechen (500 zurückgeben), nicht silent weitermachen. Einzige Ausnahme: Login-Attempt-Logging darf den Login nicht blockieren (weil Audit-DB-Ausfall würde den User aussperren) — hier wird `logger.error` geschrieben und der Login fährt fort.

### Action-Slug-Registry (P2-relevant)

Benennungsschema: `<domain>.<subject>.<verb>` oder `<domain>.<verb>`.

| Slug | Wann |
|---|---|
| `portal_user.login` | Nach erfolgreichem Login (role=portal_user) |
| `portal_user.login_failed` | Bei Login-Failure — nur wenn User existiert (sonst info-disclosure) |
| `portal_user.logout` | Nach Logout |
| `portal_user.invite_accepted` | Nach erfolgreichem `acceptInvite` |
| `internal.login` | Nach erfolgreichem Login (role != portal_user) |
| `internal.logout` | Nach Logout (role != portal_user) |
| `admin.portal_user.created` | Admin legt Portal-User an |
| `admin.portal_user.deactivated` | Admin deaktiviert Portal-User |
| `admin.portal_user.reactivated` | Admin reaktiviert Portal-User |
| `admin.portal_user.invite_resent` | Admin generiert neuen Invite-Token |
| `portal.company_change_requested` | Portal-User submitted Change-Request |
| `admin.company_change_request.approved` | Admin approved Change-Request (payload enthält angewandten Diff) |
| `admin.company_change_request.rejected` | Admin rejected Change-Request (payload enthält Kommentar) |

### Portal-P2 Schema

**Tabelle `company_change_requests`:**
```
id              UUID PK
companyId       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
requestedBy     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
requestedAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
proposedChanges JSONB NOT NULL  (nur Diff-Felder: { street: 'new val', ... })
status          VARCHAR(20) NOT NULL DEFAULT 'pending'  ('pending' | 'approved' | 'rejected')
reviewedBy      UUID NULL REFERENCES users(id) ON DELETE SET NULL
reviewedAt      TIMESTAMPTZ NULL
reviewComment   TEXT NULL
createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_ccr_company ON (companyId, status, requestedAt DESC)
INDEX idx_ccr_status ON (status, requestedAt DESC)
```

**Business-Rules:**
- Nur ein `pending` Change-Request pro Firma erlaubt (Dubletten vermeiden). Neuer Submit wenn bereits pending → 409 Conflict.
- Portal-User kann eigenen pending Request zurückziehen (Delete); approved/rejected sind immutable (append-only Historie).
- Admin-Approve: Apply `proposedChanges` via `CompanyService.update(companyId, diff)` + audit-log beider Parteien.

### Erlaubte Felder (zod-validiert)

```ts
const changeableFields = z.object({
  legalForm: z.string().max(100).optional(),
  street: z.string().max(255).optional(),
  houseNumber: z.string().max(20).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(255).optional(),
  country: z.string().max(10).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().max(500).optional(),
  industry: z.string().max(100).optional(),
  vatId: z.string().max(50).optional(),
}).strict()  // strict: keine unbekannten Felder
```

Empty-string wird zu null normalisiert (wie bestehender `emptyToNull`-Helper in `company.service.ts`).

### API-Routes

**Portal (via `withPortalAuth`):**
- `POST /api/v1/portal/me/company/change-request` — create (409 wenn pending existiert)
- `GET /api/v1/portal/me/company/change-requests` — list own requests (alle Status)
- `DELETE /api/v1/portal/me/company/change-request/[id]` — cancel pending request (nur eigener, nur `pending`)

**Admin (via `withPermission`):**
- `GET /api/v1/companies/[id]/change-requests` — list für eine Firma (`companies:read`)
- `GET /api/v1/portal/change-requests?status=pending` — globale Liste (`users:update` — weil Review = Änderung an Portal-User-Daten)
- `POST /api/v1/portal/change-requests/[id]/approve` — apply + audit (`users:update`)
- `POST /api/v1/portal/change-requests/[id]/reject` — body `{ reviewComment }`, audit (`users:update`)

### UI-Routes

**Portal:**
- `/portal/company` (neue Seite) — Edit-Formular mit aktuellen Firmendaten vor-befüllt, Submit → POST change-request.
  Banner bei pending request: "Antrag vom X läuft — Werte werden nach Genehmigung übernommen."
- `/portal/company/requests` (neue Seite) — Liste eigener Anträge mit Status + Review-Kommentar.

**Admin:**
- Firmen-Detail-Tab "Änderungsanträge" — Liste aller Anträge dieser Firma, Approve/Reject-Dialog.
- `/intern/(dashboard)/portal/change-requests` (neue Seite) — globale Queue aller pending Anträge über alle Firmen.

### Notifications (optional, aber empfohlen)

- **E-Mail-Template `portal_change_request_admin`** → an Admin bei neuem Submit (Task-Queue-Email, referenceType='company_change_request').
- **E-Mail-Template `portal_change_request_decision`** → an Portal-User bei Approve/Reject (mit Kommentar bei Reject).

Optional für P2 — wenn knapp, auch erst mal weglassen (manuelle Queue-Prüfung reicht).

## Sicherheit

- Portal-User kann nur eigene Firma beantragen (companyId aus Session).
- Admin-Approve schreibt NUR die Felder aus `proposedChanges`, nicht den gesamten Body — Schutz gegen Injection via unerwarteter Felder (bereits durch zod `.strict()` erschlagen).
- Audit-Writes fail-safe (bei DB-Fail → 500 statt silent ignore), außer Login-Attempt.
- Diff wird beim Submit per JSON validiert (keine HTML/Script-Inhalte erwartet, aber Text-Escaping obliegt den Consumern).

## Migrationen

- **009_audit_logs.sql** — Tabelle `audit_logs` + Indexe. Pre-Drizzle in `entrypoint.prod.sh`.
- **010_company_change_requests.sql** — Tabelle + Indexe. Pre-Drizzle in `entrypoint.prod.sh`.

## Offene Deferrals

- Bulk-Audit-Log-View im Admin (nur Service + Select im Backend; UI später).
- E-Mail-Templates für Change-Request-Lifecycle (optional).
- Audit-Log-Retention/Archivierung.
- Partieller "Review alle auf einmal"-Bulk-Approve.

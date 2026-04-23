# Portal-P3 — Verträge & Projekte (read-only)

**Projekt:** xkmu-business-os Customer Portal
**Phase:** P3 (setzt P1 + P1.5 + P2 voraus)
**Datum:** 2026-04-23

## Zielbild

Portal-User sehen ihre eigenen Verträge und Projekte read-only. Keine ändernden Aktionen — nur Transparenz. Nutzt die bereits existierenden internen Module (`documents` mit `type='contract'` und `projects`/`project_tasks`) ohne neue Tabellen oder Migrationen.

## Abgrenzung

- **In Scope:** Vertrags-Liste/Detail, Projekt-Liste/Detail mit read-only Kanban (Tasks sichtbar, aber interne Felder gefiltert), Dashboard-Kacheln aktiv mit Counts.
- **Out of Scope P3:**
  - Angebote (`documents.type='offer'`) — ggf. P3a
  - Aufträge — P4
  - Chat — P5
  - PDF-Export (keine Admin-seitige PDF-Gen vorhanden)
  - View-Audit (nur Mutations + Login werden auditiert, per P1.5-Regel)

## Entscheidungen (user-bestätigt)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Vertragssicht | ALLE Verträge, sortiert `contractStartDate DESC NULLS LAST, createdAt DESC` |
| 2 | Projektsicht | alle außer `status='archived'` |
| 3 | Tasks im Projekt | alle zeigen, interne Felder gefiltert (`assignedTo`, `comments`, `delegatedTo`, `estimatedMinutes`) |
| 4 | Angebote | NICHT in P3 |
| 5 | View-Audit | NICHT auditiert (nur Mutations + Login) |
| 6 | Vertrags-Detail | Nummer, Start/Ende, Kündigung, Positionen, Text (HTML), Status, KEIN `createdBy` |
| 7 | Routen | `/portal/contracts`, `/portal/contracts/[id]`, `/portal/projects`, `/portal/projects/[id]` |
| 8 | Task-Split | 7 Tasks |

## Architektur

Keine neuen Tabellen, keine Migration. Nur:
- 4 neue Portal-API-Routen (alle GET, alle mit `withPortalAuth`)
- 4 neue Portal-UI-Seiten
- Update Portal-Dashboard (`src/app/portal/page.tsx`): Kacheln "Verträge" und "Projekte" zeigen Counts + linken auf die neuen Seiten statt `opacity-60 "kommt in Kürze"`
- Portal-Layout-Nav erweitern: Links "Verträge" und "Projekte"

### Portal-APIs

| Route | Zweck | Rückgabe (projiziert) |
|---|---|---|
| `GET /api/v1/portal/me/contracts` | Liste | Array aus Contract-Zusammenfassungen |
| `GET /api/v1/portal/me/contracts/[id]` | Detail | Contract + items |
| `GET /api/v1/portal/me/projects` | Liste | Array aus Project-Zusammenfassungen + taskCount |
| `GET /api/v1/portal/me/projects/[id]` | Detail | Project + tasks (anonymisiert) |

Alle Routen:
- `withPortalAuth` → auth.companyId
- **Owner-Check im Handler:** `eq(documents.companyId, auth.companyId)` für Contracts, `eq(projects.companyId, auth.companyId)` für Projects. Bei `/[id]` zusätzlich 404 wenn die Ressource nicht zur Firma gehört (nicht 403 — kein Information-Leak).

### Portal-Safe-Projections

**Contract-Liste:**
```
{ id, number, status, contractStartDate, contractEndDate,
  contractRenewalType, contractRenewalPeriod, contractNoticePeriodDays,
  total, subtotal, taxTotal, createdAt }
```

**Contract-Detail (zusätzlich zur Liste):**
```
{ ...listFields,
  contractBodyHtml, notes, paymentTerms,
  items: [{ id, position, name, description, quantity, unit, unitPrice, vatRate, lineTotal }] }
```

Bewusst weggelassen: `createdBy`, `contactPersonId`, `customerName/customerStreet/...` (die Snapshot-Daten — Kunde hat diese via `/portal/company` bereits), `convertedFromId`, `contractTemplateId`, `projectId` (interne Verknüpfung). Falls Projekt-Link sinnvoll wäre: kann in einer späteren Iteration durch "siehe Projekt X" ergänzt werden — in P3 keep simple.

**Project-Liste:**
```
{ id, name, description, status, priority, projectType,
  startDate, endDate, tags, color, taskCount, createdAt }
```

**Project-Detail (zusätzlich):**
```
{ ...listFields, columns,
  tasks: [{ id, title, description, columnId, position, priority,
            startDate, dueDate, completedAt, labels, status:'open'|'done' }] }
```

Aus `project_tasks` rausprojeziert und gefiltert: `assignedTo`, `comments`, `delegatedTo`, `estimatedMinutes`, `checklist`, `parentTaskId`, `referenceType`, `referenceId`. `status` ist abgeleitet: wenn `completedAt != null` → `'done'`, sonst `'open'`.

### Status-Darstellung

**Contracts** (aus `documents.status`): 'draft', 'active', 'expired', 'cancelled', etc. — Mapping auf Badge-Farbe + deutsches Label. Interne Status-Werte, die für Portal nichts bedeuten, nicht zeigen (z.B. falls es 'template' oder 'internal_draft' gibt → als "Entwurf" mappen).

**Projects** (aus `projects.status`): 'active' → "Aktiv", 'completed' → "Abgeschlossen", 'on_hold' → "Pausiert". `'archived'` wird gar nicht angezeigt (Query filtert).

## Sicherheit

- Portal-User sieht ausschließlich Ressourcen seiner `companyId`.
- 404 bei Zugriff auf fremde Ressourcen (nicht 403 → kein Leak).
- `withPortalAuth` blockiert Nicht-portal-User + portal-User ohne companyId.
- Contract-Body ist HTML — wird im Portal als HTML gerendert. Vor Ausgabe NICHT escapen (würde Format zerstören). Aber: HTML kommt aus Admin-Eingabe, also sicher (interne Autoren, nicht user-generated). Falls Sanitization nötig, DOMPurify — aber das ist aktuell nicht im Projekt und wäre Scope-creep.

## UI

### `/portal/contracts` (Liste)
Tabellen-/Listen-Darstellung mit: Nummer, Status-Badge, Zeitraum, Total, "Details"-Link.

### `/portal/contracts/[id]` (Detail)
- Header: Nummer + Status + Button "zurück zur Liste"
- Meta-Card: Zeitraum, Kündigung, Zahlungsbedingungen, Total
- Positionen-Tabelle (documentItems projiziert)
- Vertragstext-Card (HTML render)

### `/portal/projects` (Liste)
Karten-Grid oder Liste mit: Name, Description (truncated), Status-Badge, Priorität, Task-Count, Zeitraum.

### `/portal/projects/[id]` (Detail)
- Header: Projektname + Beschreibung
- Meta-Card: Status, Priorität, Zeitraum, Tags
- **Read-only Kanban-Board:** Columns aus `project.columns`, Tasks pro Column, jede Task-Card zeigt: Title, Priority-Dot, due-Date, Labels. KEIN Assignee, KEINE Kommentare.

### Dashboard (`/portal/page.tsx`)
Die 4 Platzhalter-Kacheln aus P1 werden aktualisiert:
- "Verträge" — aktiv, mit Count, Link zu `/portal/contracts`
- "Projekte" — aktiv, mit Count, Link zu `/portal/projects`
- "Aufträge" — bleibt "kommt in Kürze" (P4)
- "Chat" — bleibt "kommt in Kürze" (P5)

Counts werden per parallelen Fetches an die neuen List-APIs beim Dashboard-Mount geladen.

### Layout (`/portal/layout.tsx`)
Nav-Links um "Verträge" und "Projekte" erweitern (zwischen existierenden "Firmendaten" und "Anträge"):

```
Firmendaten  ·  Verträge  ·  Projekte  ·  Anträge
```

## Tests

- **Service-Level:** Keine neuen Services (alles direkt gegen Drizzle in Route-Handlern wegen einfacher SELECTs — Alternative: kleine `portal-view.service.ts` falls die Queries wiederverwendbar werden. P3 default: inline im Route.)
- **Integration-Test:** End-to-end Scenario gegen echte DB (gated `TEST_DATABASE_URL`): Portal-User sieht nur eigene Firmendaten, nicht fremde (negative Test).
- **Unit-Tests:** Nicht nötig für so dünne Route-Handler; Integration-Test reicht.

## Migrations

Keine. Alle benötigten Tabellen existieren.

## Offene Deferrals

- Angebote-Ansicht (P3a)
- PDF-Download (braucht Admin-seitige PDF-Gen zuerst)
- Task-Filter "nur kundensichtbar" (bräuchte neues Feld `project_tasks.hiddenFromPortal`)
- View-Audit (später ggf. für IT-Audit-Services)
- Projekt-Kommentar-Funktion für Kunde → führt zu Chat-Modul (P5)

# Portal-P4 — Aufträge (Service-Anfragen)

**Projekt:** xkmu-business-os Customer Portal
**Phase:** P4 (setzt P1 + P1.5 + P2 + P3 voraus)
**Datum:** 2026-04-24

## Zielbild

Portal-User reicht freie Service-Anfragen über das Portal ein (z.B. Support, Change-Request, Beratungswunsch). Admin sieht die Anfragen in einer Queue, bearbeitet sie, ändert Status und führt optional einen Ablehnungsgrund ein.

**Kein** Kontingent-/Stunden-Tracking — das ist eine spätere Erweiterung (P4a).
**Kein** Kommentar-Thread — das ist P5 (Chat).
**Keine** Dateianhänge — bewusst weggelassen.

## Abgrenzung

- **In Scope:** Orders anlegen (Portal) + Queue + Status-Workflow (Admin) + Kategorien als pflegbare Entität + E-Mail-Benachrichtigungen + Audit aller Mutations
- **Out of Scope P4:**
  - Kontingent/Stundentracking (P4a)
  - Kommentar-Thread / Chat (P5)
  - Dateianhänge
  - Admin-UI für Kategorie-CRUD (P4a — für P4 reicht seed)
  - Auto-Zuweisung / Workflow-Regeln

## Entscheidungen (user-bestätigt)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Kategorisierung | Kategorisierung „vorbereitet" — eigene Tabelle `order_categories`, geseedet mit sinnvollen Defaults; Admin-CRUD später (P4a). Orders referenzieren per FK. |
| 2 | Dateianhänge | NEIN |
| 3 | Prioritäten | `hoch/mittel/niedrig/kritisch` (Projekt-Standard) |
| 4 | Vertrags-/Projekt-Referenz | Optionale FK-Links auf `documents.id` (Vertrag) und `projects.id` |
| 5 | Status-Workflow | `pending → accepted → in_progress → done` plus `rejected` (final) und `cancelled` (vom Kunden storniert) |
| 6 | Kommentar-Thread | NICHT in P4 — kommt mit P5 Chat |

## Datenmodell

### Tabelle `order_categories`

```
id          UUID PK
name        VARCHAR(100) NOT NULL       (z.B. "IT-Support")
slug        VARCHAR(50) UNIQUE NOT NULL (z.B. "support")
description TEXT
color       VARCHAR(30)                 (für Badge)
sortOrder   INTEGER DEFAULT 0
isActive    BOOLEAN NOT NULL DEFAULT TRUE
createdAt   TIMESTAMPTZ DEFAULT NOW()
updatedAt   TIMESTAMPTZ DEFAULT NOW()

INDEX idx_order_categories_active_sort ON (isActive, sortOrder)
```

**Seed (Migration 011):**
| slug | name | color |
|---|---|---|
| support | IT-Support | slate |
| incident | Incident / Störung | red |
| change-request | Änderungsantrag | blue |
| feature | Feature-Wunsch | green |
| consulting | Beratung / Consulting | amber |
| audit | Audit-Anfrage | purple |
| other | Sonstiges | gray |

### Tabelle `orders`

```
id              UUID PK
companyId       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
requestedBy     UUID REFERENCES users(id) ON DELETE SET NULL
categoryId      UUID REFERENCES order_categories(id) ON DELETE SET NULL
title           VARCHAR(255) NOT NULL
description     TEXT NOT NULL
priority        VARCHAR(20) NOT NULL DEFAULT 'mittel' (hoch|mittel|niedrig|kritisch)
status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                (pending|accepted|in_progress|done|rejected|cancelled)
contractId      UUID REFERENCES documents(id) ON DELETE SET NULL
projectId       UUID REFERENCES projects(id) ON DELETE SET NULL
assignedTo      UUID REFERENCES users(id) ON DELETE SET NULL (Admin-Zuweisung)
rejectReason    TEXT                        (optional, nur bei status='rejected')
acceptedAt      TIMESTAMPTZ
startedAt       TIMESTAMPTZ
completedAt     TIMESTAMPTZ
rejectedAt      TIMESTAMPTZ
cancelledAt     TIMESTAMPTZ
createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_orders_company_status ON (companyId, status, createdAt DESC)
INDEX idx_orders_status_priority ON (status, priority, createdAt DESC)
INDEX idx_orders_assigned ON (assignedTo, status)
```

### Status-Transitionen

Gültige Übergänge (enforced im Service):
- `pending` → `accepted | rejected | cancelled`
- `accepted` → `in_progress | rejected`
- `in_progress` → `done | rejected`
- `done | rejected | cancelled` → final, keine weiteren Übergänge

Transition-Logik setzt die zugehörigen `*At`-Timestamps.

## Action-Slug-Registry (Audit)

| Slug | Wer | Wann |
|---|---|---|
| `portal.order_created` | portal_user | Create (POST) |
| `portal.order_cancelled` | portal_user | DELETE/cancel wenn pending |
| `admin.order_status_changed` | internal | PATCH status |
| `admin.order_assigned` | internal | PATCH assignedTo |

`entityType = 'order'`, `entityId = order.id`. Payload enthält relevant-änderungen (z.B. `{ from: 'pending', to: 'accepted' }`).

## API-Routes

### Portal (`withPortalAuth`)

- `POST /api/v1/portal/me/orders` — Create mit zod-strict body `{ categoryId?, title, description, priority, contractId?, projectId? }`. contract/project werden (falls gesetzt) gegen `companyId` validiert.
- `GET /api/v1/portal/me/orders` — List eigener Orders (alle Status).
- `GET /api/v1/portal/me/orders/[id]` — Detail inklusive Kategorie-Name + Vertragsnummer + Projektname (joined).
- `DELETE /api/v1/portal/me/orders/[id]` — Cancel eigener Order, nur wenn `status='pending'`.

### Admin (`withPermission`)

- `GET /api/v1/orders` — Global Queue mit optionalen Filtern `?status=&priority=&categoryId=&companyId=&assignedTo=`. Permission: `users:read` (gleicher Scope wie Portal-User-Admin-Liste, kein eigenes module nötig).
- `GET /api/v1/orders/[id]` — Detail mit vollem Kontext.
- `PATCH /api/v1/orders/[id]` — body `{ action: 'accept'|'start'|'complete'|'reject'|'assign', ... }` (discriminated union). Validiert Status-Transitionen im Service. Permission: `users:update`.
- `GET /api/v1/order-categories` — Liste aktiver Kategorien für UI-Dropdowns. Public-internal (jede eingeloggte Rolle darf lesen). Permission: keine eigene; wird mit `withPortalAuth` für Portal und `withPermission('users','read')` für Admin geschützt — in der Praxis wird eine Portal-eigene Variante unter `/api/v1/portal/order-categories` bereitgestellt.

### Portal-Helper

- `GET /api/v1/portal/order-categories` — wie Admin-Variante, aber nur aktive Kategorien (`isActive=true`) und projiziert `{id, name, slug, color}`.

## UI

### Portal

- `/portal/orders` (Liste) — Karten-/Listen-Ansicht aller eigenen Orders mit Kategorie, Priorität-Dot, Status-Badge, Datum. Sortiert nach `createdAt DESC`.
- `/portal/orders/new` (Create-Formular) — Kategorie-Dropdown, Titel, Beschreibung (Textarea, multi-line), Priorität, optional Vertrag (Select aus `/portal/me/contracts`), optional Projekt (Select aus `/portal/me/projects`). Submit → POST → Redirect auf Liste.
- `/portal/orders/[id]` (Detail read-only) — Alle Felder, Status-Badge, Historie-Zeile ("Eingereicht am X, Akzeptiert am Y, ..."), Cancel-Button nur bei `status='pending'`.

### Admin

- `/intern/(dashboard)/orders` (Global Queue) — Tabelle mit allen Orders, Filter oben (Status, Priorität, Kategorie, Firma). Jede Zeile klickbar → Detail.
- `/intern/(dashboard)/orders/[id]` (Detail) — Vollansicht inkl. Kunde (User + Firma), Kategorie, Kontext (Vertrags-Link, Projekt-Link), Status-Timeline. Action-Buttons je nach aktuellem Status:
  - `pending` → "Annehmen" / "Ablehnen" (Reject-Dialog mit Grund)
  - `accepted` → "Bearbeitung starten" / "Ablehnen"
  - `in_progress` → "Abschließen" / "Ablehnen"
  - final → keine Actions, nur Anzeige
  - jederzeit: "Zuweisen" (Admin-User-Picker)

### Sidebar

Neuer Eintrag "Aufträge" (top-level, nach "Portal-Anträge" vom P2):
```
{ name: 'Aufträge', href: '/intern/orders', icon: ListOrdered, requiredModule: 'users' }
```

Einfacher Badge mit pending-count optional (später P4a).

### Dashboard-Portal

Die "Aufträge"-Kachel aus P1 (bisher `opacity-60 "kommt in Kürze"`) wird aktiviert:
- Link auf `/portal/orders`
- Count = Summe offener Orders (`status IN ('pending','accepted','in_progress')`)
- Text: "N laufende Anfragen"

### Nav (Portal)

Erweitere Portal-Layout-Nav:
```
Firmendaten · Verträge · Projekte · Aufträge · Anträge
```

## Sicherheit

- Portal-User: strikter companyId-Filter auf alle Orders.
- Cross-Company-Ressourcen-Referenzen im Create: wenn `contractId` oder `projectId` gesetzt, **Server-seitig validieren** dass diese zur `auth.companyId` gehören (sonst 400 VALIDATION_ERROR). Verhindert Information-Leak via fremde IDs.
- Cancel nur eigener Order und nur wenn `status='pending'` (enforced im Service).
- 404 statt 403 bei Fremd-ID-Zugriff (kein Info-Leak).
- Audit bei jeder Mutation (fail-safe try/catch wie bei P1.5/P2).

## E-Mail-Templates

### `portal_order_created_admin`

**Wann:** Bei POST-Success, an Organisations-E-Mail (OrganizationService.getById().email).
**Platzhalter:** `kunde, firma, kategorie, titel, prioritaet, pruefUrl`

### `portal_order_status_changed`

**Wann:** Bei PATCH-Status-Change, an `orders.requestedBy`-User.
**Platzhalter:** `name, firma, titel, statusAlt, statusNeu, rejectReasonBlock, portalUrl, absender`

(Wie P2-Template mit `kommentarBlock`: `rejectReasonBlock` ist entweder leer oder HTML-escape-ter Reject-Grund.)

## Migrations

- **011_orders.sql** — Tabellen `order_categories` + `orders` + Indexe + Seed der 7 Default-Kategorien. Pre-Drizzle in entrypoint.prod.sh.

## Offene Deferrals

- Admin-Kategorie-CRUD-UI (P4a)
- Kontingent/Stunden-Tracking (P4a)
- Auto-Zuweisung / Workflow-Regeln
- Bulk-Actions (alle akzeptieren)
- Dateianhänge
- Reports/Statistik (Durchlaufzeiten, SLA)

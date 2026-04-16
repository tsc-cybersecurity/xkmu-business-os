---
phase: 02-services-api-routen
plan: 01
subsystem: deliverables
tags: [service, api, deliverables, crud, pagination]
dependency_graph:
  requires: [01-db-schema-migrations]
  provides: [DeliverableService, deliverables-api]
  affects: [processes, sops]
tech_stack:
  added: []
  patterns: [drizzle-orm select/insert/update/delete, withPermission, apiSuccess/apiNotFound/apiServerError, parsePaginationParams]
key_files:
  created:
    - src/lib/services/deliverable.service.ts
    - src/app/api/v1/deliverables/route.ts
    - src/app/api/v1/deliverables/[id]/route.ts
    - src/app/api/v1/deliverables/modules/route.ts
  modified: []
decisions:
  - Hard-delete fuer Deliverables (kein soft-delete), da Deliverables keine Audit-Anforderung haben wie SOPs
  - Pagination erfolgt im API-Layer (slice nach list()), nicht im Service, konsistent mit Plan-Vorgabe
  - Permission-Modul 'processes' wird mit SOPs geteilt (Deliverables sind Prozess-Outputs)
metrics:
  duration: 15min
  completed: "2026-04-13T13:08:07Z"
  tasks: 2
  files: 4
requirements:
  - DEL-03
  - DEL-04
  - DEL-05
  - LINK-01
  - LINK-03
---

# Phase 02 Plan 01: DeliverableService und API-Routen — Summary

**One-liner:** DeliverableService mit CRUD, Modul-Uebersicht und SOP-Verkettung via producesDeliverableId, plus vollstaendige REST-API mit Paginierung und Permission-Scoping.

## Was implementiert wurde

### DeliverableService (`src/lib/services/deliverable.service.ts`)

Vollstaendiger Service mit sechs Methoden:

| Methode | Beschreibung |
|---|---|
| `list(tenantId, filters?)` | Paginierbare Liste mit optionalen Filtern moduleId, categoryCode, status |
| `getById(tenantId, id)` | Detail inkl. verknuepftem Modul (nullable) und producingSops[] |
| `create(tenantId, data)` | Neues Deliverable anlegen, alle Felder optional ausser name |
| `update(tenantId, id, data)` | Selektive Feld-Updates via Patch-Objekt |
| `delete(tenantId, id)` | Hard-delete, gibt boolean zurueck |
| `getModulesWithCount(tenantId)` | Alle Module des Tenants mit Anzahl verknuepfter Deliverables |

LINK-03 (SOP -> Deliverable Verknuepfung): `getById` ladet alle SOPs, die `produces_deliverable_id = id` haben (inkl. `isNull(deletedAt)` Filter), als `producingSops[]`.

### API-Routen

**`GET /api/v1/deliverables`** — Query-Params: `moduleId`, `categoryCode`, `status`, `page`, `limit`
Response: `{ success: true, data: [...], meta: { page, limit, total, totalPages } }`

**`POST /api/v1/deliverables`** — Body: Deliverable-Felder, gibt 201 + neues Objekt zurueck

**`GET /api/v1/deliverables/[id]`** — Response: Deliverable + `module: {...}|null` + `producingSops: [...]`

**`PATCH /api/v1/deliverables/[id]`** — Partial update, 404 wenn nicht gefunden

**`DELETE /api/v1/deliverables/[id]`** — Hard-delete, gibt `{ deleted: true }` oder 404

**`GET /api/v1/deliverables/modules`** — Response: Array von Modulen mit `deliverableCount` pro Eintrag

Alle Endpoints sind per `withPermission(request, 'processes', ...)` abgesichert und scopen alle Queries auf `tenantId`.

## Entscheidungen

1. **Hard-delete fuer Deliverables:** SOPs haben soft-delete (deletedAt) wegen Audit-Anforderungen. Deliverables haben keine solchen Anforderungen laut Plan, daher wurde hard-delete gewaehlt (einfacher, kein Filteraufwand).

2. **Pagination im API-Layer:** Der Service gibt rohe Listen zurueck (kein LIMIT/OFFSET in SQL). Die API-Route sliced mit `parsePaginationParams`. Das ist konsistent mit der Plan-Vorgabe und ermoeglicht flexibles In-Memory-Filtering.

3. **Permission-Modul `'processes'`:** Deliverables gehoeren zum Prozess-Oekosystem zusammen mit SOPs. Kein separates Permission-Modul benoetigt.

## Commits

| Task | Hash | Beschreibung |
|---|---|---|
| Task 1: DeliverableService | `1ff89df` | feat(02-01): DeliverableService mit list, getById, create, update, delete, getModulesWithCount |
| Task 2: API-Routen | `3cb2e5b` | feat(02-01): API-Routen fuer Deliverables (GET/POST, GET/PATCH/DELETE, modules) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — alle Methoden sind vollstaendig implementiert und scopen auf tenantId.

## Self-Check: PASSED

- `src/lib/services/deliverable.service.ts` — FOUND
- `src/app/api/v1/deliverables/route.ts` — FOUND
- `src/app/api/v1/deliverables/[id]/route.ts` — FOUND
- `src/app/api/v1/deliverables/modules/route.ts` — FOUND
- Commit `1ff89df` — FOUND
- Commit `3cb2e5b` — FOUND
- TypeScript: keine Fehler in neuen Dateien (existierende Test-Fehler sind pre-existing und unrelated)

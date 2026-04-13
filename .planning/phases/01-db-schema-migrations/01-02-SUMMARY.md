---
phase: 01-db-schema-migrations
plan: 02
subsystem: database
tags: [schema, drizzle, deliverables, execution-logs, sop-extension]
dependency_graph:
  requires: [01-01]
  provides: [deliverable_modules table, deliverables table, execution_logs table, extended sop_documents, extended sop_steps]
  affects: [02-services, 03-seed-data, 04-ui]
tech_stack:
  added: []
  patterns: [drizzle-pgTable, nullable-ALTER-TABLE-columns, arrow-function-forward-references]
key_files:
  modified:
    - src/lib/db/schema.ts
decisions:
  - "deliverableModules and deliverables inserted BEFORE sopDocuments (not after) to allow direct FK reference in producesDeliverableId without relying on Drizzle lazy-resolution"
  - "executionLogs inserted after sopVersions (no forward-reference issues)"
  - "All 7 sopDocuments fields and 1 sopSteps field are nullable — no .notNull() applied"
metrics:
  duration: ~10min
  completed: 2026-04-13
  tasks_completed: 1/2
  files_modified: 1
---

# Phase 01 Plan 02: Drizzle Schema — Deliverables, ExecutionLogs, SOP-Erweiterungen Summary

Drei neue DB-Tabellen (deliverable_modules, deliverables, execution_logs) plus 8 nullable ALTER-TABLE-Felder in sop_documents und sop_steps hinzugefuegt. TypeScript-Compiler berichtet keine Schema-bezogenen Fehler.

## Tasks Completed

### Task 1: Schema-Erweiterungen in schema.ts (COMPLETED)

**Commit:** `78bcfe6`

Alle vier Einfuegestellen wurden bearbeitet:

**Stelle A1 — deliverableModules (vor sopDocuments, ab Zeile ~3115):**
- Tabelle `deliverable_modules` mit: id, tenantId, code, name, category, categoryCode, ziel, preis, createdAt, updatedAt
- Indizes: idx_deliverable_modules_tenant, idx_deliverable_modules_code

**Stelle A2 — deliverables (vor sopDocuments, ab Zeile ~3138):**
- Tabelle `deliverables` mit: id, tenantId, moduleId (FK → deliverable_modules), name, description, format, umfang, trigger, category, categoryCode, status, version, createdAt, updatedAt
- Indizes: idx_deliverables_tenant, idx_deliverables_module, idx_deliverables_category, idx_deliverables_status

**Stelle B — sopDocuments (7 neue nullable Felder, ab Zeile ~3191):**
| Feld | DB-Spalte | Typ | Anforderung |
|------|-----------|-----|-------------|
| automationLevel | automation_level | varchar(20) | SOP-01 |
| aiCapable | ai_capable | boolean | SOP-02 |
| maturityLevel | maturity_level | integer | SOP-03 |
| estimatedDurationMinutes | estimated_duration_minutes | integer | SOP-05 |
| producesDeliverableId | produces_deliverable_id | uuid FK → deliverables | SOP-06 |
| subprocess | subprocess | varchar(255) | SOP-07 |
| sourceTaskId | source_task_id | varchar(50) | SOP-08 |

**Stelle C — sopSteps (1 neues nullable Feld, ab Zeile ~3218):**
| Feld | DB-Spalte | Typ | Anforderung |
|------|-----------|-----|-------------|
| executor | executor | varchar(10) | SOP-04 |

**Stelle A3 — executionLogs (nach sopVersions, ab Zeile ~3239):**
- Tabelle `execution_logs` mit: id, tenantId, entityType, entityId, entityVersion, startedAt, completedAt, executedBy, status, abortReason, qualityScore, durationMinutes, costEstimateUsd, flags, linkedClientId, linkedProjectId, humanApproved, humanApprovedBy, humanApprovedAt, createdAt
- Indizes: idx_execution_logs_tenant, idx_execution_logs_entity, idx_execution_logs_status, idx_execution_logs_started

**Stelle D — Neue Type-Exports (ab Zeile ~3293):**
```typescript
export type DeliverableModule = typeof deliverableModules.$inferSelect
export type NewDeliverableModule = typeof deliverableModules.$inferInsert
export type Deliverable = typeof deliverables.$inferSelect
export type NewDeliverable = typeof deliverables.$inferInsert
export type ExecutionLog = typeof executionLogs.$inferSelect
export type NewExecutionLog = typeof executionLogs.$inferInsert
```

### Task 2: Drizzle-Push (DEFERRED — DB nicht erreichbar)

`npx drizzle-kit push` schlug fehl: PostgreSQL-Datenbank nicht erreichbar (ECONNREFUSED 127.0.0.1:5432). Kein Docker-Container aktiv, keine .env.local-Datei mit DATABASE_URL vorhanden.

**Manueller Schritt erforderlich:**
```bash
# 1. DB starten (Docker):
cp .env.docker .env
docker compose -f docker-compose.local.yml up -d
# 2. Push ausfuehren:
npx drizzle-kit push
```

## Tabellen-Reihenfolge in schema.ts (fuer Referenz Phase 2)

| Zeile | Tabelle | Status |
|-------|---------|--------|
| ~3115 | deliverableModules | NEU |
| ~3138 | deliverables | NEU |
| ~3170 | sopDocuments | ERWEITERT (+7 Felder) |
| ~3205 | sopSteps | ERWEITERT (+1 Feld) |
| ~3224 | sopVersions | unveraendert |
| ~3239 | executionLogs | NEU |

## Entscheidung: Tabellenreihenfolge

deliverableModules und deliverables wurden VOR sopDocuments eingefuegt (nicht dahinter), weil `sopDocuments.producesDeliverableId` direkt auf `deliverables.id` referenziert. Drizzle unterstuetzt zwar lazy arrow-function-references, aber die direkte Reihenfolge ist robuster und verhindert potenzielle Laufzeitprobleme bei Schema-Introspection.

## TypeScript-Status

`npx tsc --noEmit` zeigt keine Fehler in schema.ts. Alle pre-existenten Testfehler (mock-request.ts, integration-real, unit-services) sind unveraendert und nicht durch diese Aenderungen verursacht.

## Deviations from Plan

**1. [Rule 3 - Blocking] executionLogs nach sopVersions statt an Stelle A**
- Plan beschrieb alle drei neuen Tabellen als "Stelle A" — platziert in einer Einfuegung
- Implementierung: deliverableModules + deliverables VOR sopDocuments (Stelle A), executionLogs NACH sopVersions (eigener Block)
- Grund: Forward-reference Sicherheit, genauere Einhaltung der empfohlenen "sicheren" Option aus dem Plan
- Auswirkung: Keine — alle Constraints korrekt

**2. Drizzle-Push nicht ausfuehrbar (keine DB-Verbindung)**
- Task 2 kann nicht automatisch abgeschlossen werden
- Schema-Aenderungen sind vollstaendig in schema.ts — bei DB-Start sofort pushbar

## Known Stubs

Keine — alle Tabellen sind vollstaendig definiert ohne Placeholder-Werte.

## Self-Check: PARTIAL

- [x] src/lib/db/schema.ts enthaelt deliverableModules, deliverables, executionLogs
- [x] sopDocuments hat alle 7 neuen Felder (alle nullable)
- [x] sopSteps hat executor-Feld (nullable)
- [x] 6 neue Type-Exports vorhanden
- [x] TypeScript-Compiler sauber (schema.ts-bezogene Fehler: 0)
- [x] Commit 78bcfe6 existiert
- [ ] drizzle-kit push erfolgreich — DEFERRED (DB nicht erreichbar)

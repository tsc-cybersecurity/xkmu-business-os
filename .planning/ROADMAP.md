# Roadmap: xKMU Framework v2 Integration

## Overview

Dieser Meilenstein baut das Deliverable-Modul von Grund auf, erweitert das SOP-Schema, seedet alle 15 Module mit 63 Deliverables und 93 operativen SOPs, verknuepft SOPs bidirektional mit ihren Deliverables und zeigt Statistiken im Management-Dashboard. Die SOP-Deliverable-Kette wird das Rueckgrat der Beratungsautomatisierung.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: DB-Schema & Migrations** - Alle neuen und erweiterten Datenbanktabellen sowie gemeinsame Konstanten anlegen
- [ ] **Phase 2: Services & API-Routen** - Vollstaendiges Backend fuer Deliverables, SOP-Deliverable-Verknuepfung und Execution Logs
- [ ] **Phase 3: Seed-Daten** - Alle 15 Module, 63 Deliverables und 93 SOPs idempotent einspielen
- [ ] **Phase 4: UI — Deliverables & SOP-Erweiterung** - Deliverable-Listen-/Detailseiten, SOP-Detail-Erweiterungen, bidirektionale Navigation und Execution-Verlauf
- [ ] **Phase 5: Management Dashboard** - Deliverable-Statistiken und SOP-Maturity-Uebersicht auf der Management-Seite

## Phase Details

### Phase 1: DB-Schema & Migrations
**Goal**: Alle neuen und erweiterten Datenbanktabellen sowie gemeinsame TypeScript-Konstanten sind angelegt und migriert, sodass jede nachfolgende Phase darauf aufbauen kann.
**Depends on**: Nothing (first phase)
**Requirements**: DEL-01, DEL-02, ENUM-01, ENUM-02, ENUM-03, SOP-01, SOP-02, SOP-03, SOP-04, SOP-05, SOP-06, SOP-07, SOP-08, SOP-09, EXEC-01
**Success Criteria** (what must be TRUE):
  1. Tabellen `deliverables` und `deliverable_modules` existieren in der DB mit allen definierten Spalten und korrekten tenant_id-FKs
  2. Tabelle `execution_logs` existiert mit allen Spalten (entity_type, entity_id, started_at, executed_by, quality_score, cost_estimate_usd usw.)
  3. sopDocuments hat alle neuen Felder (automation_level, ai_capable, maturity_level, estimated_duration_minutes, produces_deliverable_id, subprocess, source_task_id) — alle nullable
  4. sopSteps hat das neue Feld `executor` (enum: agent, human, flex) — nullable
  5. TypeScript-Konstanten fuer categories, status_enum, automation_level_enum, executor_enum und severity_enum sind definiert und werden konsistent exportiert
**Plans**: 2 plans

Plans:
- [x] 01-01: Shared Enums & Konstanten — categories, status, automation_level, executor, severity als TypeScript-Konstanten und Drizzle-Enums
- [x] 01-02: Drizzle-Schema fuer deliverable_modules, deliverables, execution_logs + ALTER TABLE fuer sopDocuments/sopSteps + Migration generieren und ausfuehren

### Phase 2: Services & API-Routen
**Goal**: Vollstaendiges Backend fuer Deliverables, SOP-Deliverable-Verknuepfung und Execution Logs ist verfuegbar und aufrufbar.
**Depends on**: Phase 1
**Requirements**: DEL-03, DEL-04, DEL-05, LINK-01, LINK-02, LINK-03, EXEC-02, EXEC-03
**Success Criteria** (what must be TRUE):
  1. `GET /api/v1/deliverables` gibt paginierte Deliverable-Liste mit Filter nach Modul und Kategorie zurueck
  2. `GET /api/v1/deliverables/[id]` gibt Deliverable-Detail inklusive verknuepfter SOPs zurueck
  3. `GET /api/v1/deliverables/modules` gibt alle Module mit Deliverable-Count zurueck
  4. SOP-Detail-API gibt das verknuepfte Deliverable (via produces_deliverable_id) zurueck
  5. `GET /api/v1/execution-logs` gibt Ausfuehrungsprotokoll gefiltert nach entity_type/entity_id zurueck; `POST` legt neuen Eintrag an
**Plans**: 2 plans

Plans:
- [ ] 02-01: DeliverableService (CRUD, list/filter/pagination, getByModule) + API-Routen GET/POST /deliverables, GET/PATCH/DELETE /deliverables/[id], GET /deliverables/modules
- [ ] 02-02: ExecutionLogService (create, list by entity, getStats) + API-Routen GET/POST /execution-logs + SOP-Detail-API um produces_deliverable erweiternt

### Phase 3: Seed-Daten
**Goal**: Alle 15 Module, 63 Deliverables und 93 operative SOPs sind idempotent in der Datenbank vorhanden und korrekt miteinander verknuepft.
**Depends on**: Phase 2
**Requirements**: SEED-01, SEED-02, SEED-03, SSEED-01, SSEED-02, SSEED-03
**Success Criteria** (what must be TRUE):
  1. `GET /api/v1/deliverables/modules` liefert genau 15 Module (A1-A5, B1-B5, C1-C3, D1-D3)
  2. `GET /api/v1/deliverables` liefert genau 63 Deliverables mit korrekter Modul-Zuordnung
  3. SOPs-Endpoint liefert 93 operative SOPs (SOP-MK001 bis SOP-UP003) mit gesetztem source_task_id
  4. SOPs mit definiertem produces_deliverable haben einen gueltigen produces_deliverable_id-FK
  5. Seed-Skripte koennen mehrfach ausgefuehrt werden ohne Duplikate (check-before-insert)
**Plans**: 2 plans

Plans:
- [ ] 03-01: Deliverable-Seed — 15 Module aus xKMU_Deliverable_Katalog_v1 + 63 Deliverables mit Modul-Zuordnung, idempotent
- [ ] 03-02: SOP-Seed — 93 operative SOPs aus Framework v2 mit automation_level, ai_capable, maturity_level, executor, produces_deliverable_id wo definiert, idempotent by source_task_id

### Phase 4: UI — Deliverables & SOP-Erweiterung
**Goal**: Deliverable-Listen-/Detailseiten, erweiterte SOP-Detailseite und Execution-Verlauf sind fuer den Nutzer im Intern-Bereich erreichbar und navigierbar.
**Depends on**: Phase 3
**Requirements**: DEL-06, DEL-07, DEL-08, UI-01, UI-02, LINK-04, EXEC-04
**Success Criteria** (what must be TRUE):
  1. Nutzer kann unter /intern/management/deliverables eine gefilterte Deliverable-Liste nach Modul und Kategorie anzeigen
  2. Nutzer kann ein Deliverable-Detail aufrufen und sieht dort die verknuepften SOPs mit Direktlink
  3. Sidebar-Navigation zeigt "Deliverables" als Eintrag unter Management
  4. SOP-Detailseite zeigt Maturity-Badge, Automation-Level, Dauer, Executor und das verknuepfte Deliverable mit Direktlink
  5. SOP-Listenseite erlaubt Filter nach automation_level und maturity_level
  6. Ausfuehrungshistorie (Execution Log) ist auf SOP- und Deliverable-Detailseiten sichtbar
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 04-01: Deliverable-Listenseite mit Modul-/Kategorie-Filter + Sidebar-Navigationseintrag
- [ ] 04-02: Deliverable-Detailseite mit verknuepften SOPs + SOP-Detailseite mit neuen Feldern und Deliverable-Link (bidirektionale Navigation)
- [ ] 04-03: SOP-Listenseiten-Filter (automation_level, maturity_level) + Execution-Log-Anzeige auf Detail-Seiten

### Phase 5: Management Dashboard
**Goal**: Die Management-Uebersichtsseite zeigt Deliverable-Statistiken und SOP-Maturity-Verteilung, sodass der Stand des gesamten Frameworks auf einen Blick erkennbar ist.
**Depends on**: Phase 4
**Requirements**: UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Management-Seite zeigt Anzahl der Deliverables pro Modul und pro Kategorie
  2. Management-Seite zeigt SOP-Maturity-Verteilung als Balkendiagramm oder vergleichbare Visualisierung
  3. Beide Statistik-Bereiche aktualisieren sich korrekt wenn neue Seed-Daten eingespielt werden
**Plans**: 1 plan
**UI hint**: yes

Plans:
- [ ] 05-01: Management-Dashboard-Erweiterung — Deliverable-Statistiken (pro Modul/Kategorie) + SOP-Maturity-Balkendiagramm

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB-Schema & Migrations | 0/2 | Not started | - |
| 2. Services & API-Routen | 0/2 | Not started | - |
| 3. Seed-Daten | 0/2 | Not started | - |
| 4. UI — Deliverables & SOP-Erweiterung | 0/3 | Not started | - |
| 5. Management Dashboard | 0/1 | Not started | - |

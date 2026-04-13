# Requirements: xKMU Framework v2 Integration

**Defined:** 2026-04-13
**Core Value:** Jeder dokumentierte Prozess erzeugt ein definiertes Deliverable -- versioniert, mandantenfaehig und KI-generierbar.

## v1 Requirements

### Deliverable-Modul

- [ ] **DEL-01**: DB-Schema fuer deliverables (id, tenant_id, module_id, name, description, format, umfang, trigger, category, category_code, status, version, created_at, updated_at)
- [ ] **DEL-02**: DB-Schema fuer deliverable_modules (id, code, name, category, category_code, ziel, preis)
- [ ] **DEL-03**: Service-Schicht (DeliverableService) mit CRUD, list mit Filter/Pagination, getByModule
- [ ] **DEL-04**: API-Routen: GET/POST /api/v1/deliverables, GET/PATCH/DELETE /api/v1/deliverables/[id]
- [ ] **DEL-05**: API-Route: GET /api/v1/deliverables/modules (alle Module mit Deliverable-Count)
- [ ] **DEL-06**: UI Listenseite /intern/management/deliverables mit Filter nach Modul und Kategorie
- [ ] **DEL-07**: UI Detailseite /intern/management/deliverables/[id] mit verknuepften SOPs
- [ ] **DEL-08**: Sidebar-Navigation um Deliverables-Eintrag unter Management erweitern

### Deliverable-Seed

- [ ] **SEED-01**: Seed-Skript fuer alle 15 Module (A1-A5, B1-B5, C1-C3, D1-D3) aus xKMU_Deliverable_Katalog_v1
- [ ] **SEED-02**: Seed-Skript fuer alle 63 Deliverables mit korrekter Modul-Zuordnung
- [ ] **SEED-03**: Seeds muessen idempotent sein (check-before-insert)

### SOP-Schema-Erweiterung

- [ ] **SOP-01**: Feld automation_level (enum: manual, semi, full) an sopDocuments
- [ ] **SOP-02**: Feld ai_capable (boolean) an sopDocuments
- [ ] **SOP-03**: Feld maturity_level (integer 1-5) an sopDocuments
- [ ] **SOP-04**: Feld executor (enum: agent, human, flex) an sopSteps
- [ ] **SOP-05**: Feld estimated_duration_minutes (integer) an sopDocuments
- [ ] **SOP-06**: Feld produces_deliverable_id (FK -> deliverables) an sopDocuments
- [ ] **SOP-07**: Feld subprocess (varchar) an sopDocuments
- [ ] **SOP-08**: Feld source_task_id (varchar, z.B. KP1-01) an sopDocuments
- [ ] **SOP-09**: Alle neuen Felder nullable (Abwaertskompatibilitaet)

### SOP-Seed (93 Aufgaben)

- [ ] **SSEED-01**: Seed-Skript fuer alle 93 operativen SOPs aus Framework v2 (SOP-MK001 bis SOP-UP003)
- [ ] **SSEED-02**: Korrekte Zuordnung von produces_deliverable wo definiert
- [ ] **SSEED-03**: Seeds idempotent (by source_task_id oder sop_id check)

### SOP-Deliverable-Verknuepfung

- [ ] **LINK-01**: FK produces_deliverable_id in sopDocuments -> deliverables
- [ ] **LINK-02**: API gibt verknuepftes Deliverable bei SOP-Detail zurueck
- [ ] **LINK-03**: API gibt verknuepfte SOPs bei Deliverable-Detail zurueck
- [ ] **LINK-04**: UI zeigt bidirektionale Navigation (SOP -> Deliverable und umgekehrt)

### Execution Log

- [ ] **EXEC-01**: DB-Schema execution_logs (id, entity_type, entity_id, entity_version, started_at, completed_at, executed_by, status, abort_reason, quality_score, duration_minutes, cost_estimate_usd, linked_client_id, linked_project_id, human_approved, tenant_id)
- [ ] **EXEC-02**: Service-Schicht (ExecutionLogService) mit create, list (by entity), getStats
- [ ] **EXEC-03**: API-Routen: GET/POST /api/v1/execution-logs
- [ ] **EXEC-04**: UI-Anzeige der Ausfuehrungshistorie auf SOP- und Deliverable-Detailseiten

### Shared Enums & Kategorien

- [ ] **ENUM-01**: TypeScript-Konstanten fuer categories (V, M, IT, P, C, F, HR, Q mit Labels)
- [ ] **ENUM-02**: TypeScript-Konstanten fuer status_enum, automation_level_enum, executor_enum, severity_enum
- [ ] **ENUM-03**: Enums in Schema, Service und UI konsistent verwenden

### UI-Erweiterungen

- [ ] **UI-01**: SOP-Detailseite zeigt neue Felder (Maturity-Badge, Automation-Level, Duration, Executor, verknuepftes Deliverable)
- [ ] **UI-02**: SOP-Listenseite erhaelt Filter fuer automation_level und maturity_level
- [ ] **UI-03**: Management-Uebersichtsseite zeigt Deliverable-Statistiken (Anzahl pro Modul, Kategorie)
- [ ] **UI-04**: Management-Uebersichtsseite zeigt SOP-Maturity-Verteilung (Balkendiagramm o.ae.)

## v2 Requirements

### KI-Agent-Ausfuehrung

- **AGENT-01**: SOP-Schritte mit executor=agent koennen via n8n-Workflow automatisch ausgefuehrt werden
- **AGENT-02**: Agent-Config (persona, tools, constraints) als JSON in sopDocuments gespeichert
- **AGENT-03**: Ausfuehrungs-Dashboard mit Live-Status

### Mandanten-Deliverables

- **CDEL-01**: Deliverable-Instanzen pro Mandant/Projekt generieren (_output/)
- **CDEL-02**: PDF-Export fuer generierte Deliverables
- **CDEL-03**: Deliverable-Templates mit Platzhaltern

## Out of Scope

| Feature | Reason |
|---------|--------|
| KI-Agent-Ausfuehrung von SOPs | Erfordert n8n/Agent-Integration, separater Meilenstein |
| Mandanten-spezifische Deliverable-Generierung | Erst nach Basis-Modul stabil |
| Client-Modul aus Framework | Existiert bereits als contacts/companies |
| Workflow-Engine fuer SOP-Ketten | Geplant als separater Meilenstein |
| SOP-Template-System (full/minimal/agent) | v2 Feature, Basis-SOPs reichen |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEL-01, DEL-02 | Phase 1 | Pending |
| ENUM-01, ENUM-02, ENUM-03 | Phase 1 | Pending |
| SOP-01 bis SOP-09 | Phase 1 | Pending |
| EXEC-01 | Phase 1 | Pending |
| DEL-03, DEL-04, DEL-05 | Phase 2 | Pending |
| LINK-01, LINK-02, LINK-03 | Phase 2 | Pending |
| EXEC-02, EXEC-03 | Phase 2 | Pending |
| SEED-01, SEED-02, SEED-03 | Phase 3 | Pending |
| SSEED-01, SSEED-02, SSEED-03 | Phase 3 | Pending |
| DEL-06, DEL-07, DEL-08 | Phase 4 | Pending |
| UI-01, UI-02 | Phase 4 | Pending |
| LINK-04 | Phase 4 | Pending |
| EXEC-04 | Phase 4 | Pending |
| UI-03, UI-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition*

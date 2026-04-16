# Requirements: xKMU Tenant-Removal (v2)

**Defined:** 2026-04-16
**Core Value:** Ein Tenant, eine Instanz — Komplexitaet raus.

## v1 Requirements

### Datenkonsolidierung

- [ ] **DATA-01**: Pre-Migration-Backup der gesamten DB erstellen (pg_dump mit Timestamp)
- [ ] **DATA-02**: Kollisions-Analyse-Skript — listet Duplikate zwischen beiden Tenants (nach email, slug, code, source_task_id, name)
- [ ] **DATA-03**: Merge-Strategie pro Tabelle dokumentieren (welche Duplikate werden wie aufgeloest)
- [ ] **DATA-04**: Migration-SQL schreiben — UPDATE tenant_id fuer alle 67 Tabellen von default zu xkmu-digital-solutions, DELETE Duplikate
- [ ] **DATA-05**: Migration idempotent + mit SAVEPOINT fuer Rollback
- [ ] **DATA-06**: Default-Tenant-Row nach Migration loeschen (CASCADE alles was noch referenziert)
- [ ] **DATA-07**: Validation-Skript — prueft dass alle Daten im Ziel-Tenant sind und keine Waisen existieren

### Auth vereinfachen

- [ ] **AUTH-01**: Login-Route (src/app/api/v1/auth/login/route.ts) nicht mehr cross-tenant suchen — UserService.findByEmail() liefert User direkt
- [ ] **AUTH-02**: SessionUser.tenantId aus Session-JWT entfernt (breaking change fuer bestehende Sessions — Force-Logout)
- [ ] **AUTH-03**: AuthContext.tenantId durch statische Konstante TENANT_ID ersetzt (Uebergangsphase)
- [ ] **AUTH-04**: ApiKeyPayload.tenantId bleibt im Schema, wird aber ignoriert
- [ ] **AUTH-05**: Users-Tabelle behaelt tenantId-FK vorerst (fuer User-Organization-Zuordnung)

### Services entkoppeln (Batch 1 — Top 20)

- [ ] **SVC-01**: eos.service.ts (37 refs) — tenantId optional, intern ignoriert
- [ ] **SVC-02**: process.service.ts (36 refs)
- [ ] **SVC-03**: document.service.ts (32 refs)
- [ ] **SVC-04**: n8n.service.ts (31 refs)
- [ ] **SVC-05**: task-queue.service.ts (28 refs)
- [ ] **SVC-06**: lead.service.ts (27 refs)
- [ ] **SVC-07**: role.service.ts (26 refs)
- [ ] **SVC-08**: lead-pipeline.service.ts (24 refs)
- [ ] **SVC-09**: ai-provider.service.ts (24 refs)
- [ ] **SVC-10**: product.service.ts (23 refs)
- [ ] **SVC-11**: newsletter.service.ts (23 refs)
- [ ] **SVC-12**: company.service.ts (23 refs)
- [ ] **SVC-13**: project.service.ts (22 refs)
- [ ] **SVC-14**: okr.service.ts (22 refs)
- [ ] **SVC-15**: grundschutz-asset.service.ts (22 refs)
- [ ] **SVC-16**: time-entry.service.ts (21 refs)
- [ ] **SVC-17**: person.service.ts (21 refs)
- [ ] **SVC-18**: opportunity.service.ts (21 refs)
- [ ] **SVC-19**: ai-prompt-template.service.ts (21 refs)
- [ ] **SVC-20**: deliverable.service.ts, execution-log.service.ts, sop.service.ts — alle drei neu aus v1

### Services entkoppeln (Batch 2 — Rest 40)

- [ ] **SVC-21**: Alle restlichen 40 Services — batch-processing, da geringe Ref-Zahl
- [ ] **SVC-22**: Test/Validation — jede Service-Methode einmal aufgerufen ohne Fehler

### API-Routen bereinigen

- [ ] **API-01**: Alle 193 Routen: auth.tenantId entweder nicht mehr an Services geben oder via TENANT_ID-Konstante liefern
- [ ] **API-02**: Routen, die auth.tenantId direkt in Queries verwenden: umgestellt
- [ ] **API-03**: API-Keys: Routen pruefen ob tenantId aus Payload noch gefiltert wird
- [ ] **API-04**: Export/Import-Endpoints: Tenant-Filter entfernt

### UI anpassen

- [ ] **UI-01**: /intern/settings/tenant umbenennen in /intern/settings/organization (Route + Label)
- [ ] **UI-02**: Tenant-ID-Feld aus UI entfernt (war read-only)
- [ ] **UI-03**: Demo-Seed-Button weiter funktionsfaehig
- [ ] **UI-04**: Sidebar-Check — keine Tenant-Referenzen mehr
- [ ] **UI-05**: Login-UI unveraendert (Cross-Tenant-Suche fuer User war nicht sichtbar)

### Seeds konsolidieren

- [ ] **SEED-01**: seed-check.ts: Tenant-Loop (forEach tenants) entfernt, Seeds laufen einmal
- [ ] **SEED-02**: Seed-Services: tenantId-Parameter optional, intern nicht mehr verwendet
- [ ] **SEED-03**: Default-Tenant-Erstellung in seed.ts: bleibt nur xkmu-digital-solutions

### DB Hard Drop

- [ ] **DB-01**: SQL-Migration fuer DROP COLUMN tenant_id an allen 67 Tabellen
- [ ] **DB-02**: Indizes mit tenant_id entfernt (ca. 80+ Indizes)
- [ ] **DB-03**: Foreign-Key-Constraints zu tenants-Tabelle entfernt
- [ ] **DB-04**: Drizzle-Schema-Datei angepasst (schema.ts)
- [ ] **DB-05**: Whitelist aufgeloest: TENANT_TABLES + GLOBAL_TABLES → ALL_TABLES (flach)
- [ ] **DB-06**: Post-Migration-Validation — alle Services funktionieren, App startet
- [ ] **DB-07**: tenants-Tabelle bleibt fuer Organisation-Metadaten (Name, Adresse, Bank) — nicht geloescht

### Cross-Cutting

- [ ] **CC-01**: Build gruen — keine TypeScript-Fehler
- [ ] **CC-02**: App startet ohne Fehler nach Deploy
- [ ] **CC-03**: Kern-UI-Flows funktionieren (Login, Deliverables, SOPs, Management)
- [ ] **CC-04**: Dokumentation aktualisiert (CLAUDE.md if exists)

## v2 Requirements

### Optional / spaeter

- **OPT-01**: tenants-Tabelle umbenennen in organizations (kosmetisch)
- **OPT-02**: SessionUser.organizationId fuer zukuenftige Org-Level-Features (nicht Tenant)
- **OPT-03**: Analytics-Dashboard: frueher tenant-basiert, jetzt system-weit

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-Tenant-Support wiederherstellen | Bewusst verworfen, waere neue Architektur |
| Backup/Restore pro Tenant | Single-Tenant = einfaches DB-Backup reicht |
| Tenant-Switching-UI | Nicht mehr noetig |
| users.tenantId ganz entfernen | Bleibt fuer User-Org-Zuordnung |
| API-Key ohne tenantId neu ausstellen | Alte Keys bleiben gueltig, tenantId wird nur ignoriert |
| Tenants-Tabelle loeschen | Bleibt fuer xKMU-Metadaten (Name, Bank, Adresse) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 to DATA-07 | Phase 1 | Pending |
| AUTH-01 to AUTH-05 | Phase 2 | Pending |
| SVC-01 to SVC-20 | Phase 3 | Pending |
| SVC-21, SVC-22 | Phase 4 | Pending |
| API-01 to API-04 | Phase 5 | Pending |
| UI-01 to UI-05 | Phase 6 | Pending |
| SEED-01 to SEED-03 | Phase 6 | Pending |
| DB-01 to DB-07 | Phase 7 | Pending |
| CC-01 to CC-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-04-16*

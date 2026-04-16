# xKMU Business OS — Meilenstein v2: Tenant-Removal (Single-Tenant Umbau)

## What This Is

xKMU Business OS ist eine Next.js/Payload CMS-basierte Plattform fuer KMU-IT-Beratung. Sie umfasst CRM, DIN-Audits, Cybersecurity-Grundschutz, CMS, Marketing, Finanzen und ein Management-Framework (EOS/OKR/SOPs + Deliverables + Execution Logs). Die App ist aktuell multi-tenant, wird aber auf Single-Tenant umgebaut — nur `xkmu-digital-solutions` bleibt als operative Instanz.

## Core Value

**Ein Tenant, eine Instanz — Komplexitaet raus.** Alle Multi-Tenant-Abstraktionen (tenant_id in 67 Tabellen, Filter in 193 API-Routen, tenantId-Parameter in 60 Services) werden entfernt. Die App wird schlanker, schneller, einfacher zu warten.

## Requirements

### Validated

- ✓ EOS-Modul (VTO, Rocks, Scorecard, Issues, Meetings) — existing
- ✓ OKR-Modul (Cycles, Objectives, Key Results, Checkins) — existing
- ✓ SOP-Basis (Documents, Steps, Versions, PDF-Export) — existing
- ✓ Management-UI mit Split-Layout (SOPs + Deliverables) — v1
- ✓ Deliverable-Modul mit 16 Modulen, 70 Deliverables — v1
- ✓ 109 operative SOPs geseedet — v1
- ✓ Execution-Log-Schema + Service + API + Panel-Komponente — v1
- ✓ Auto-Migrations-System (entrypoint.prod.sh + instrumentation.ts) — v1
- ✓ API-Routen fuer SOPs, Deliverables, Execution Logs — v1

### Active

- [ ] **Datenkonsolidierung**: Alle Daten aus Tenant `default` (2ce4949e) in `xkmu-digital-solutions` (7b6c13c5) mergen, Duplikate dedupliziert
- [ ] **Auth vereinfachen**: Login nicht mehr cross-tenant, SessionUser.tenantId entfernt, AuthContext vereinfacht
- [ ] **Services entkoppeln**: tenantId-Parameter aus allen 60 Services entfernt, keine Tenant-Filter mehr
- [ ] **API-Routen bereinigen**: 193 Routen nutzen kein auth.tenantId mehr
- [ ] **UI anpassen**: Settings-Tenant-Seite zu "Organisation" umbenannt, kein Tenant-Konzept mehr in UI
- [ ] **DB Hard Drop**: tenant_id-Spalten entfernen aus 67 Tabellen, FK-Cascades weg, tenants-Tabelle nach settings umbauen
- [ ] **Whitelist aufraeumen**: TENANT_TABLES/GLOBAL_TABLES-Unterscheidung in table-whitelist.ts aufgeloest
- [ ] **Seeds konsolidieren**: Tenant-Loop aus seed-check.ts entfernt, Seeds laufen einmal

### Out of Scope

- Multi-Tenant-Wiederherstellung fuer die Zukunft — bewusst verworfen, spaeterer Ausbau als komplett neues Projekt
- Backup/Restore-System mit Tenant-Trennung — nicht mehr noetig
- API-Key-Tenant-Zuordnung bleibt als Feld, wird aber ignoriert (Kompatibilitaet alter Keys)
- Tenants-Tabelle ganz loeschen — bleibt vorerst als Organisation-Metadaten (Name, Adresse, Bank etc.)

## Context

- **Aktueller Zustand**: 2 Tenants in Produktion
  - `default` (2ce4949e-8017-4d26-9d60-66c3f4060673) — Seed-Daten, Framework v2 Beispieldaten
  - `xkmu-digital-solutions` (7b6c13c5-1800-47b2-a12f-10ccb11f6358) — echte Produktionsdaten, API-Key gehoert hier
- **Scope**: 67 Tabellen, 60 Services, 193 API-Routen, ~1500+ Zeilen Code-Aenderungen
- **Strategie**: Hybrid (erst Soft = ignorieren, dann Hard = entfernen) in einem Meilenstein
- **Vorheriger Meilenstein**: v1 Framework v2 Integration — abgeschlossen, archiviert unter `.planning/milestones/v1-framework-v2-integration/`
- **Tech-Stack**: Next.js 15, Drizzle ORM, PostgreSQL, Tailwind, shadcn/ui

## Constraints

- **Keine Downtime**: App laeuft auf `bos.dev.xkmu.de` — jeder Deploy muss funktionsfaehig sein
- **Backup-Pflicht**: Vor DB-Migrationen immer `pre-migration-backup` ziehen (Mechanismus existiert)
- **Reversibilitaet**: Soft-Removal muss reversibel sein (Tenant-Filter leicht wieder einschalten), Hard-Removal erst nach Stabilitaetsphase
- **Daten-Integritaet**: Keine Daten verlieren beim Merge — Duplikate nur bei eindeutigen Business-Keys (email, slug, code, source_task_id)
- **Email-Uniqueness**: Vor Consolidation: Email-Konflikte zwischen Tenants pruefen, dann per-User eindeutig
- **API-Kompatibilitaet**: Bestehende API-Keys muessen weiter funktionieren
- **Schrittweise**: Jede Phase muss deploybar und lauffaehig sein

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| xkmu-digital-solutions bleibt als einziger Tenant | Dort liegen Produktionsdaten + API-Key | -- Pending |
| Hybrid-Ansatz (Soft + Hard) in einem Meilenstein | Schrittweise Deploys, Rollback moeglich bis Phase 7 | -- Pending |
| tenants-Tabelle bleibt vorerst (als Organisation-Metadaten) | Name/Adresse/Bank der xKMU UG bleibt brauchbar | -- Pending |
| tenant_id-Merge via SQL-Migration mit Dedup-Logik | Code-basierte Migration waere zu langsam bei 67 Tabellen | -- Pending |
| Services-Refactoring in 2 Batches | Top-20 (risky) vor Rest-40 (trivial) | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions

**After milestone**:
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-16 after v2 milestone initialization*

# xKMU Business OS — Meilenstein: Framework v2 Integration

## What This Is

xKMU Business OS ist eine Next.js/Payload CMS-basierte Plattform fuer KMU-IT-Beratung. Sie umfasst CRM, DIN-Audits, Cybersecurity-Grundschutz, CMS, Marketing, Finanzen und ein Management-Framework (EOS/OKR/SOPs). Dieser Meilenstein integriert das xKMU AI Business Framework v2 vollstaendig — mit Deliverable-Katalog, erweitertem SOP-Modul (93 operative Aufgaben) und Execution-Logging.

## Core Value

Jeder dokumentierte Prozess erzeugt ein definiertes Deliverable — versioniert, mandantenfaehig und KI-generierbar. Die SOP-Deliverable-Kette ist das Rueckgrat der Beratungsautomatisierung.

## Requirements

### Validated

- ✓ EOS-Modul (VTO, Rocks, Scorecard, Issues, Meetings) — existing
- ✓ OKR-Modul (Cycles, Objectives, Key Results, Checkins) — existing
- ✓ SOP-Basis (Documents, Steps, Versions, PDF-Export) — existing
- ✓ Management-UI mit Sidebar-Navigation — existing
- ✓ Seed-Daten fuer EOS/OKR/Basis-SOPs — existing
- ✓ Multi-Tenant-Architektur mit Drizzle ORM — existing
- ✓ API-Routen fuer SOPs (CRUD, publish, steps, export) — existing

### Active

- [ ] **Deliverable-Modul**: DB-Schema (deliverables, deliverable_items), Service, API-Routen, UI-Seiten
- [ ] **Deliverable-Katalog seeden**: Alle 63 Deliverables aus xKMU_Deliverable_Katalog_v1 (Module A1-D3) als Seed-Daten
- [ ] **SOP-Schema erweitern**: Felder automation_level, ai_capable, maturity_level, executor, agent_config, produces_deliverable, estimated_duration_minutes, subprocess, source_task_id
- [ ] **93 operative SOPs seeden**: Alle KP1-KP7, MP, UP Aufgaben aus SOP_KI-Beratung_93_Aufgaben als Seed-Daten
- [ ] **SOP-Deliverable-Verknuepfung**: produces_deliverable FK, bidirektionale Navigation in UI
- [ ] **Execution Log**: Schema fuer Ausfuehrungsprotokoll (wer/wann/wie/Ergebnis/Kosten), Service + API
- [ ] **Shared Enums/Categories**: Kategorien (V, M, IT, P, C, F, HR, Q) + status/automation/executor Enums als DB-Referenz oder Konstanten
- [ ] **Deliverable-UI**: Listenseite, Detailseite, Filter nach Modul/Kategorie, Verknuepfung zu SOPs
- [ ] **SOP-UI erweitern**: Neue Felder in SOP-Detail anzeigen (Maturity, Automation, Duration, Executor, verknuepftes Deliverable)
- [ ] **Management-Dashboard erweitern**: Deliverable-Statistiken, SOP-Maturity-Uebersicht

### Out of Scope

- KI-Agent-Ausfuehrung von SOPs — spaeterer Meilenstein, erfordert n8n/Agent-Integration
- Mandanten-spezifische Deliverable-Generierung (_output/) — erst nach Basis-Modul
- Client-Modul (clients/ aus Framework) — existiert bereits als contacts/companies
- Workflow-Engine fuer SOP-Ketten — geplant als separater Meilenstein

## Context

- **Framework-Quelle**: `temp/xKMU_AI_Business_Framework_v2.json` — definiert Schemas, Enums, SOP-Katalog (93 Eintraege), Maturity-Modell, Directory-Struktur
- **Deliverable-Quelle**: `temp/xKMU_Deliverable_Katalog_v1 (1).json` — 63 Deliverables in 15 Modulen (A1-A5, B1-B5, C1-C3, D1-D3)
- **SOP-Quelle**: `temp/SOP_KI-Beratung_93_Aufgaben (2).docx` — 93 Aufgaben in 9 Prozessbereichen (KP1-KP7, MP, UP)
- **Bestehendes Schema**: `src/lib/db/schema.ts` — sopDocuments, sopSteps, sopVersions bereits vorhanden
- **Bestehende Services**: `src/lib/services/sop.service.ts`, `sop-pdf.service.ts`
- **Bestehende UI**: `src/app/intern/(dashboard)/management/sops/`, `eos/`, `okr/`
- **Tech-Stack**: Next.js 15, Drizzle ORM, PostgreSQL, Tailwind, shadcn/ui

## Constraints

- **Schema-Kompatibilitaet**: Neue Felder an sopDocuments muessen nullable sein (bestehende Daten nicht brechen)
- **Tenant-Isolation**: Alle neuen Tabellen brauchen tenant_id FK
- **Seed-Idempotenz**: Seeds muessen wiederholt ausfuehrbar sein ohne Duplikate
- **Naming**: Conventions aus bestehendem Code folgen (camelCase TS, snake_case DB)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deliverables als eigene Tabelle, nicht als JSON in SOPs | Eigenstaendige Entitaet mit eigener Versionierung, Suche und UI | -- Pending |
| SOP-Schema erweitern statt neue Tabelle | Bestehende sopDocuments haben bereits Grundstruktur, ALTER TABLE statt Neubau | -- Pending |
| Framework-Kategorien als Code-Konstanten, nicht als DB-Tabelle | Aendern sich selten, einfacher zu warten, kein Join noetig | -- Pending |
| Execution Log als eigene Tabelle | Trennung von Stammdaten (SOP/Deliverable) und Laufzeitdaten (Ausfuehrungen) | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*

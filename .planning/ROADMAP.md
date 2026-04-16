# Roadmap: xKMU Tenant-Removal (v2)

**Milestone:** v2 Single-Tenant Umbau
**Core Value:** Ein Tenant, eine Instanz — Komplexitaet raus.
**Total Phases:** 7

## Execution Order

Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Each phase must be deployable and functional before moving to the next. Soft-removal phases (2-6) are reversible. Hard-removal (phase 7) is final.

---

### Phase 1: Datenkonsolidierung
**Goal**: Alle Daten aus Tenant `default` in `xkmu-digital-solutions` gemerged, Duplikate bereinigt, Default-Tenant geloescht. Pre-Migration-Backup gesichert.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. Pre-Migration-Backup liegt vor und ist >100KB (Integritaets-Check)
  2. Kollisions-Analyse-Report existiert und wurde gereviewt
  3. SQL-Migration wurde erfolgreich ausgefuehrt — nur noch 1 Tenant in DB
  4. Alle Tabellen haben tenant_id = xkmu-digital-solutions (7b6c13c5)
  5. Keine Foreign-Key-Orphans vorhanden
**Plans**: 2 plans

Plans:
- [ ] 01-01: Kollisions-Analyse + Merge-Strategie-Dokument schreiben (dry-run)
- [ ] 01-02: Migration-SQL implementieren + ausfuehren + validieren

---

### Phase 2: Auth-Layer vereinfachen
**Goal**: Login-Flow, Session und AuthContext arbeiten nicht mehr mit cross-tenant Suche. TENANT_ID-Konstante als Uebergangsloesung eingefuehrt.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria**:
  1. Login sucht User direkt per Email (keine cross-tenant Iteration)
  2. SessionUser-Typ hat kein tenantId-Feld mehr (breaking change: Force-Logout erforderlich)
  3. AuthContext.tenantId liefert immer die eine xKMU-Tenant-ID
  4. Alte API-Keys mit tenantId funktionieren weiter (Feld wird ignoriert)
  5. App laeuft nach Deploy ohne Fehler, Login funktioniert
**Plans**: 1 plan

Plans:
- [ ] 02-01: Auth-Layer umbauen — login route, session.ts, auth-context.ts, require-permission.ts

---

### Phase 3: Services entkoppeln (Batch 1 — Top 20)
**Goal**: Die 20 Services mit den meisten tenantId-Referenzen arbeiten nicht mehr mit Tenant-Filterung. Services akzeptieren tenantId als optional (Rueckwaertskompat.) aber ignorieren es intern.
**Depends on**: Phase 2
**Requirements**: SVC-01, SVC-02, SVC-03, SVC-04, SVC-05, SVC-06, SVC-07, SVC-08, SVC-09, SVC-10, SVC-11, SVC-12, SVC-13, SVC-14, SVC-15, SVC-16, SVC-17, SVC-18, SVC-19, SVC-20
**Success Criteria**:
  1. Alle 20 Top-Services haben keine `eq(X.tenantId, tenantId)` Filter mehr in Queries
  2. Methoden-Signaturen: tenantId Parameter bleibt, aber optional
  3. Build bleibt gruen, Tests (falls vorhanden) laufen durch
  4. Smoke-Test: Kern-Features funktionieren nach Deploy (Leads, Companies, SOPs, Deliverables, OKR)
**Plans**: 3 plans

Plans:
- [ ] 03-01: CRM-Block (Leads, Companies, Persons, Opportunities, Products) — 5 Services
- [ ] 03-02: Management-Block (EOS, OKR, SOPs, Deliverables, ExecutionLog, Processes, Projects, Tasks) — 8 Services
- [ ] 03-03: Rest-Block (Documents, N8N, AI-Provider, AI-Prompt, Role, Newsletter, Time-Entry) — 7 Services

---

### Phase 4: Services entkoppeln (Batch 2 — Rest 40)
**Goal**: Die restlichen 40 Services (geringe Ref-Zahl) sind ebenfalls vom Tenant-Konzept entkoppelt.
**Depends on**: Phase 3
**Requirements**: SVC-21, SVC-22
**Success Criteria**:
  1. Alle 60 Services durchgearbeitet, keine Tenant-Filter mehr
  2. Cross-Service-Aufrufe weiterhin funktional
  3. App-weite Smoke-Tests gruen
**Plans**: 2 plans

Plans:
- [ ] 04-01: Compliance/Audit-Services (DIN, WiBA, Grundschutz, Activities, Audit-Log) — 20 Services
- [ ] 04-02: Marketing/Communication/Misc (Marketing, Social, Campaigns, Chat, Feedback, Cockpit, BI) — 20 Services

---

### Phase 5: API-Routen bereinigen
**Goal**: Alle 193 API-Routen uebergeben kein tenantId mehr an Services oder filtern nicht mehr direkt nach tenant. Einheitliches Handler-Pattern ohne Tenant-Kontext.
**Depends on**: Phase 4
**Requirements**: API-01, API-02, API-03, API-04
**Success Criteria**:
  1. `grep -r "auth.tenantId"` in src/app/api/v1/ liefert nur noch Stellen, die es explizit konstant verwenden
  2. Alle API-Routen ohne direkte tenantId-Query-Filter
  3. Export/Import-Endpunkte liefern vollstaendige Daten (kein Tenant-Filter)
  4. End-to-End-Test: CRUD fuer Haupt-Entitaeten funktioniert ueber API
**Plans**: 2 plans

Plans:
- [ ] 05-01: Routen-Cleanup Batch 1 (100 Routen — Kern-CRUD)
- [ ] 05-02: Routen-Cleanup Batch 2 (93 Routen — Rest + Export/Import)

---

### Phase 6: UI anpassen + Seeds konsolidieren
**Goal**: Settings-Seite umbenannt, Sidebar bereinigt, Seeds laufen nur einmal ohne Tenant-Loop.
**Depends on**: Phase 5
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, SEED-01, SEED-02, SEED-03
**Success Criteria**:
  1. /intern/settings/organization erreichbar (alte /tenant-Route redirected oder entfernt)
  2. UI zeigt nirgends tenant-ID oder Tenant-Konzept
  3. seed-check.ts: kein `for (tenant of allTenants)` Loop mehr
  4. Smoke-Test: Alle UI-Seiten laden fehlerfrei
**Plans**: 2 plans

Plans:
- [ ] 06-01: UI-Umbau — Settings-Route rename, Tenant-ID-Felder raus
- [ ] 06-02: Seed-Konsolidierung — Loops entfernt, Tenant-Erstellung vereinfacht

---

### Phase 7: DB Hard Drop
**Goal**: tenant_id-Spalten aus allen 67 Tabellen entfernt, FK-Cascades zu tenants-Tabelle weg, Schema-Datei aktualisiert. **IRREVERSIBEL — erst nach Stabilitaetsphase.**
**Depends on**: Phase 6 (+ 1 Woche Stabilitaetsphase empfohlen)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, CC-01, CC-02, CC-03, CC-04
**Success Criteria**:
  1. Pre-Migration-Backup erstellt (zweites, finales Backup)
  2. 67 `ALTER TABLE X DROP COLUMN tenant_id` erfolgreich
  3. Alle tenant_id-Indizes entfernt (~80+ Indizes)
  4. FK-Cascades zu tenants entfernt
  5. Drizzle-Schema synchronisiert (schema.ts hat keine tenantId-Felder mehr)
  6. Table-Whitelist aufgeloest — flache Liste
  7. tenants-Tabelle bleibt fuer Organisations-Metadaten (Name, Adresse, Bank)
  8. Build gruen, App laeuft, Kern-Flows funktionieren
  9. Dokumentation aktualisiert
**Plans**: 3 plans

Plans:
- [ ] 07-01: DB-Migration-SQL (DROP COLUMN + DROP INDEX + DROP FK) + Backup
- [ ] 07-02: Drizzle schema.ts bereinigen + table-whitelist vereinfachen
- [ ] 07-03: Deploy + Validation + Dokumentation

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Datenkonsolidierung | 0/2 | Not started | - |
| 2. Auth-Layer vereinfachen | 0/1 | Not started | - |
| 3. Services entkoppeln (Batch 1) | 0/3 | Not started | - |
| 4. Services entkoppeln (Batch 2) | 0/2 | Not started | - |
| 5. API-Routen bereinigen | 0/2 | Not started | - |
| 6. UI anpassen + Seeds | 0/2 | Not started | - |
| 7. DB Hard Drop | 0/3 | Not started | - |

**Total:** 15 plans across 7 phases

---

*Roadmap created: 2026-04-16*

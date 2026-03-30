# xKMU BusinessOS — Security & Quality Hardening

## What This Is

xKMU BusinessOS ist eine Multi-Tenant Business-Plattform fuer kleine und mittlere Unternehmen. Die App bietet CRM, Dokumentenmanagement, Cybersecurity-Compliance (BSI Grundschutz, DIN-Audits), Content-Management, KI-gestuezte Analysen, Projektmanagement und mehr — alles in einer deutschen UI. Deployed via Docker auf Hetzner.

## Core Value

Die Anwendung muss sicher und zuverlaessig sein — Multi-Tenant-Isolation, korrekte Authentifizierung/Autorisierung und keine Sicherheitsluecken, die Kundendaten gefaehrden koennten.

## Requirements

### Validated

Bestehende Funktionalitaet aus der Codebase-Analyse:

- ✓ Multi-Tenant-Architektur mit tenantId-Isolation — existing
- ✓ JWT-basierte Session-Auth mit RBAC — existing
- ✓ API-Key-Authentifizierung fuer externe Zugriffe — existing
- ✓ CRM-Modul (Leads, Companies, Persons, Opportunities) — existing
- ✓ Dokumentenmanagement mit KI-Analyse — existing
- ✓ CMS mit Block-basiertem Editor — existing
- ✓ Cybersecurity-Module (BSI Grundschutz, Basisabsicherung, IR Playbook) — existing
- ✓ KI-Provider-Abstraktion (Gemini, OpenAI, OpenRouter, Deepseek, Kimi, Ollama) — existing
- ✓ Email-Versand via SMTP — existing
- ✓ PDF/Excel-Export — existing
- ✓ Firecrawl Web-Scraping-Integration — existing
- ✓ Social Media Management — existing
- ✓ Projektmanagement mit Dev-Tasks — existing
- ✓ Dashboard/Cockpit mit KPIs — existing
- ✓ Unit-Tests fuer 19 Services, 17 Validierungen — existing
- ✓ Docker-basiertes Deployment — existing

### Active

- [ ] Security-Haertung (SQL Injection, CORS, Security Headers, CSRF, HTML-Sanitizer)
- [ ] API-Key Permission-Scoping (granulare Berechtigungen statt Full-Access)
- [ ] Auth-Konsolidierung (14 duplizierte getAuthContext auf shared Auth migrieren)
- [ ] Next.js Middleware fuer zentralisierte Auth und Security
- [ ] Hardcoded Credentials entfernen
- [ ] Test-Abdeckung fuer kritische Services erhoehen (Auth, Tenant, Email, API-Key)
- [ ] Integration-Tests fuer Kernflows
- [ ] Code-Qualitaet verbessern (`as any` beseitigen, Error Handling, Silent Swallowing)
- [ ] Grosse Komponenten aufteilen (7 Dateien mit 600-1100+ Zeilen)
- [ ] N+1 Query-Patterns in Services beheben
- [ ] Rate Limiter auf Redis migrieren

### Out of Scope

- Neue Features / Module — Fokus liegt auf Haertung, nicht Erweiterung
- Schema-Aufteilung (schema.ts) — funktioniert, geringes Risiko, hoher Aufwand
- E2E-Tests (Playwright/Cypress) — zu gross fuer diesen Milestone, spaeter
- Session Refresh/Rotation — wichtig, aber eigener Milestone
- Mobile App — nicht relevant fuer Haertung

## Context

- **Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, TypeScript 5.9
- **Deployment:** Docker auf Hetzner (195.201.12.250), Portainer
- **DB:** 70+ Tabellen, 2551 Zeilen Schema in einer Datei
- **API:** 215 Routes unter `/api/v1/`
- **Services:** 70 Service-Dateien, 19 getestet
- **Codebase-Analyse:** `.planning/codebase/` (7 Dokumente, 2026-03-30)
- **Bekannte Sicherheitsprobleme:** SQL Injection im DB-Import, API-Key Bypass, Wildcard CORS, fehlende Security Headers, hardcoded Credentials, kein CSRF, kein HTML-Sanitizer
- **Bekannte Code-Schulden:** 14x duplizierte Auth, 42x `as any`, stille Error-Swallowing in AI-Services, N+1 Queries

## Constraints

- **Tech Stack**: Bestehender Stack beibehalten (Next.js, Drizzle, PostgreSQL) — kein Rewrite
- **Abwaertskompatibilitaet**: Bestehende API-Endpunkte duerfen nicht brechen
- **Deployment**: Docker-only, keine Cloud-Services
- **Sprache**: Deutsche UI, englischer Code

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Security zuerst, dann Code-Qualitaet | Sicherheitsluecken sind das groesste Risiko fuer Kundendaten | — Pending |
| Auth-Konsolidierung vor neuen Features | 14 inkonsistente Auth-Implementierungen sind ein Sicherheitsrisiko | — Pending |
| Redis fuer Rate Limiting nutzen | Redis ist bereits im Docker-Compose vorhanden, wird aber nicht genutzt | — Pending |
| Keine Schema-Aufteilung in diesem Milestone | Funktioniert, geringes Risiko, hoher Aufwand fuer wenig Gewinn | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*

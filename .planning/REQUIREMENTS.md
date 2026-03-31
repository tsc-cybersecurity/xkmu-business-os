# Requirements — xKMU BusinessOS Security & Quality Hardening

## Milestone: v1.4.0 — Security & Quality Hardening

**Goal:** Alle bekannten Sicherheitsluecken schliessen, Auth-Logik konsolidieren, Test-Abdeckung erhoehen und Code-Qualitaet verbessern.

---

## R1: Security Hardening

### R1.1: SQL Injection Fix
- **Was:** `sql.raw()` im DB-Import-Route durch parametrisierte Queries ersetzen
- **Wo:** `src/app/api/v1/import/database/route.ts`
- **Akzeptanzkriterien:**
  - Kein `sql.raw()` mit User-Input im gesamten Codebase
  - Import-Funktion arbeitet weiterhin korrekt
  - tenantId kommt aus Auth-Context, nicht aus Import-Daten
- **Prioritaet:** P0 — aktive Sicherheitsluecke

### R1.2: CORS Allowlist
- **Was:** Wildcard `Access-Control-Allow-Origin: *` durch explizite Allowlist ersetzen
- **Wo:** `next.config.ts:30-36`
- **Akzeptanzkriterien:**
  - Origins aus Umgebungsvariable (`ALLOWED_ORIGINS`)
  - Nur konfigurierte Origins werden zugelassen
  - Kein Origin-Reflection (Pitfall!)
  - Preflight-Requests funktionieren
- **Prioritaet:** P0

### R1.3: Security Headers
- **Was:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Wo:** `middleware.ts` (neu) oder `next.config.ts`
- **Akzeptanzkriterien:**
  - CSP mit Nonces fuer Inline-Scripts (Next.js App Router kompatibel)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Alle Headers im Production Docker Build verifiziert
  - CSP report-only Modus fuer erste Deployment-Phase
- **Prioritaet:** P1

### R1.4: HTML Sanitizer
- **Was:** `isomorphic-dompurify` fuer Markdown-Renderer, Email-Templates, CMS-Output
- **Wo:** Alle Stellen die User-HTML rendern oder in Emails einbetten
- **Akzeptanzkriterien:**
  - Kein unsanitized HTML in der Ausgabe
  - SSR-kompatibel (isomorphic, nicht nur client-side)
  - Bestehende Markdown-Formatierung bleibt erhalten
- **Prioritaet:** P1

### R1.5: Credentials Cleanup
- **Was:** Hardcoded Credentials und Docker-Compose Default-Secrets entfernen
- **Wo:** `seed-check.ts`, `seed.ts`, `docker-compose.local.yml`
- **Akzeptanzkriterien:**
  - Keine Passwörter/Secrets im Source Code
  - Alle Secrets ueber Umgebungsvariablen
  - Docker-Compose nutzt `.env` oder Docker Secrets
  - Seed-Scripts nutzen Env-Vars mit sicheren Defaults
- **Prioritaet:** P0

---

## R2: Auth & Permissions

### R2.1: Auth-Konsolidierung
- **Was:** 14 duplizierte `getAuthContext()` Implementierungen durch zentrale `withPermission()` ersetzen
- **Wo:** 14 API-Routes (siehe CONCERNS.md)
- **Akzeptanzkriterien:**
  - 0 Ergebnisse bei `grep -rn "async function getAuthContext" src/app/api/`
  - Alle betroffenen Routes nutzen `withPermission()`
  - Atomare Migration (nicht inkrementell — alle 14 auf einmal)
  - Keine Funktionalitaetsverluste (vorher Audit der 14 Kopien)
  - Bestehende Tests passen weiterhin
- **Prioritaet:** P0 — Voraussetzung fuer R2.2, R2.3, R2.4

### R2.2: Next.js Middleware
- **Was:** Zentralisierte `middleware.ts` fuer Auth-Check, Security Headers, CORS
- **Wo:** `src/middleware.ts` (neu)
- **Akzeptanzkriterien:**
  - Fast-Path Rejection fuer unauthentifizierte Requests
  - Security Headers werden gesetzt
  - CORS-Allowlist wird geprueft
  - `withPermission()` bleibt als Defense-in-Depth (CVE-2025-29927)
  - Middleware-Bypass-Test vorhanden
  - Statische Assets und Public-Routes ausgenommen
- **Prioritaet:** P1 — nach R2.1

### R2.3: API-Key Scoping
- **Was:** Granulare `module:action` Berechtigungen fuer API-Keys statt Full-Access
- **Wo:** `require-permission.ts`, API-Key-Verwaltung, DB-Migration
- **Akzeptanzkriterien:**
  - Schema-Migration: `permissions` Spalte mit `module:action` Format
  - Bestehende Keys erhalten `scope: '*'` (Backward Compatibility!)
  - Admin-UI zum Setzen von Scopes
  - `withPermission()` prueft API-Key-Scopes
  - Reihenfolge: Schema → UI → Enforcement (Pitfall!)
- **Prioritaet:** P1 — nach R2.1

### R2.4: CSRF-Schutz
- **Was:** CSRF-Protection fuer alle REST-Routes via `@edge-csrf/nextjs`
- **Wo:** `middleware.ts`
- **Akzeptanzkriterien:**
  - Double-Submit Cookie Pattern
  - Alle mutierenden Requests (POST/PUT/DELETE) geschuetzt
  - API-Key-Requests von CSRF ausgenommen (Machine-to-Machine)
  - CSRF-Token in Frontend verfuegbar
- **Prioritaet:** P1 — nach R2.2

---

## R3: Reliability

### R3.1: Redis Rate Limiting
- **Was:** In-Memory Rate Limiter auf Redis migrieren
- **Wo:** `src/lib/utils/rate-limit.ts`
- **Akzeptanzkriterien:**
  - Redis INCR/EXPIRE via `ioredis`
  - Fail-open Design (wenn Redis down, Requests durchlassen)
  - Container-Restart verliert kein State
  - Bestehende Rate-Limit-Config kompatibel
- **Prioritaet:** P2

### R3.2: Error Handling
- **Was:** Silent Error Swallowing in AI-Services und anderen Stellen beheben
- **Wo:** 9+ Stellen laut CONCERNS.md
- **Akzeptanzkriterien:**
  - Kein `catch {}` oder `catch { /* ignore */ }` mehr
  - Errors werden geloggt (mindestens console.error → strukturiertes Logging)
  - User erhaelt Fehlermeldung statt stiller Fehler
  - AI-Provider-Fehler werden sichtbar
- **Prioritaet:** P2

### R3.3: Test-Abdeckung Kritische Services
- **Was:** Tests fuer Auth, Tenant, Email, API-Key Services
- **Wo:** `src/lib/services/auth/`, `src/lib/services/tenant/`, `src/lib/services/email/`, `src/lib/services/api-key/`
- **Akzeptanzkriterien:**
  - Mindestens 80% Coverage fuer diese 4 Service-Bereiche
  - Integration-Tests die echte DB-Queries testen (keine Mocks fuer DB!)
  - Tenant-Isolation getestet (Cross-Tenant-Zugriff schlaegt fehl)
  - API-Key-Scoping getestet
- **Prioritaet:** P2

### R3.4: Integration-Tests Kernflows
- **Was:** Integration-Tests fuer Auth-Flow, CRUD-Operationen, Multi-Tenant-Isolation
- **Wo:** Neue Test-Dateien
- **Akzeptanzkriterien:**
  - Login-Flow getestet
  - CRUD fuer mindestens 3 Module getestet
  - Tenant-Isolation-Tests (Tenant A kann Tenant B Daten nicht sehen)
- **Prioritaet:** P2

---

## R4: Code Quality

### R4.1: TypeScript Strictness
- **Was:** 42 `as any` Casts durch korrekte Typen ersetzen
- **Wo:** v.a. CMS-Block-Renderer, diverse Services
- **Akzeptanzkriterien:**
  - 0 Ergebnisse bei `grep -rn "as any" src/` (oder dokumentierte Ausnahmen)
  - Keine neuen TypeScript-Errors
  - `tsc --noEmit` und `npx next build` erfolgreich
- **Prioritaet:** P3

### R4.2: N+1 Query Fixes
- **Was:** Sequentielle DB-Queries in Loops durch Batch-Queries ersetzen
- **Wo:** 8+ Services laut CONCERNS.md
- **Akzeptanzkriterien:**
  - Keine `await` in `for`/`forEach`/`map` Loops fuer DB-Queries
  - Batch-Queries oder Joins stattdessen
  - Performance-Verbesserung messbar
- **Prioritaet:** P3

### R4.3: Komponenten-Splitting
- **Was:** 7 grosse Page-Komponenten (600-1100+ Zeilen) aufteilen
- **Wo:** Siehe CONCERNS.md
- **Akzeptanzkriterien:**
  - Keine Komponente > 400 Zeilen
  - Klare Aufteilung in Sub-Komponenten
  - Keine Funktionalitaetsverluste
  - Build erfolgreich
- **Prioritaet:** P3

---

## Dependencies

```
R2.1 (Auth-Konsolidierung)
  ├→ R2.2 (Middleware) → R2.4 (CSRF)
  └→ R2.3 (API-Key Scoping)

R1.* (Security) — unabhaengig voneinander, parallel moeglich
R3.* (Reliability) — nach R2.* (Tests testen den gehärteten Code)
R4.* (Code Quality) — nach R3.* (aendert viel Code, Tests als Sicherheitsnetz)
```

## Out of Scope

- Session Refresh/Rotation — eigener Milestone
- E2E-Tests (Playwright/Cypress) — zu gross, spaeter
- Schema-Aufteilung — funktioniert, geringes Risiko
- Neue Features/Module — Fokus auf Haertung
- MFA — eigener Milestone

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| R2.1 Auth-Konsolidierung | Phase 1 | Pending |
| R1.1 SQL Injection Fix | Phase 1 | Complete (01-02) |
| R1.5 Credentials Cleanup | Phase 1 | Pending |
| R1.2 CORS Allowlist | Phase 2 | Pending |
| R1.3 Security Headers | Phase 2 | Pending |
| R2.2 Next.js Middleware | Phase 2 | Pending |
| R1.4 HTML Sanitizer | Phase 3 | Pending |
| R2.3 API-Key Scoping | Phase 3 | Pending |
| R2.4 CSRF-Schutz | Phase 3 | Pending |
| R3.1 Redis Rate Limiting | Phase 4 | Pending |
| R3.2 Error Handling | Phase 4 | Pending |
| R3.3 Test-Abdeckung Kritische Services | Phase 5 | Pending |
| R3.4 Integration-Tests Kernflows | Phase 5 | Pending |
| R4.1 TypeScript Strictness | Phase 6 | Pending |
| R4.2 N+1 Query Fixes | Phase 6 | Pending |
| R4.3 Komponenten-Splitting | Phase 6 | Pending |

---
*Erstellt: 2026-03-31 aus Research + Codebase-Analyse*
*Traceability hinzugefuegt: 2026-03-30 nach ROADMAP.md-Erstellung*

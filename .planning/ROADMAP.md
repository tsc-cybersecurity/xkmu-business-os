# Roadmap: xKMU BusinessOS — Security & Quality Hardening (v1.4.0)

## Overview

Dieses Milestone schliesst alle bekannten Sicherheitsluecken in einer produktiven
Multi-Tenant-Plattform. Der kritische Pfad beginnt mit Auth-Konsolidierung (R2.1) —
14 duplizierte `getAuthContext`-Kopien werden atomisch auf die zentrale `withPermission()`
migriert, bevor jede weitere Sicherheitsschicht daruber gebaut wird. Anschliessend
kommen Security Headers, CORS, HTML-Sanitizer und API-Key Scoping. Reliability
(Redis Rate Limiting, Error Handling) und Test-Abdeckung folgen sobald die gehaertete
Auth-Schicht als stabiles Fundament steht. Code-Qualitaet schliesst den Milestone ab.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Auth-Konsolidierung + P0 Security Fixes (SQL Injection, Credentials)
- [ ] **Phase 2: Security Layer** - Middleware + Security Headers + CORS
- [ ] **Phase 3: XSS & API Protection** - HTML Sanitizer + CSRF + API-Key Scoping
- [ ] **Phase 4: Reliability** - Redis Rate Limiting + Error Handling
- [ ] **Phase 5: Test Coverage** - Unit Tests + Integration Tests fuer kritische Services
- [ ] **Phase 6: Code Quality** - TypeScript Strictness + N+1 Fixes + Komponenten-Splitting

## Phase Details

### Phase 1: Foundation
**Goal**: Die Auth-Logik ist auf eine einzige kanonische Implementierung reduziert und alle P0-Sicherheitsluecken (SQL Injection, Hardcoded Credentials) sind geschlossen.
**Depends on**: Nothing (first phase)
**Requirements**: R2.1, R1.1, R1.5
**Success Criteria** (what must be TRUE):
  1. `grep -rn "async function getAuthContext" src/app/api/` gibt null Ergebnisse zurueck
  2. Alle 14 migrierten Routes geben 401 zurueck wenn eine ungueltige Session gesendet wird
  3. Der DB-Import-Route akzeptiert keinen `sql.raw()` User-Input mehr; ein Cross-Tenant-Import-Versuch wird abgelehnt
  4. Kein Passwort oder Secret ist hardcoded im Source Code; `docker-compose.local.yml` startet nicht ohne gesetzte Pflicht-Umgebungsvariablen
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Auth-Konsolidierung: alle 14 getAuthContext-Kopien atomar auf withPermission() migrieren
- [x] 01-02-PLAN.md — SQL Injection Fix: sql.raw() im DB-Import durch parametrisierte Queries ersetzen + Cross-Tenant-Test
- [x] 01-03-PLAN.md — Credentials Cleanup: Hardcoded Secrets aus Seed-Scripts und Docker Compose entfernen

### Phase 2: Security Layer
**Goal**: `src/proxy.ts` (Next.js 16 Nachfolger von middleware.ts) setzt Security Headers und erzwingt CORS via ALLOWED_ORIGINS Allowlist; alle API-Routes sind gegen Middleware-Bypass (CVE-2025-29927) durch beibehaltene `withPermission()`-Checks geschuetzt.
**Depends on**: Phase 1
**Requirements**: R2.2, R1.2, R1.3
**Success Criteria** (what must be TRUE):
  1. Ein Request mit `x-middleware-subrequest`-Header an 5 geschuetzte Routes gibt jeweils 401 zurueck
  2. `curl -I https://boss.xkmu.de` zeigt `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` und `Referrer-Policy` in der Antwort
  3. Ein Request mit `Origin: https://evil.com` erhaelt den Origin nicht als `Access-Control-Allow-Origin` zurueck
  4. Der Production-Docker-Build zeigt null CSP-Violations in der Browser-Konsole (Report-Only Mode)
  5. Statische Assets (`/_next/static/*`) werden nicht durch Proxy verlangsamt (matcher konfiguriert)
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Security Layer Implementation: CORS Wildcard entfernen + Security Headers (next.config.ts) + CVE-2025-29927 Defense + CORS Allowlist (src/proxy.ts) + Build-Verifikation
- [ ] 02-02-PLAN.md — Production Verification: curl-Checks gegen boss.xkmu.de (5 CVE-bypass-Routes) + Browser CSP-Violations Checkpoint

### Phase 3: XSS & API Protection
**Goal**: Alle User-HTML-Ausgaben sind durch `isomorphic-dompurify` gesaeubert, mutierenden REST-Requests sind per CSRF-Token geschuetzt und API-Keys haben granulare Modul-Berechtigungen statt Full-Access.
**Depends on**: Phase 2
**Requirements**: R1.4, R2.4, R2.3
**Success Criteria** (what must be TRUE):
  1. Jeder `dangerouslySetInnerHTML`-Aufruf im Codebase importiert den zentralen `sanitize.ts`-Wrapper
  2. Ein POST-Request ohne gueltigen CSRF-Token wird mit 403 abgelehnt; ein API-Key-Request (Machine-to-Machine) ist davon ausgenommen
  3. Bestehende API-Keys (z.B. n8n-Workflows) funktionieren nach der Schema-Migration weiterhin mit `scope: '*'`
  4. Ein API-Key mit `scope: 'leads:read'` erhaelt 403 wenn er auf `/api/v1/companies` zugreift
**Plans**: TBD

Plans:
- [ ] 03-01: HTML Sanitizer — `isomorphic-dompurify`-Wrapper erstellen und alle `dangerouslySetInnerHTML`-Stellen auditieren
- [ ] 03-02: API-Key Scoping — Schema-Migration (permissions-Spalte), `scope: '*'` fuer bestehende Keys, Admin-UI, `withPermission()`-Enforcement
- [ ] 03-03: CSRF-Schutz — `@edge-csrf/nextjs` in `proxy.ts` integrieren, API-Key-Requests ausnehmen, CSRF-Token im Frontend verfuegbar machen

### Phase 4: Reliability
**Goal**: Der Rate Limiter funktioniert ueber Container-Neustarts hinweg und alle Silent-Error-Swallowing-Stellen in AI-Services und anderen Bereichen geben strukturierte Fehler an den User weiter.
**Depends on**: Phase 3
**Requirements**: R3.1, R3.2
**Success Criteria** (what must be TRUE):
  1. Nach einem Container-Neustart gilt der Rate-Limit-Counter weiter; ein zweiter Container sieht denselben Zaehler
  2. Wenn Redis nicht erreichbar ist, werden Requests trotzdem durchgelassen (Fail-Open) und ein Warning geloggt
  3. Kein `catch {}` oder leerer `catch`-Block mehr im Codebase; AI-Provider-Fehler erscheinen als Fehlermeldung im UI statt als Stille
**Plans**: TBD

Plans:
- [ ] 04-01: Redis Rate Limiting — `rate-limit.ts` auf `ioredis` INCR/EXPIRE (Lua-Script) migrieren, Fail-Open implementieren
- [ ] 04-02: Error Handling — alle silent catch-Blocks in AI-Services und anderen Stellen durch strukturiertes Logging und User-Fehlermeldungen ersetzen

### Phase 5: Test Coverage
**Goal**: Auth-, Tenant-, Email- und API-Key-Services haben mindestens 80% Test-Abdeckung mit Integration Tests die echte DB-Queries ausfuehren; Tenant-Isolation ist durch Cross-Tenant-Tests verifiziert.
**Depends on**: Phase 4
**Requirements**: R3.3, R3.4
**Success Criteria** (what must be TRUE):
  1. `vitest --coverage` zeigt mindestens 80% Coverage fuer `src/lib/services/auth/`, `tenant/`, `email/`, `api-key/`
  2. Mindestens ein Integration Test pro Security-Service testet echte DB-Queries (keine vollstaendigen DB-Mocks)
  3. Ein Test verifiziert explizit dass Tenant A keine Daten von Tenant B lesen kann
  4. Login-Flow, CRUD fuer 3 Module und Permission-Checks sind durch Integration Tests abgedeckt
**Plans**: TBD

Plans:
- [ ] 05-01: Unit Tests fuer Auth, Tenant, Email, API-Key Services (Ziel: 80% Coverage)
- [ ] 05-02: Integration Tests — Login-Flow, Tenant-Isolation, CRUD fuer 3 Module, Permission-Checks mit echter Test-DB

### Phase 6: Code Quality
**Goal**: Alle kritischen `as any`-Casts sind durch korrekte TypeScript-Typen ersetzt, N+1-Query-Patterns in den 8+ betroffenen Services sind durch Batch-Queries geloest und keine Page-Komponente ueberschreitet 400 Zeilen.
**Depends on**: Phase 5
**Requirements**: R4.1, R4.2, R4.3
**Success Criteria** (what must be TRUE):
  1. `grep -rn "as any" src/` gibt null Ergebnisse oder nur dokumentierte Ausnahmen zurueck
  2. `npx next build` und `tsc --noEmit` laufen fehlerfrei durch
  3. Kein `await` in `for`/`forEach`/`map`-Loops fuer DB-Queries; Batch-Inserts oder Joins stattdessen
  4. Keine Komponente im `src/app/` Verzeichnis hat mehr als 400 Zeilen
**Plans**: TBD

Plans:
- [ ] 06-01: TypeScript Strictness — 42 `as any`-Casts durch korrekte Typen ersetzen (Prioritaet: CMS-Block-Renderer)
- [ ] 06-02: N+1 Query Fixes — DIN-Audit-Save, Sort-Order-Updates und weitere sequentielle DB-Loops durch Batch-Queries ersetzen
- [ ] 06-03: Komponenten-Splitting — 7 grosse Page-Komponenten (600-1100+ Zeilen) in Sub-Komponenten aufteilen (Prioritaet: cockpit.tsx)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In Progress|  |
| 2. Security Layer | 0/2 | Not started | - |
| 3. XSS & API Protection | 0/3 | Not started | - |
| 4. Reliability | 0/2 | Not started | - |
| 5. Test Coverage | 0/2 | Not started | - |
| 6. Code Quality | 0/3 | Not started | - |

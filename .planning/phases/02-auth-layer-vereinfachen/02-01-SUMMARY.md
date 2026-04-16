---
phase: 02-auth-layer-vereinfachen
plan: 01
subsystem: auth
tags: [auth, session, jwt, single-tenant, security]
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

dependency_graph:
  requires: [01-01]
  provides: [TENANT_ID-constant, single-tenant-auth, session-v2-force-logout]
  affects: [all-api-routes-using-auth-context, user-service, login-flow]

tech_stack:
  added: [src/lib/constants/tenant.ts]
  patterns: [hardcoded-TENANT_ID-as-transition, session-versioning-for-force-logout]

key_files:
  created:
    - src/lib/constants/tenant.ts
    - src/__tests__/unit/auth/auth-context.test.ts
  modified:
    - src/lib/types/auth.types.ts
    - src/lib/auth/session.ts
    - src/lib/auth/auth-context.ts
    - src/lib/services/user.service.ts
    - src/app/api/v1/auth/login/route.ts
    - src/app/api/v1/auth/change-password/route.ts
    - src/app/api/v1/auth/register/route.ts
    - src/app/api/v1/dashboard/route.ts
    - src/__tests__/integration/api/auth.route.test.ts
    - src/__tests__/unit/services/user.service.test.ts

decisions:
  - "TENANT_ID als const-Assertion exportiert ('7b6c13c5-...' as const) — Typsicherheit ohne Laufzeit-Overhead"
  - "Session v:2 als Literal-Type in Interface — TypeScript erzwingt korrekte Initialisierung"
  - "getByEmail(tenantId, ...) und andere tenantId-parametrisierten UserService-Methoden bleiben unveraendert bis Phase 3"
  - "register/route.ts behaelt tenant.id fuer DB-Einfuegung, aber SessionUser-Shape ohne tenantId"
  - "dashboard/route.ts nutzt TENANT_ID statt session.user.tenantId — Uebergangsphase bis Phase 7"

metrics:
  duration: "~25 min"
  completed: "2026-04-13"
  tasks_completed: 2
  files_changed: 11
---

# Phase 02 Plan 01: Auth-Layer vereinfachen — Summary

**One-liner:** JWT-Session auf v:2 versioniert, SessionUser.tenantId entfernt, TENANT_ID-Konstante als Single-Tenant-Uebergang, UserService.authenticate() ohne tenantId-Parameter.

## Was wurde gebaut

### Task 1: Konstante + Typen (97d2928)

**`src/lib/constants/tenant.ts` (neu)**
```typescript
export const TENANT_ID = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' as const
```
Einzige Quelle der Wahrheit fuer die xKMU-Tenant-ID bis Phase 7 (DB Hard Drop).

**`src/lib/types/auth.types.ts`**
- `SessionUser.tenantId` entfernt (AUTH-02) — JWT traegt keine Tenant-ID mehr
- `Session.v: 2` als Literal-Type hinzugefuegt — erzwingt Versions-Check
- `ApiKeyPayload.tenantId` unveraendert (AUTH-04) — Rueckwaertskompatibilitaet

**`src/lib/auth/session.ts`**
- `createSession()`: schreibt `v: 2` in JWT-Payload
- `getSession()`: prueft `session.v !== 2` vor Expiry-Check — gibt `null` bei fehlender oder falscher Version zurueck

### Task 2: Services + Routes + Tests (3da71cb)

**`src/lib/services/user.service.ts`**
- `authenticate(tenantId, email, password)` → `authenticate(email, password)` (AUTH-01)
- Intern: `getByEmail(tenantId, ...)` → `findByEmail(email)` (keine Tenant-Filterung)
- SessionUser-Rueckgabe ohne `tenantId`-Feld

**`src/lib/auth/auth-context.ts`**
- Session-Zweig: `tenantId: session.user.tenantId` → `tenantId: TENANT_ID` (AUTH-03)
- API-Key-Zweig: `tenantId: payload.tenantId` → `tenantId: TENANT_ID` (AUTH-04: payload.tenantId ignoriert)

**`src/app/api/v1/auth/login/route.ts`**
- Entfernt: `findByEmail(email)` Vorschritt + `authenticate(user.tenantId, email, password)`
- Ersetzt durch: `authenticate(email, password)` direkt (AUTH-01)

**Weitere Route-Fixes (Rule 2 — fehlende Anpassungen):**
- `change-password/route.ts`: `session.user.tenantId` → `TENANT_ID`
- `register/route.ts`: `SessionUser`-Literal ohne `tenantId`-Feld
- `dashboard/route.ts`: `session.user.tenantId` → `TENANT_ID`

**Tests:**
- `auth-context.test.ts` (neu): prueft TENANT_ID-Fluss in Session- und API-Key-Zweig
- `auth.route.test.ts`: `sessionUser` ohne `tenantId`, Login-Mocks ohne `findByEmail`
- `user.service.test.ts`: `authenticate()`-Aufrufe ohne `tenantId`-Parameter

## Force-Logout-Mechanismus

Alte JWT-Sessions (ohne `v: 2`) werden von `getSession()` mit `null` abgewiesen. Der Browser wird beim naechsten Request zur Login-Seite umgeleitet.

```
Request → getSession() → jwtVerify() → payload.v !== 2 → return null → 401/Redirect
```

Neue Sessions (nach Login) tragen `v: 2` im Payload und werden akzeptiert.

## Verifikationsergebnisse

```bash
# Kein session.user.tenantId in auth-Layer
grep -rn "session.user.tenantId" src/lib/auth/
# => NONE - OK

# tenantId nur in ApiKeyPayload
grep -n "tenantId" src/lib/types/auth.types.ts
# => Zeile 6: Kommentar, Zeile 32: ApiKeyPayload.tenantId (korrekt)

# TypeScript-Fehler nur pre-existing (blog-post, cms-navigation, auth-flow-integration-real)
npx tsc --noEmit 2>&1 | grep -E "auth|session|tenant|user\.service"
# => Nur auth-flow.test.ts mit falschem Modulpfad (pre-existing, out of scope)

# Tests
npx vitest run src/__tests__/unit/auth/ src/__tests__/integration/api/auth.route.test.ts src/__tests__/unit/services/user.service.test.ts
# => 5 Test Files, 69 Tests — alle gruen
```

## Abgedeckte Requirements

| Requirement | Status | Details |
|-------------|--------|---------|
| AUTH-01 | Erledigt | Login findet User direkt per Email — kein cross-tenant Iterieren |
| AUTH-02 | Erledigt | SessionUser.tenantId entfernt — JWT traegt keine Tenant-ID |
| AUTH-03 | Erledigt | getAuthContext() liefert immer TENANT_ID-Konstante |
| AUTH-04 | Erledigt | API-Key-Payload.tenantId bleibt, wird aber ignoriert — TENANT_ID stattdessen |
| AUTH-05 | Erledigt | users-Tabelle tenantId-FK unveraendert — nur JWT-Shape geaendert |

## Offene Punkte fuer Phase 3 (Services-Batch)

Die folgenden UserService-Methoden tragen noch `tenantId`-Parameter — werden in Phase 3 entfernt:
- `getByEmail(tenantId, email)` — wird von `authenticate()` nicht mehr genutzt, aber von anderen Stellen
- `getById(tenantId, userId)` — genutzt von change-password, users-Admin-Route
- `create(tenantId, data)` — genutzt von register-Route (behaelt tenantId fuer DB-FK)
- `update(tenantId, userId, data)`, `updatePassword(tenantId, userId, ...)`, `delete(tenantId, userId)`
- `list(tenantId, filters)`, `emailExists(tenantId, email)`

Diese Methoden sind in Task 2 bewusst unveraendert geblieben (kritische-Fakten-Vorgabe).

## Commits

| Hash | Beschreibung |
|------|-------------|
| 97d2928 | feat(02-01): add TENANT_ID constant, remove SessionUser.tenantId, add Session v:2 force-logout |
| 3da71cb | feat(02-01): wire TENANT_ID through services, routes, and tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] change-password/route.ts und dashboard/route.ts — session.user.tenantId**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** `session.user.tenantId` wurde in change-password/route.ts (2x) und dashboard/route.ts (1x) genutzt — nach SessionUser-Aenderung TS-Fehler
- **Fix:** TENANT_ID-Import hinzugefuegt, session.user.tenantId durch TENANT_ID ersetzt
- **Files modified:** src/app/api/v1/auth/change-password/route.ts, src/app/api/v1/dashboard/route.ts
- **Commit:** 3da71cb

**2. [Rule 2 - Missing] register/route.ts — SessionUser-Literal mit tenantId**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** SessionUser-Objekt in register/route.ts hatte `tenantId: tenant.id` — nach Interface-Aenderung TS-Fehler
- **Fix:** tenantId-Feld aus SessionUser-Literal entfernt (tenant.id bleibt fuer DB-create-Aufruf erhalten)
- **Files modified:** src/app/api/v1/auth/register/route.ts
- **Commit:** 3da71cb

## Self-Check: PASSED

- [x] src/lib/constants/tenant.ts — FOUND
- [x] src/lib/types/auth.types.ts — FOUND (SessionUser ohne tenantId, Session mit v:2)
- [x] src/lib/auth/session.ts — FOUND (v:2 in createSession, v-Check in getSession)
- [x] src/lib/auth/auth-context.ts — FOUND (TENANT_ID in beiden Zweigen)
- [x] src/lib/services/user.service.ts — FOUND (authenticate ohne tenantId)
- [x] src/app/api/v1/auth/login/route.ts — FOUND (direkter authenticate-Aufruf)
- [x] src/__tests__/unit/auth/auth-context.test.ts — FOUND (neu, 3 Tests)
- [x] Commit 97d2928 — FOUND
- [x] Commit 3da71cb — FOUND
- [x] 69 Tests gruen — PASSED

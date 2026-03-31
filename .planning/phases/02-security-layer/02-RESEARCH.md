# Phase 2: Security Layer - Research

**Researched:** 2026-03-30
**Domain:** Next.js 16 Middleware (proxy.ts), Security Headers, CORS, CSP
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R2.2 | Zentralisierte `middleware.ts` (jetzt `proxy.ts` in Next.js 16) fuer Auth Fast-Path, Security Headers, CORS — CVE-2025-29927-Defense durch beibehaltene `withPermission()`-Checks | `proxy.ts` Dateikonvention verifiziert; CVE-Defense-Muster dokumentiert; Auth Fast-Path Muster verfuegbar |
| R1.2 | Wildcard `Access-Control-Allow-Origin: *` durch explizite `ALLOWED_ORIGINS` Env-Var ersetzen; kein Origin-Reflection; Preflight-Requests funktionieren | Offizielles CORS-Muster aus Next.js 16 Docs; Allowlist-Pattern dokumentiert; Preflight OPTIONS Handling verifiziert |
| R1.3 | CSP (Report-Only), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy — alle im Production Docker Build verifiziert | CSP-Strategie fuer Next.js 16 + Tailwind CSS 4 dokumentiert; alle Header-Muster aus offiziellen Docs; Docker-Verifikation in Pitfalls |

</phase_requirements>

---

## Summary

Phase 2 baut die zentrale Security-Schicht auf dem Auth-Fundament aus Phase 1 auf. Die drei Aufgaben sind: (1) CORS-Allowlist statt Wildcard in `next.config.ts`, (2) Security Headers in `next.config.ts` plus CSP-Grundlage, (3) neue `proxy.ts` Datei (in Next.js 16 umbenannt von `middleware.ts`) fuer CVE-2025-29927-Defense, Auth Fast-Path und CORS-Preflight-Handling in Middleware.

**Kritische Erkenntnis aus Research:** In Next.js 16.1.6 ist `middleware.ts` deprecated und in `proxy.ts` umbenannt. Das bestehende Research-Archiv referenziert noch `middleware.ts` — der Plan muss `proxy.ts` verwenden, behaelt aber identische Semantik (gleiche API, gleiche Position im Dateisystem). Eine Migration per Codemod ist verfuegbar: `npx @next/codemod@canary middleware-to-proxy .`

**CSP-Strategie:** Tailwind CSS 4 kompiliert seine Styles in eine externe CSS-Datei beim Build (kein CSS-in-JS Runtime). Im Production-Build ist `unsafe-inline` fuer `style-src` NICHT benoetigt. In Entwicklung (`next dev`) injiziert Tailwind Hot-Reload-Styles inline — deshalb braucht die Entwicklungsumgebung `unsafe-inline`, Produktion nicht. CSP startet im `Content-Security-Policy-Report-Only` Modus und wird erst nach Verifikation am Docker-Build auf Enforcement umgeschaltet.

**Primary recommendation:** `proxy.ts` (nicht `middleware.ts`) erstellen; CORS aus `next.config.ts` in Middleware verschieben mit Preflight-Handling; Security Headers in `next.config.ts` mit CSP Report-Only; `withPermission()` in allen Routes beibehalten als Defense-in-Depth.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js native `proxy.ts` | built-in (16.1.6) | Security-Schicht, CVE-Defense, Auth Fast-Path, CORS | Offizieller Nachfolger von `middleware.ts` in Next.js 16; Node.js Runtime (nicht Edge) |
| Next.js native `headers()` in `next.config.ts` | built-in (16.1.6) | Statische Security Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP | Kein externer Dependency; offizieller Next.js-Pattern; laeuft vor Route Handlers |
| `process.env.ALLOWED_ORIGINS` | — | CORS Allowlist via Environment Variable | Kein Library benoetigt; reine Konfiguration |

### Supporting (nicht fuer diese Phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@edge-csrf/nextjs` | ^2.5.x | CSRF-Token in Middleware | Phase 3 — nach Phase 2 |
| `ioredis` | ^5.10.1 | Redis Rate Limiting | Phase 4 — nach Phase 3 |

### Nicht verwenden

| Avoid | Why |
|-------|-----|
| `middleware.ts` als Dateiname | Deprecated in Next.js 16; verwende `proxy.ts` |
| `@next-safe/middleware` | Unmaintained seit 4 Jahren; Next.js 16 hat native CSP-Unterstuetzung |
| `helmet` | Express-only; inkompatibel mit Next.js standalone Docker-Output |
| `next-secure-headers` | Redundant — alle Features nativ in `next.config.ts` verfuegbar |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── proxy.ts                     # NEU — (nicht middleware.ts, deprecated seit Next.js 16)
├── lib/
│   └── auth/
│       ├── auth-context.ts      # EXISTING — unveraendert
│       └── require-permission.ts # EXISTING — unveraendert (withPermission bleibt als Defense-in-Depth)
└── app/
    └── api/v1/...               # EXISTING — alle Routes weiterhin mit withPermission()
next.config.ts                   # EXISTING — CORS Wildcard entfernen, Security Headers hinzufuegen
```

**Dateiposition:** `proxy.ts` gehoert ins Projekt-Root (oder `src/` wenn das Projekt `src/`-Layout verwendet). Dieses Projekt verwendet `src/` Layout — Datei gehoert nach `src/proxy.ts`.

### Pattern 1: `proxy.ts` — CVE-2025-29927 Defense + Auth Fast-Path

**What:** `proxy.ts` strippt den `x-middleware-subrequest` Header (CVE-2025-29927), leitet unauthentifizierte `/intern/*` Requests zu Login um, und setzt Security Headers auf alle Responses.

**CVE-Kontext:** CVE-2025-29927 (CVSS 9.1, Maerz 2025) erlaubte das Bypassen von `middleware.ts` ueber den `x-middleware-subrequest` Header. Next.js 16.1.6 ist gepatcht, aber Defense-in-Depth erfordert: (1) Header strippen in `proxy.ts`, (2) `withPermission()` in JEDEM Route Handler beibehalten.

```typescript
// src/proxy.ts — KORREKTE Benennung fuer Next.js 16
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://boss.xkmu.de')
  .split(',')
  .map(o => o.trim())

export function proxy(request: NextRequest) {
  // CVE-2025-29927 Defense: Strip x-middleware-subrequest header
  // Verhindert Middleware-Bypass auch auf alteren Next.js-Versionen
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-middleware-subrequest')

  // Auth Fast-Path: Unauthentifizierte /intern/* Requests weiterleiten
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/intern') && !pathname.startsWith('/intern/login')) {
    const sessionCookie = request.cookies.get('xkmu_session')
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/intern/login', request.url))
    }
  }

  // CORS: Preflight OPTIONS Handling
  const origin = request.headers.get('origin') ?? ''
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

  if (request.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Api-Key, X-CSRF-Token, X-Requested-With, Accept',
    }
    if (isAllowedOrigin) {
      preflightHeaders['Access-Control-Allow-Origin'] = origin
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true'
    }
    return NextResponse.json({}, { headers: preflightHeaders })
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // CORS fuer erlaubte Origins
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match alle Requests ausser:
     * - _next/static (statische Dateien)
     * - _next/image (Image-Optimierung)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
```

**Wichtig:** Die Funktion heisst `proxy`, nicht `middleware`. Das ist die neue Konvention in Next.js 16.

### Pattern 2: Security Headers in `next.config.ts`

**What:** Alle statischen Security Headers werden in `next.config.ts` gesetzt. CSP startet als `Content-Security-Policy-Report-Only`.

**CSP-Strategie fuer Tailwind CSS 4 + Next.js 16:**
- Tailwind CSS 4 kompiliert in Production zu einer externen CSS-Datei — kein `unsafe-inline` fuer `style-src` in Produktion noetig
- Entwicklung braucht `unsafe-inline` (Hot-Reload injiziert Inline-Styles)
- Next.js App Router injiziert Inline-Hydration-Scripts — `unsafe-inline` fuer `script-src` oder Nonce-basierter Ansatz
- Fuer Report-Only Phase: `unsafe-inline` erlauben, dann durch Nonces ersetzen wenn Violations verstanden
- `connect-src` gilt NUR fuer Browser-Requests (fetch, XHR, WebSocket) — AI Provider Calls sind serverseitig (Node.js), nicht betroffen

```typescript
// next.config.ts — Security Headers + CORS Allowlist
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const cspHeader = [
  "default-src 'self'",
  // Next.js App Router injiziert Inline-Scripts fuer Hydration
  // unsafe-inline und unsafe-eval in Dev benoetigt (React DevTools)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Tailwind CSS 4: Production-Build ist externe CSS-Datei; unsafe-inline nur in Dev
  `style-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
  "img-src 'self' data: https:",
  "font-src 'self'",
  // connect-src: Browser-Requests — AI Calls sind serverseitig, NICHT hier aufnehmen
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // ... bestehende Config ...

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Report-Only: Verletzungen melden, nicht blockieren
          // Nach Docker-Build-Verifikation auf 'Content-Security-Policy' umschalten
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspHeader,
          },
        ],
      },
      // CORS Allowlist aus Env-Var (Wildcard entfernen)
      // Hinweis: Preflight OPTIONS wird in proxy.ts behandelt
      // Dieser Block setzt CORS fuer einfache Requests als Fallback
    ]
  },
}

export default nextConfig
```

### Pattern 3: CORS aus `next.config.ts` entfernen

**Was entfernen:** Der bestehende `headers()` Block in `next.config.ts` (Zeilen 26-41) mit `Access-Control-Allow-Origin: *` wird vollstaendig entfernt. CORS wird in `proxy.ts` gehandhabt — dort kann die Origin geprueft werden (Request-Header sind in `next.config.ts` `headers()` nicht zugaenglich).

**Wichtig:** `next.config.ts` `headers()` kann keine Request-Header lesen — kann deshalb keine dynamische Origin-Pruefung durchfuehren. CORS-Allowlist MUSS in `proxy.ts` implementiert werden.

### Pattern 4: Defense-in-Depth — `withPermission()` bleibt Pflicht

**CVE-2025-29927 Lektion:** Middleware/Proxy allein ist keine ausreichende Sicherheitsgrenze. Jede API-Route MUSS weiterhin `withPermission()` aufrufen. Phase 1 hat alle 14 Routes migriert — dieser Zustand wird beibehalten.

**Verification:** Request mit `x-middleware-subrequest` Header an geschuetzte Route → muss 401 zurueckgeben (durch `withPermission()` in der Route, nicht durch `proxy.ts`).

### Anti-Patterns to Avoid

- **`middleware.ts` als Dateiname:** In Next.js 16 deprecated. Verwendet `proxy.ts`.
- **CORS in `next.config.ts` mit dynamischer Origin-Pruefung:** `next.config.ts` kann keine Request-Header lesen. Origin-Pruefung nur in `proxy.ts` moeglich.
- **Origin Reflection:** `request.headers.get('origin')` direkt als `Access-Control-Allow-Origin` zurueckgeben ist schlimmer als Wildcard (erlaubt Credentials von beliebigen Origins).
- **CSP in Enforcement-Modus ohne Docker-Build-Test:** Immer erst `Content-Security-Policy-Report-Only`, dann Docker-Build testen, dann auf Enforcement umschalten.
- **`withPermission()` aus Routes entfernen:** Proxy/Middleware ist kein Ersatz fuer Route-Level-Auth.
- **`connect-src` mit AI Provider Domains:** AI Provider Calls sind serverseitige Node.js-Requests — nicht Browser-Requests. `connect-src` gilt nur fuer den Browser.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS Preflight Handling | Eigene OPTIONS-Handler in jeder Route | `proxy.ts` mit OPTIONS-Block | Zentralisiert, kein Vergessen einzelner Routes |
| CSP Nonce-Generation | Eigenes Nonce-System | Next.js native nonce-Extraktion aus `Content-Security-Policy` Header | Next.js 16 extrahiert Nonce automatisch aus CSP Header und wendet ihn auf Framework-Scripts an |
| Security Header Validation | Eigener Test-Code | `curl -I https://boss.xkmu.de` | Standard HTTP Tooling |

---

## Common Pitfalls

### Pitfall 1: `middleware.ts` statt `proxy.ts`

**What goes wrong:** `middleware.ts` erstellt — funktioniert noch wegen Backward-Compatibility in 16.1.6, aber wird in zukunftigen Versionen entfernt. Deprecation-Warnung im Build.

**How to avoid:** Datei als `src/proxy.ts` erstellen; Funktion als `proxy` benennen (nicht `middleware`).

**Warning signs:** Build-Warnung "middleware convention is deprecated"; Funktion heisst `middleware`.

### Pitfall 2: CORS Origin Reflection

**What goes wrong:** `Access-Control-Allow-Origin: *` durch Code ersetzt der `request.headers.get('origin')` direkt zurueckgibt. Funktioniert schlechter als Wildcard: erlaubt Credentials von beliebigen Origins.

**How to avoid:** Explizite Allowlist aus `process.env.ALLOWED_ORIGINS`; nur erlaubte Origins zurueckgeben; fallt durch auf erste erlaubte Origin (nicht auf die Request-Origin).

**Verification:** `curl -H "Origin: https://evil.com" https://boss.xkmu.de/api/v1/health` — Response darf `evil.com` NICHT als `Access-Control-Allow-Origin` zurueckgeben.

### Pitfall 3: CSP bricht Production-Build

**What goes wrong:** CSP in `next.config.ts` funktioniert in Dev; Production Docker-Build blockiert Inline-Scripts aus Next.js Hydration, Seite zeigt Blank Screen.

**Why:** Tailwind CSS 4 in Production = externe CSS-Datei (kein `unsafe-inline` noetig), aber Next.js App Router injiziert immer noch Inline-Scripts fuer Hydration.

**How to avoid:** `Content-Security-Policy-Report-Only` verwenden; Production Docker-Build ausfuehren; Browser-Konsole auf CSP-Violations pruefen; erst dann auf Enforcement umschalten.

**Warning signs:** Browser-Konsole zeigt CSP-Violations nach Docker-Deployment; App zeigt weisse Seite oder Teilausfaelle.

### Pitfall 4: `withPermission()` aus Routes entfernen

**What goes wrong:** Entwickler sieht Auth Fast-Path in `proxy.ts` und entfernt `withPermission()` aus Routes als "Duplikat". CVE-2025-29927 Angriff funktioniert sofort wieder.

**How to avoid:** Strenge Regel dokumentieren: `withPermission()` ist in JEDER API Route Pflicht, unabhaengig vom Proxy-State. Proxy ist Request-Decoration, kein Auth-Ersatz.

**Verification:** Request mit `x-middleware-subrequest: 1` Header → Route muss 401 zurueckgeben.

### Pitfall 5: Mixer aus `next.config.ts` CORS und `proxy.ts` CORS

**What goes wrong:** Beide Stellen setzen CORS Headers — `proxy.ts` setzt erlaubte Origin, `next.config.ts` setzt Wildcard — Browser sieht doppelte Header, Wildcard gewinnt oder Konflikt entsteht.

**How to avoid:** CORS Wildcard vollstaendig aus `next.config.ts` entfernen (Zeilen 26-41). Nur `proxy.ts` setzt CORS.

### Pitfall 6: `connect-src` blockiert Localhost-Entwicklung

**What goes wrong:** CSP mit `connect-src 'self'` blockiert im Dev-Modus Next.js Hot Reload WebSocket.

**How to avoid:** In Dev `connect-src 'self' ws://localhost:*` hinzufuegen. Alternativ: CSP in Dev grosszuegiger oder deaktiviert.

---

## Code Examples

### Vollstaendige `src/proxy.ts` (Referenz-Implementation)

```typescript
// Source: Next.js 16 Docs — proxy.ts file convention
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://boss.xkmu.de')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

export function proxy(request: NextRequest) {
  // 1. CVE-2025-29927 Defense
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-middleware-subrequest')

  // 2. Auth Fast-Path fuer /intern/* (nicht Login-Seite)
  const { pathname } = request.nextUrl
  const isInternRoute =
    pathname.startsWith('/intern') && !pathname.startsWith('/intern/login')
  if (isInternRoute && !request.cookies.get('xkmu_session')) {
    const loginUrl = new URL('/intern/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. CORS Preflight
  const origin = request.headers.get('origin') ?? ''
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Api-Key, X-CSRF-Token, X-Requested-With, Accept',
      'Access-Control-Max-Age': '86400',
    }
    if (isAllowedOrigin) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
    return new NextResponse(null, { status: 204, headers })
  }

  // 4. Response mit gesaeubertem Request-Header
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // 5. CORS fuer einfache Requests
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Api-Key, X-CSRF-Token, X-Requested-With, Accept'
    )
  }

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
```

### Security Headers in `next.config.ts` (Aktualisierter Bereich)

```typescript
// next.config.ts — ersetzt den bestehenden headers()-Block komplett
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // ... andere Config-Optionen unveraendert ...

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Report-Only: erst nach Docker-Build-Verifikation auf 'Content-Security-Policy' aendern
          { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
        ],
      },
      // KEIN CORS-Block mehr hier — wird von proxy.ts uebernommen
    ]
  },
}

export default nextConfig
```

### CORS Env-Var in `docker-compose.local.yml`

```yaml
# In den environment-Bereich des Next.js-Services:
- ALLOWED_ORIGINS=https://boss.xkmu.de
# Oder fuer mehrere Origins:
# - ALLOWED_ORIGINS=https://boss.xkmu.de,https://n8n.xkmu.de
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` / `middleware` export | `proxy.ts` / `proxy` export | Next.js 16.0.0 | Backwards-kompatibel in 16.x, wird in kuenftiger Version entfernt |
| Middleware lief in Edge Runtime | `proxy.ts` laeuft in Node.js Runtime (Standard) | Next.js 16.0.0 | Edge Runtime nur noch mit altem `middleware.ts`; fuer diese Phase kein Unterschied |
| `skipMiddlewareUrlNormalize` | `skipProxyUrlNormalize` | Next.js 16.0.0 | Config-Flag umbenennen falls verwendet |
| CSP nur in next.config.ts mit statischen Hashes | Nonce-basiertes CSP via proxy.ts | v13.4.20 | Dynamische Pages brauchen Nonces fuer strict CSP; fuer Report-Only-Phase vorerst `unsafe-inline` |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16, rename zu `proxy.ts`
- `@next-safe/middleware`: Letztes Release v0.10.0, 4 Jahre alt — nicht verwenden
- CORS Wildcard mit Credentials in `next.config.ts`: Aktive Sicherheitsluecke; durch Middleware-CORS ersetzen

---

## Open Questions

1. **Tailwind CSS 4 `style-src` in Production**
   - Was wir wissen: Tailwind CSS 4 kompiliert zu externer CSS-Datei in Production; kein `unsafe-inline` noetig
   - Was unklar ist: Gibt es Tailwind CSS 4 Features (z.B. `@apply` in Component-Styles, CSS Custom Properties via `style` Attribute) die in spezifischen Dashboard-Komponenten Inline-Styles erfordern?
   - Empfehlung: In Report-Only Mode starten und tatsaechliche Violations aus dem Browser-Log auswerten bevor `unsafe-inline` entfernt wird

2. **`connect-src` und Next.js App Router Prefetching**
   - Was wir wissen: `connect-src 'self'` erlaubt fetch() vom gleichen Origin — Next.js prefetch requests sind same-origin
   - Was unklar ist: Ob der Production Docker-Build irgendeinen externen `connect-src` braucht (z.B. fuer einen Font-Provider oder Analytics)
   - Empfehlung: Report-Only Modus zeigt exakt welche `connect-src` Violations auftreten

3. **`docker-compose.local.yml` ALLOWED_ORIGINS Variable**
   - Was wir wissen: Variable muss dem Next.js Container als Environment-Variable bereitgestellt werden
   - Was unklar ist: Aktueller Stand der `.env`-Konfiguration auf Hetzner-Server
   - Empfehlung: Variable zu `docker-compose.local.yml` hinzufuegen; mit `:?` Fehler-Syntax (wie Phase 1 fuer andere Vars) wenn hardcoded Fallback unerwuenscht

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `proxy.ts` Runtime | Ja | via Docker | — |
| PostgreSQL | DB Layer (unveraendert) | Ja | 15.x | — |
| `ALLOWED_ORIGINS` env var | CORS Allowlist | Noch nicht gesetzt | — | Fallback: `https://boss.xkmu.de` (hardcoded) |
| Docker Build-Umgebung | CSP-Verifikation | Ja | Portainer/Hetzner | — |

**ALLOWED_ORIGINS fehlt in `docker-compose.local.yml` (erwartet):** Variable muss als Teil dieses Plans hinzugefuegt werden. Temporaerer Fallback `|| 'https://boss.xkmu.de'` in `proxy.ts` ist akzeptabel bis Variable gesetzt ist.

---

## Validation Architecture

**Framework:** No dedicated test framework for middleware/proxy in this phase.

**Manual Verification Steps (per Success Criteria):**

| Req ID | Behavior | Verification Method | Automated? |
|--------|----------|---------------------|------------|
| R2.2 | CVE-2025-29927 Defense: `x-middleware-subrequest` Header blockiert | `curl -H "x-middleware-subrequest: 1" /api/v1/leads` → 401 | Manuell |
| R2.2 | Statische Assets nicht verlangsamt | Response-Time Vergleich `/_next/static/...` vs ohne Proxy | Manuell |
| R1.2 | Evil Origin nicht reflektiert | `curl -H "Origin: https://evil.com" /api/v1/health` → kein `evil.com` in `Access-Control-Allow-Origin` | Manuell |
| R1.2 | Preflight funktioniert | `curl -X OPTIONS -H "Origin: https://boss.xkmu.de" /api/v1/leads` → 204 mit CORS Headers | Manuell |
| R1.3 | Security Headers gesetzt | `curl -I https://boss.xkmu.de` → zeigt `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | Manuell |
| R1.3 | Null CSP-Violations in Production | Docker-Build, Browser auf Dashboard, Console offen → keine Violations | Manuell |

**Wave 0 Gaps:** Keine automatisierten Test-Dateien fuer diese Phase. Alle Verifikationen sind manuelle `curl`/Browser-Checks. Akzeptabel fuer Konfigurationsaenderungen.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact auf Phase 2 |
|-----------|-------------------|
| `npx next build` vor Push (nicht nur `tsc --noEmit`) | Unveraendert — nach jeder Aenderung vollstaendigen Build ausfuehren |
| Git Push Pattern: `git stash && git pull --rebase origin main && git stash pop` | Unveraendert |
| Deployment: Docker-only via Portainer auf 195.201.12.250 | CSP muss im Docker-Production-Build verifiziert werden, nicht nur lokal |
| Deutsche UI-Sprache | Fehler-Messages in Logs koennen Englisch sein (Code), UI-Texte Deutsch |
| Multi-Tenant: tenantId auf allen Queries | Proxy/Security-Layer beruehrt keine DB-Queries; keine Auswirkung |
| Toast feedback via `sonner` | Kein direkter Impact; CSP darf kein Script-Src fuer CDN-Quellen des sonner-Pakets blockieren |

---

## Sources

### Primary (HIGH confidence)

- Next.js 16.2.1 offizielle Docs — `proxy.ts` file convention (nextjs.org/docs/app/api-reference/file-conventions/proxy, aktualisiert 2026-03-25) — Exakter File-Naming, Matcher-Config, CORS Pattern
- Next.js 16 Upgrade Guide (nextjs.org/docs/app/guides/upgrading/version-16, aktualisiert 2026-03-25) — Middleware → Proxy Breaking Change dokumentiert
- Next.js 16.2.1 offizielle Docs — Content Security Policy Guide (nextjs.org/docs/app/guides/content-security-policy, aktualisiert 2026-03-25) — CSP Nonce-Pattern, Report-Only Modus, Tailwind Kompatibilitaet
- Direkte Codebase-Analyse — `next.config.ts`, `src/lib/auth/require-permission.ts`, `src/lib/auth/auth-context.ts`

### Secondary (MEDIUM confidence)

- CVE-2025-29927 Vercel Postmortem (vercel.com/blog/postmortem-on-next-js-middleware-bypass) — CVE Details und Defense Pattern
- Tailwind CSS 4 + CSP GitHub Discussion (github.com/tailwindlabs/tailwindcss/discussions/13326) — Bestaetigt: Production-Build = externe CSS Datei; Dev braucht unsafe-inline
- Next.js 16 Upgrade Artikel — buildwithmatija.com/blog/nextjs16-middleware-change — Middleware → Proxy Migration
- npm registry — verifizierten Versionen der Stack-Packages

### Tertiary (LOW confidence)

- Keine LOW-confidence Quellen fuer kritische Entscheidungen verwendet

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — verifiziert gegen Next.js 16.2.1 offizielle Docs
- Architecture: HIGH — basiert auf direkter Codebase-Analyse + offiziellen Next.js 16 Docs
- Pitfalls: HIGH — basiert auf bekannten CVEs, offiziellen Postmortems, direkter Codebase-Analyse

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Next.js 16.x stabil; Proxy-API unwahrscheinlich zu aendern)

---

## Kritische Erkenntnisse fuer den Planner

1. **`proxy.ts` nicht `middleware.ts`:** Next.js 16.1.6 (die installierte Version) hat `middleware.ts` deprecated und in `proxy.ts` umbenannt. Alle Plans muessen `src/proxy.ts` verwenden, Funktion heisst `proxy`.

2. **CORS muss von `next.config.ts` in `proxy.ts` verschoben werden:** `next.config.ts` kann keine Request-Header lesen — dynamische Origin-Pruefung ist dort unmoeglich. Der bestehende CORS-Block in `next.config.ts` (Zeilen 26-41) wird vollstaendig entfernt.

3. **Drei separate Plans sind richtig gewaehlt:** 02-01 CORS, 02-02 Security Headers, 02-03 Proxy sind die richtige Granularitaet. Die korrekte Reihenfolge: CORS-Wildcard entfernen (02-01) → Security Headers (02-02) → Proxy erstellen mit CORS-Preflight + CVE-Defense (02-03). Aber 02-01 und 02-02 koennten zusammengefasst werden da beide `next.config.ts` bearbeiten.

4. **CSP Report-Only ist nicht optional:** Ohne Docker-Build-Test riskiert man eine weisse Seite auf dem Production-Server. Report-Only ist nicht ein "netter Bonus" — es ist der einzige sichere Weg CSP einzufuehren.

5. **`withPermission()` bleibt Pflicht in JEDER Route:** Proxy ist Request-Decoration. Der Phase-1-Zustand (alle 14 Routes migriert) muss erhalten bleiben und ist die eigentliche CVE-Defense.

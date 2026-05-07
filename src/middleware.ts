import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Globale Middleware. Aktuell nur ein Use-Case:
 *
 *   SCORM-Iframe-Override
 *   Die globale next.config.ts setzt X-Frame-Options: DENY und
 *   Content-Security-Policy-Report-Only mit frame-ancestors 'none'.
 *   SCORM-Inhalte muessen aber im Iframe der EIGENEN Domain laden.
 *
 *   Per next.config.ts headers() laesst sich das Override per Path-Pattern
 *   theoretisch loesen — in der Praxis fuehren doppelte Header bei manchen
 *   Browsern zu defensivem Block. Daher hier: nach NextResponse.next() den
 *   strengeren Header explizit entfernen und durch die lockere Variante
 *   ersetzen. Middleware laeuft NACH der headers()-config — wir gewinnen.
 *
 * Hinweis: src/proxy.ts ist eine UNGENUTZTE Auth-Middleware (Next.js
 * sucht nur middleware.ts/src/middleware.ts auto-discovery). Diese
 * Datei laesst proxy.ts unangetastet.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // /api/v1/courses/<id>/scorm/<pkg>/serve/...
  if (/^\/api\/v1\/courses\/[^/]+\/scorm\/[^/]+\/serve\//.test(pathname)) {
    response.headers.delete('X-Frame-Options')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.delete('Content-Security-Policy-Report-Only')
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self'")
  }

  return response
}

export const config = {
  // Nur fuer scorm-serve-Pfade aktiv — sonst wuerde die Middleware unnoetig
  // auf jedem Request laufen.
  matcher: ['/api/v1/courses/:courseId/scorm/:packageId/serve/:path*'],
}

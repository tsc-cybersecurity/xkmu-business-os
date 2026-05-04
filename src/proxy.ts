import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://bos.dev.xkmu.de')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const PUBLIC_PATHS = [
  '/',
  '/api-docs',
  '/impressum',
  '/agb',
  '/datenschutz',
  '/kontakt',
  '/cyber-security',
  '/ki-automation',
  '/it-consulting',
  '/it-news',
  '/intern/login',
  '/intern/register',
  '/api/v1/auth/accept-invite',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/contact',
  '/api/v1/public',
  '/api/v1/media/serve',
  '/api/health',
  '/portal/accept-invite',
  '/buchen',
  '/api/buchen',
  '/api/google-calendar/webhook',
]

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join()
}

function csrfCheck(request: NextRequest): NextResponse | null {
  // Only check mutation methods
  if (!MUTATION_METHODS.has(request.method)) return null

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)

  // Both must be present and match (Double-Submit Cookie Pattern)
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: 'CSRF-Token fehlt oder ungueltig' },
      { status: 403 }
    )
  }

  return null // CSRF valid
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

interface SessionInfo {
  role: string
  companyId: string | null
}

async function verifySession(token: string): Promise<SessionInfo | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const expiresAt = payload.expiresAt as string | undefined
    if (!expiresAt || new Date(expiresAt) <= new Date()) return null
    const user = payload.user as { role?: string; companyId?: string | null } | undefined
    if (!user?.role) return null
    return { role: user.role, companyId: user.companyId ?? null }
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  // CVE-2025-29927 Defense: strip x-middleware-subrequest to prevent
  // middleware bypass on older Next.js versions. Defense-in-Depth:
  // withPermission() in route handlers remains the actual auth gate.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-middleware-subrequest')

  const { pathname } = request.nextUrl

  // Redirect /catalog/* to /intern/catalog/*
  if (pathname.startsWith('/catalog/') || pathname === '/catalog') {
    return NextResponse.redirect(new URL(`/intern${pathname}`, request.url))
  }

  // Redirect /intern to /intern/dashboard
  if (pathname === '/intern' || pathname === '/intern/') {
    return NextResponse.redirect(new URL('/intern/dashboard', request.url))
  }

  // Allow public paths (login, register, etc.)
  const isPublicPath = PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  // CORS: handle preflight OPTIONS requests
  const origin = request.headers.get('origin') ?? ''
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

  if (request.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Api-Key, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      'Access-Control-Max-Age': '86400',
    }
    if (isAllowedOrigin) {
      preflightHeaders['Access-Control-Allow-Origin'] = origin
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true'
    }
    return new NextResponse(null, { status: 204, headers: preflightHeaders })
  }

  // All non-intern, non-api, non-portal paths are public (CMS pages, blog, etc.)
  if (
    !pathname.startsWith('/intern') &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/portal')
  ) {
    return NextResponse.next()
  }

  // Portal gate: /portal requires session with role=portal_user + companyId
  if (pathname.startsWith('/portal')) {
    // CSRF-Schutz fuer session-basierte Mutation-Routes (portal)
    const csrfResult = csrfCheck(request)
    if (csrfResult) return csrfResult

    const sessionToken = request.cookies.get('xkmu_session')?.value
    if (!sessionToken) {
      const loginUrl = new URL('/intern/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const sessionInfo = await verifySession(sessionToken)
    if (!sessionInfo) {
      const loginUrl = new URL('/intern/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('xkmu_session')
      return response
    }
    if (sessionInfo.role !== 'portal_user' || !sessionInfo.companyId) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Check for API key on API routes
  if (pathname.startsWith('/api/v1/')) {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      // API key validation happens in the route handlers
      return NextResponse.next()
    }
  }

  // CSRF-Schutz fuer session-basierte Mutation-Routes
  // API-Key-Requests haben den Block oben bereits verlassen (return NextResponse.next())
  const csrfResult = csrfCheck(request)
  if (csrfResult) return csrfResult  // 403 bei fehlendem/ungueltigem CSRF-Token

  // Check session for protected routes
  const sessionToken = request.cookies.get('xkmu_session')?.value

  if (!sessionToken) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/intern/login', request.url))
    }
    // Return 401 for API requests
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionInfo = await verifySession(sessionToken)

  if (!sessionInfo) {
    // Clear invalid session
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/intern/login', request.url))

    response.cookies.delete('xkmu_session')
    return response
  }

  // Block portal users from accessing the internal dashboard
  if (pathname.startsWith('/intern') && sessionInfo.role === 'portal_user') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set CSRF cookie if not present (Double-Submit Cookie Pattern)
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    const token = generateCsrfToken()
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // Frontend must read this cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  // CORS: set response headers for allowed origins (non-preflight requests)
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Api-Key, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
    )
  }

  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}

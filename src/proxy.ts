import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { createCsrfMiddleware } from '@edge-csrf/nextjs'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://boss.xkmu.de')
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
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/contact',
  '/api/v1/public',
  '/api/v1/media/serve',
  '/api/health',
]

const API_KEY_PATHS = [
  '/api/v1/',
]

const csrfProtect = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    name: 'csrf_token',
    sameSite: 'lax',
  },
})

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

async function verifySession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const expiresAt = payload.expiresAt as string
    return new Date(expiresAt) > new Date()
  } catch {
    return false
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

  // All non-intern, non-api paths are public (CMS pages, blog, etc.)
  if (!pathname.startsWith('/intern') && !pathname.startsWith('/api/')) {
    return NextResponse.next()
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
  const csrfResponse = await csrfProtect(request)
  if (csrfResponse) return csrfResponse  // 403 bei fehlendem/ungueltigem CSRF-Token

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

  const isValidSession = await verifySession(sessionToken)

  if (!isValidSession) {
    // Clear invalid session
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/intern/login', request.url))

    response.cookies.delete('xkmu_session')
    return response
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

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

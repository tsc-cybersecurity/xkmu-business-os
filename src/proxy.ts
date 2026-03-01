import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

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

  // Check for API key on API routes
  if (pathname.startsWith('/api/v1/')) {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      // API key validation happens in the route handlers
      return NextResponse.next()
    }
  }

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

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

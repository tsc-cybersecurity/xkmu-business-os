import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Session, SessionUser } from '@/lib/types/auth.types'

const SESSION_COOKIE_NAME = 'xkmu_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(user: SessionUser): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  const token = await new SignJWT({
    user,
    expiresAt: expiresAt.toISOString(),
    v: 2,                              // Session-Version — Force-Logout alter Sessions
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return token
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const session = payload as unknown as Session

    // Force-Logout: alte Sessions ohne v=2 werden abgewiesen
    if (session.v !== 2) return null

    if (new Date(session.expiresAt) < new Date()) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRole(allowedRoles: string[]): Promise<Session> {
  const session = await requireSession()
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden')
  }
  return session
}

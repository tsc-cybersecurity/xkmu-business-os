import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'node:crypto'
import { getAuthContext } from '@/lib/auth/auth-context'
import { getCalendarEnv } from '@/lib/services/calendar-env'

const STATE_COOKIE = 'calendar_oauth_state'
const STATE_TTL_MS = 5 * 60_000

function signState(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth || auth.role === 'api') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const env = getCalendarEnv()

  const nonce = randomBytes(16).toString('hex')
  const ts = Date.now()
  const stateRaw = JSON.stringify({ uid: auth.userId, n: nonce, t: ts })
  const sig = signState(stateRaw, env.appointmentTokenSecret)
  const state = `${Buffer.from(stateRaw).toString('base64url')}.${sig}`

  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  const res = NextResponse.redirect(url, 302)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_MS / 1000,
    path: '/',
  })
  return res
}

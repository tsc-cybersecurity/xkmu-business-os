import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getAuthContext } from '@/lib/auth/auth-context'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { signState } from '@/lib/utils/oauth-state'

const STATE_COOKIE = 'calendar_oauth_state'
const STATE_TTL_MS = 5 * 60_000

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth || auth.role === 'api') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const cfg = await CalendarConfigService.getConfig()
  if (!CalendarConfigService.isConfigured(cfg)) {
    return NextResponse.json({ error: 'feature_not_configured' }, { status: 503 })
  }

  const nonce = randomBytes(16).toString('hex')
  const payload = { uid: auth.userId, n: nonce, t: Date.now() }
  const state = signState(payload, cfg.appointmentTokenSecret)

  const params = new URLSearchParams({
    client_id: cfg.clientId!,
    redirect_uri: cfg.redirectUri!,
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

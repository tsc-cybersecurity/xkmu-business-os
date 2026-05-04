import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CalendarGoogleClient } from '@/lib/services/calendar-google.client'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'

const STATE_COOKIE = 'calendar_oauth_state'
const STATE_MAX_AGE_MS = 5 * 60_000

interface StatePayload { uid: string; n: string; t: number }

function verifyState(state: string, secret: string): StatePayload | null {
  const dot = state.lastIndexOf('.')
  if (dot < 0) return null
  const rawB64 = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const rawJson = Buffer.from(rawB64, 'base64url').toString('utf8')
  const expected = createHmac('sha256', secret).update(rawJson).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(rawJson) as StatePayload
    if (Date.now() - parsed.t > STATE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function errRedirect(request: NextRequest, reason: string) {
  const url = new URL('/intern/settings/profile', request.url)
  url.searchParams.set('calendar_error', reason)
  return NextResponse.redirect(url.toString(), 302)
}

export async function GET(request: NextRequest) {
  const cfg = await CalendarConfigService.getConfig()
  if (!CalendarConfigService.isConfigured(cfg)) {
    return errRedirect(request, 'feature_disabled')
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const queryState = url.searchParams.get('state')
  // Parse cookie header manually so the handler works with both NextRequest and plain Request (tests)
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookieState = cookieHeader
    .split(';')
    .map(p => p.trim().split('='))
    .find(([k]) => k === STATE_COOKIE)
    ?.[1]

  if (!code || !queryState || !cookieState || queryState !== cookieState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 })
  }
  const verified = verifyState(queryState, cfg.appointmentTokenSecret)
  if (!verified) {
    return NextResponse.json({ error: 'invalid_state_signature' }, { status: 400 })
  }

  // Existierenden aktiven Account prüfen — bei Reconnect erst alten revoken (kommt in V2; in V1 abbrechen)
  const existing = await CalendarAccountService.getActiveAccount(verified.uid)
  if (existing) {
    return errRedirect(request, 'already_connected')
  }

  let exchange
  try {
    exchange = await CalendarGoogleClient.exchangeCode(code, {
      clientId: cfg.clientId!,
      clientSecret: cfg.clientSecret!,
      redirectUri: cfg.redirectUri!,
    })
  } catch (err) {
    return errRedirect(request, err instanceof Error ? err.message.slice(0, 80) : 'exchange_failed')
  }

  let calendars
  try {
    calendars = await CalendarGoogleClient.listCalendars(exchange.accessToken)
  } catch {
    return errRedirect(request, 'calendar_list_failed')
  }

  // E-Mail des Users aus calendar list (primary.id ist meist gleich der E-Mail)
  const primary = calendars.find(c => c.isPrimary)
  const googleEmail = primary?.id ?? 'unknown'

  try {
    await CalendarAccountService.storeNewAccount({
      userId: verified.uid,
      googleEmail,
      accessToken: exchange.accessToken,
      refreshToken: exchange.refreshToken,
      expiresInSec: exchange.expiresInSec,
      scopes: exchange.scopes,
      calendars,
    })
  } catch (err) {
    // Best-effort revoke so the issued token doesn't sit unused upstream
    try { await CalendarGoogleClient.revokeToken(exchange.refreshToken) } catch {}
    return errRedirect(request, 'store_failed')
  }

  const successUrl = new URL('/intern/settings/profile', request.url)
  successUrl.searchParams.set('calendar', 'connected')
  const res = NextResponse.redirect(successUrl.toString(), 302)
  res.cookies.delete(STATE_COOKIE)
  return res
}

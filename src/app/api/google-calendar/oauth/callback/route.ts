import { NextRequest, NextResponse } from 'next/server'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CalendarGoogleClient } from '@/lib/services/calendar-google.client'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { CalendarSyncService } from '@/lib/services/calendar-sync.service'
import { logger } from '@/lib/utils/logger'
import { verifyState } from '@/lib/utils/oauth-state'

const STATE_COOKIE = 'calendar_oauth_state'

function resolveBaseUrl(request: NextRequest, appPublicUrl: string | null): string {
  // Prefer admin-configured public URL — handles reverse-proxy setups where
  // request.url reports the internal bind host (e.g. 0.0.0.0:3000).
  if (appPublicUrl) return appPublicUrl
  return request.url
}

function errRedirect(request: NextRequest, reason: string, appPublicUrl: string | null) {
  const url = new URL('/intern/settings/profile', resolveBaseUrl(request, appPublicUrl))
  url.searchParams.set('calendar_error', reason)
  return NextResponse.redirect(url.toString(), 302)
}

export async function GET(request: NextRequest) {
  const cfg = await CalendarConfigService.getConfig()
  if (!CalendarConfigService.isConfigured(cfg)) {
    return errRedirect(request, 'feature_disabled', cfg.appPublicUrl)
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
    return errRedirect(request, 'already_connected', cfg.appPublicUrl)
  }

  let exchange
  try {
    exchange = await CalendarGoogleClient.exchangeCode(code, {
      clientId: cfg.clientId!,
      clientSecret: cfg.clientSecret!,
      redirectUri: cfg.redirectUri!,
    })
  } catch (err) {
    return errRedirect(request, err instanceof Error ? err.message.slice(0, 80) : 'exchange_failed', cfg.appPublicUrl)
  }

  let calendars
  try {
    calendars = await CalendarGoogleClient.listCalendars(exchange.accessToken)
  } catch {
    return errRedirect(request, 'calendar_list_failed', cfg.appPublicUrl)
  }

  // E-Mail des Users aus calendar list (primary.id ist meist gleich der E-Mail)
  const primary = calendars.find(c => c.isPrimary)
  const googleEmail = primary?.id ?? 'unknown'

  let accountId: string
  try {
    const stored = await CalendarAccountService.storeNewAccount({
      userId: verified.uid,
      googleEmail,
      accessToken: exchange.accessToken,
      refreshToken: exchange.refreshToken,
      expiresInSec: exchange.expiresInSec,
      scopes: exchange.scopes,
      calendars,
    })
    accountId = stored.id
  } catch (err) {
    // Best-effort revoke so the issued token doesn't sit unused upstream
    try { await CalendarGoogleClient.revokeToken(exchange.refreshToken) } catch {}
    return errRedirect(request, 'store_failed', cfg.appPublicUrl)
  }

  // Best-effort initial sync + watch setup. Failures here don't break the connection
  // — the user's account is stored and the cron will retry. We only log and surface
  // a soft warning via query param.
  let syncWarn: string | null = null
  const primaryCalendarId = calendars.find(c => c.isPrimary)?.id ?? calendars[0]?.id
  if (primaryCalendarId) {
    try {
      await CalendarSyncService.fullSync(accountId, primaryCalendarId)
    } catch (err) {
      logger.error('Initial fullSync failed during OAuth callback', err, { accountId })
      syncWarn = 'sync_failed'
    }
    try {
      await CalendarSyncService.setupWatch(accountId)
    } catch (err) {
      logger.error('setupWatch failed during OAuth callback', err, { accountId })
      syncWarn = syncWarn ?? 'watch_failed'
    }
  }

  const successUrl = new URL('/intern/settings/profile', resolveBaseUrl(request, cfg.appPublicUrl))
  successUrl.searchParams.set('calendar', 'connected')
  if (syncWarn) successUrl.searchParams.set('sync_warn', syncWarn)
  const res = NextResponse.redirect(successUrl.toString(), 302)
  res.cookies.delete(STATE_COOKIE)
  return res
}

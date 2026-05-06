import { NextRequest, NextResponse } from 'next/server'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { verifyState } from '@/lib/utils/oauth-state'

const RETURN_PATH = '/intern/integrations/social'

async function redirect(qs: Record<string, string>): Promise<NextResponse> {
  const base = await CmsDesignService.getAppUrl()
  const url = new URL(RETURN_PATH, base)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url.toString(), 302)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  if (error) return await redirect({ error })

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return await redirect({ error: 'missing_code_or_state' })

  const cfg = await CalendarConfigService.getConfig()
  const parsed = verifyState(state, cfg.appointmentTokenSecret)
  if (!parsed) return await redirect({ error: 'invalid_state' })

  try {
    const short = await MetaOAuthClient.exchangeCode(code)
    const long = await MetaOAuthClient.exchangeForLongLived(short.accessToken)
    const pages = await MetaOAuthClient.listPagesWithIg(long.accessToken)

    // Diagnose-Log: Anzahl + Namen der gefundenen Pages
    console.log('[meta-oauth-callback] /me/accounts returned pages:', pages.length, pages.map(p => `${p.pageId}:${p.pageName}`))

    if (pages.length === 0) return await redirect({ error: 'no_pages_found' })

    // Bei mehreren Pages: bevorzugt die mit "xkmu" im Namen (case-insensitive),
    // sonst die erste. Multi-Page-Picker-UI wäre eine spätere Phase.
    const xkmuMatch = pages.find(p => /xkmu/i.test(p.pageName))
    const selectedPage = xkmuMatch ?? pages[0]

    const result = await SocialAccountService.connectMeta({
      page: selectedPage,
      expiresInSec: long.expiresInSec,
      userId: parsed.uid,
    })

    for (const acc of result.connected) {
      await AuditLogService.log({
        userId: parsed.uid,
        userRole: 'owner',
        action: 'social_account_connected',
        entityType: 'social_oauth_accounts',
        entityId: acc.id,
        payload: { provider: acc.provider, externalAccountId: acc.externalAccountId, accountName: acc.accountName },
        request,
      })
    }

    return await redirect({ connected: 'meta' })
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'oauth_failed'
    // Sanitize: alphanumerics + underscore only, capped at 60 chars
    const msg = raw.replace(/[^a-z0-9_]/gi, '_').slice(0, 60) || 'oauth_failed'
    return await redirect({ error: msg })
  }
}

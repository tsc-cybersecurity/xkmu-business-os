import { NextRequest, NextResponse } from 'next/server'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { verifyState } from '@/lib/utils/oauth-state'
import { LinkedInOAuthClient } from '@/lib/services/social/linkedin-oauth.client'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AuditLogService } from '@/lib/services/audit-log.service'

const RETURN_PATH = '/intern/integrations/social'

async function redirect(qs: Record<string, string>): Promise<NextResponse> {
  const baseUrl = await CmsDesignService.getAppUrl()
  const url = new URL(RETURN_PATH, baseUrl)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
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
    const tokens = await LinkedInOAuthClient.exchangeCode(code)
    const info = await LinkedInOAuthClient.getUserInfo(tokens.accessToken)

    const result = await SocialAccountService.connectLinkedIn({
      userId: parsed.uid,
      memberId: info.sub,
      memberName: info.name,
      email: info.email ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresInSec: tokens.expiresInSec,
    })

    for (const acc of result.connected) {
      await AuditLogService.log({
        userId: parsed.uid,
        userRole: 'owner',
        action: 'social_account_connected',
        entityType: 'social_oauth_accounts',
        entityId: acc.id,
        payload: { provider: acc.provider, externalAccountId: acc.externalAccountId, accountName: acc.accountName, source: 'linkedin_oidc' },
        request,
      })
    }

    return await redirect({ connected: 'linkedin' })
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'oauth_failed'
    const msg = raw.replace(/[^a-z0-9_]/gi, '_').slice(0, 60) || 'oauth_failed'
    return await redirect({ error: msg })
  }
}

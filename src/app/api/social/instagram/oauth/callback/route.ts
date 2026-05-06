import { NextRequest, NextResponse } from 'next/server'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { verifyState } from '@/lib/utils/oauth-state'
import { InstagramOAuthClient } from '@/lib/services/social/instagram-oauth.client'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AuditLogService } from '@/lib/services/audit-log.service'

const RETURN_PATH = '/intern/integrations/social'

function redirect(qs: Record<string, string>) {
  const url = new URL(RETURN_PATH, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  if (error) return redirect({ error })
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return redirect({ error: 'missing_code_or_state' })

  const cfg = await CalendarConfigService.getConfig()
  const parsed = verifyState(state, cfg.appointmentTokenSecret)
  if (!parsed) return redirect({ error: 'invalid_state' })

  try {
    const short = await InstagramOAuthClient.exchangeCode(code)
    const long = await InstagramOAuthClient.exchangeForLongLived(short.accessToken)
    const info = await InstagramOAuthClient.getUserInfo(long.accessToken)

    const result = await SocialAccountService.connectInstagram({
      longLivedToken: long.accessToken,
      expiresInSec: long.expiresInSec,
      igUserId: info.igUserId,
      igUsername: info.igUsername,
      userId: parsed.uid,
    })

    for (const acc of result.connected) {
      await AuditLogService.log({
        userId: parsed.uid,
        userRole: 'owner',
        action: 'social_account_connected',
        entityType: 'social_oauth_accounts',
        entityId: acc.id,
        payload: { provider: acc.provider, externalAccountId: acc.externalAccountId, accountName: acc.accountName, source: 'instagram_direct' },
        request,
      })
    }

    return redirect({ connected: 'instagram' })
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'oauth_failed'
    const msg = raw.replace(/[^a-z0-9_]/gi, '_').slice(0, 60) || 'oauth_failed'
    return redirect({ error: msg })
  }
}

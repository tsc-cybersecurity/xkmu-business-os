import { NextRequest, NextResponse } from 'next/server'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { verifyState } from '@/lib/utils/oauth-state'

const RETURN_PATH = '/intern/integrations/social'

function redirect(qs: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = new URL(RETURN_PATH, base)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url.toString(), 302)
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
    const short = await MetaOAuthClient.exchangeCode(code)
    const long = await MetaOAuthClient.exchangeForLongLived(short.accessToken)
    const pages = await MetaOAuthClient.listPagesWithIg(long.accessToken)

    if (pages.length === 0) return redirect({ error: 'no_pages_found' })
    if (pages.length > 1) return redirect({ error: 'multiple_pages_unsupported_v1' })

    await SocialAccountService.connectMeta({
      longUserToken: long.accessToken,
      expiresInSec: long.expiresInSec,
      selectedPageId: pages[0].pageId,
      userId: parsed.uid,
    })

    return redirect({ connected: 'meta' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed'
    return redirect({ error: msg })
  }
}

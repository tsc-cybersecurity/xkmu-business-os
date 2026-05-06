import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { InstagramOAuthClient } from '@/lib/services/social/instagram-oauth.client'
import { signState } from '@/lib/utils/oauth-state'

function settingsRedirect(qs: Record<string, string>): NextResponse {
  const url = new URL('/intern/integrations/social', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET || !process.env.INSTAGRAM_OAUTH_REDIRECT_URI) {
      return settingsRedirect({ error: 'instagram_not_configured' })
    }
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    const state = signState({ uid: auth.userId, n: nonce, t: Date.now() }, cfg.appointmentTokenSecret)
    const url = InstagramOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}

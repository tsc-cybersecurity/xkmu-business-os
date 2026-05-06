import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { signState } from '@/lib/utils/oauth-state'

function settingsRedirect(qs: Record<string, string>): NextResponse {
  const url = new URL('/intern/integrations/social', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    // Friendly check before MetaOAuthClient throws a 500
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.META_OAUTH_REDIRECT_URI) {
      return settingsRedirect({ error: 'meta_not_configured' })
    }
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    // appointmentTokenSecret is the shared OAuth-state HMAC key (same key used by
    // google-calendar oauth). Extract to a dedicated field if secrets ever rotate independently.
    const state = signState({ uid: auth.userId, n: nonce, t: Date.now() }, cfg.appointmentTokenSecret)
    const url = MetaOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}

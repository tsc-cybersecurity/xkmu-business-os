import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { XOAuthClient, generatePkcePair } from '@/lib/services/social/x-oauth.client'
import { signState } from '@/lib/utils/oauth-state'

const PKCE_COOKIE = 'xkmu_x_pkce_v'
const PKCE_TTL_SEC = 600 // 10 Minuten — sollte reichen fuer den OAuth-Flow

async function settingsRedirect(qs: Record<string, string>): Promise<NextResponse> {
  const baseUrl = await CmsDesignService.getAppUrl()
  const url = new URL('/intern/integrations/social', baseUrl)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET || !process.env.X_OAUTH_REDIRECT_URI) {
      return await settingsRedirect({ error: 'x_not_configured' })
    }
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    const state = signState({ uid: auth.userId, n: nonce, t: Date.now() }, cfg.appointmentTokenSecret)
    const { verifier, challenge } = generatePkcePair()
    const url = XOAuthClient.buildAuthorizeUrl(state, challenge)

    const response = NextResponse.redirect(url, 302)
    // PKCE-Verifier per httpOnly-Cookie persistieren — der Callback liest ihn
    // wieder aus. Cookie ist auf /api/social/x/ scoped, damit er nur fuer den
    // X-OAuth-Flow gilt und nicht in andere Requests leakt.
    response.cookies.set(PKCE_COOKIE, verifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/social/x/',
      maxAge: PKCE_TTL_SEC,
    })
    return response
  })
}

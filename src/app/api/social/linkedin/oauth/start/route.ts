import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { LinkedInOAuthClient } from '@/lib/services/social/linkedin-oauth.client'
import { signState } from '@/lib/utils/oauth-state'

async function settingsRedirect(qs: Record<string, string>): Promise<NextResponse> {
  const baseUrl = await CmsDesignService.getAppUrl()
  const url = new URL('/intern/integrations/social', baseUrl)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 302)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || !process.env.LINKEDIN_OAUTH_REDIRECT_URI) {
      return await settingsRedirect({ error: 'linkedin_not_configured' })
    }
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    const state = signState({ uid: auth.userId, n: nonce, t: Date.now() }, cfg.appointmentTokenSecret)
    const url = LinkedInOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}

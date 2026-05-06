import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'
import { signState } from '@/lib/utils/oauth-state'

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    // appointmentTokenSecret is the shared OAuth-state HMAC key (same key used by
    // google-calendar oauth). Extract to a dedicated field if secrets ever rotate independently.
    const state = signState({ uid: auth.userId, n: nonce, t: Date.now() }, cfg.appointmentTokenSecret)
    const url = MetaOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}

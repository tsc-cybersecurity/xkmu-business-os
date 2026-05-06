import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'node:crypto'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { MetaOAuthClient } from '@/lib/services/social/meta-oauth.client'

/**
 * Signs an OAuth state payload with HMAC-SHA256.
 * Duplicated from src/app/api/google-calendar/oauth/start/route.ts
 * — shared pattern, no shared module yet (pragmatic inline copy).
 */
function signState(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    const cfg = await CalendarConfigService.getConfig()
    const nonce = randomBytes(16).toString('hex')
    const stateRaw = JSON.stringify({ uid: auth.userId, n: nonce, t: Date.now() })
    const sig = signState(stateRaw, cfg.appointmentTokenSecret)
    const state = `${Buffer.from(stateRaw).toString('base64url')}.${sig}`
    const url = MetaOAuthClient.buildAuthorizeUrl(state)
    return NextResponse.redirect(url, 302)
  })
}

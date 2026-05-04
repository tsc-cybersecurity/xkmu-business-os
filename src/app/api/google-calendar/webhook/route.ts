import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { userCalendarAccounts } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CalendarSyncService } from '@/lib/services/calendar-sync.service'
import { logger } from '@/lib/utils/logger'

function deriveChannelToken(masterSecret: string): string {
  // Domain-separated sub-key so the watch token sent to Google is not the
  // same value used for OAuth-state HMAC and cancel/reschedule tokens.
  return createHmac('sha256', masterSecret).update('watch-channel').digest('hex')
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const channelId = request.headers.get('X-Goog-Channel-Id') || request.headers.get('x-goog-channel-id')
  const channelToken = request.headers.get('X-Goog-Channel-Token') || request.headers.get('x-goog-channel-token')
  const resourceState = request.headers.get('X-Goog-Resource-State') || request.headers.get('x-goog-resource-state')
  const messageNumStr = request.headers.get('X-Goog-Message-Number') || request.headers.get('x-goog-message-number')

  if (!channelId || !resourceState) {
    return NextResponse.json({ error: 'missing_headers' }, { status: 400 })
  }

  // Find account by channel id
  const rows = await db.select().from(userCalendarAccounts)
    .where(and(eq(userCalendarAccounts.watchChannelId, channelId), isNull(userCalendarAccounts.revokedAt)))
    .limit(1)
  const account = rows[0]
  if (!account) {
    // Google retries on 5xx but not 4xx. Returning 404 lets Google drop the channel.
    return NextResponse.json({ error: 'channel_not_found' }, { status: 404 })
  }

  // Validate channel token (timing-safe; derived sub-key, not raw master secret)
  const cfg = await CalendarConfigService.getConfig()
  const expected = deriveChannelToken(cfg.appointmentTokenSecret)
  const got = channelToken ?? ''
  const a = Buffer.from(got, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  // Idempotency
  const messageNum = messageNumStr ? parseInt(messageNumStr, 10) : null
  if (messageNum !== null && account.lastMessageNumber !== null && messageNum <= account.lastMessageNumber) {
    return NextResponse.json({ ok: true, skipped: 'duplicate_or_older_message' })
  }

  // Initial 'sync' state — Google sent it after channel creation, no pull needed
  if (resourceState === 'sync') {
    if (messageNum !== null) {
      await db.update(userCalendarAccounts)
        .set({ lastMessageNumber: messageNum, updatedAt: new Date() })
        .where(eq(userCalendarAccounts.id, account.id))
    }
    return NextResponse.json({ ok: true, state: 'sync' })
  }

  // Channel deleted by Google — clear locally; cron will renew
  if (resourceState === 'not_exists') {
    await db.update(userCalendarAccounts).set({
      watchChannelId: null,
      watchResourceId: null,
      watchExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, account.id))
    return NextResponse.json({ ok: true, state: 'not_exists' })
  }

  // Normal change — incremental sync
  if (resourceState === 'exists') {
    try {
      const out = await CalendarSyncService.incrementalSync(account.id)
      if (messageNum !== null) {
        await db.update(userCalendarAccounts)
          .set({ lastMessageNumber: messageNum, updatedAt: new Date() })
          .where(eq(userCalendarAccounts.id, account.id))
      }
      return NextResponse.json({ ok: true, ...out })
    } catch (err) {
      logger.error('webhook incremental sync failed', err, { accountId: account.id })
      // Return 200 to avoid Google retrying — we'll catch up on the next cron tick
      return NextResponse.json({ ok: false, error: 'sync_failed' })
    }
  }

  return NextResponse.json({ ok: true, state: resourceState })
}

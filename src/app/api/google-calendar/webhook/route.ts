import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { userCalendarsWatched } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

  // Find watched calendar by channel id (Migration 025 — Channels leben pro Kalender)
  const watched = await CalendarSyncService.getWatchedByChannelId(channelId)
  if (!watched) {
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
  if (messageNum !== null && watched.lastMessageNumber !== null && messageNum <= watched.lastMessageNumber) {
    return NextResponse.json({ ok: true, skipped: 'duplicate_or_older_message' })
  }

  // Initial 'sync' state — Google sent it after channel creation, no pull needed
  if (resourceState === 'sync') {
    if (messageNum !== null) {
      await db.update(userCalendarsWatched)
        .set({ lastMessageNumber: messageNum })
        .where(eq(userCalendarsWatched.id, watched.id))
    }
    return NextResponse.json({ ok: true, state: 'sync' })
  }

  // Channel deleted by Google — clear locally; cron will renew
  if (resourceState === 'not_exists') {
    await db.update(userCalendarsWatched).set({
      watchChannelId: null,
      watchResourceId: null,
      watchExpiresAt: null,
    }).where(eq(userCalendarsWatched.id, watched.id))
    return NextResponse.json({ ok: true, state: 'not_exists' })
  }

  // Normal change — incremental sync (per Kalender)
  if (resourceState === 'exists') {
    try {
      const out = await CalendarSyncService.incrementalSyncCalendar(watched.id)
      if (messageNum !== null) {
        await db.update(userCalendarsWatched)
          .set({ lastMessageNumber: messageNum })
          .where(eq(userCalendarsWatched.id, watched.id))
      }
      return NextResponse.json({ ok: true, ...out })
    } catch (err) {
      logger.error('webhook incremental sync failed', err, { watchedId: watched.id, accountId: watched.accountId })
      // Return 200 to avoid Google retrying — we'll catch up on the next cron tick
      return NextResponse.json({ ok: false, error: 'sync_failed' })
    }
  }

  return NextResponse.json({ ok: true, state: resourceState })
}

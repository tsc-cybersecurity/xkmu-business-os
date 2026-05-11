import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { CalendarAccountService } from './calendar-account.service'
import { CalendarSyncService } from './calendar-sync.service'
import { logger } from '@/lib/utils/logger'

const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000  // renew channels expiring within 24h

/**
 * Maintenance for all active calendar accounts:
 * - Proactive token refresh (the underlying service refreshes when < 60s to expiry)
 * - Channel renewal pro Kalender (Migration 025): stop + re-watch wenn
 *   watch_expires_at < now + 24h. Iteriert ueber alle readForBusy=true Kalender,
 *   nicht nur den primaeren.
 */
export async function runCalendarSyncMaintenance(): Promise<{
  totalAccounts: number
  totalCalendars: number
  refreshed: number
  renewed: number
  failed: number
}> {
  const accounts = await db.select().from(userCalendarAccounts)
    .where(isNull(userCalendarAccounts.revokedAt))

  let refreshed = 0
  let renewed = 0
  let failed = 0
  let totalCalendars = 0

  for (const acc of accounts) {
    try {
      // Touch the access token; the service refreshes if near expiry
      const before = acc.tokenExpiresAt.getTime()
      await CalendarAccountService.getValidAccessToken(acc.id)
      // We can't easily detect whether a refresh happened without re-reading;
      // count an attempt as "refreshed" when the original was within 30 min of expiry
      if (before < Date.now() + 30 * 60 * 1000) refreshed++

      // Channel renewal pro Kalender
      const watched = await db.select().from(userCalendarsWatched).where(and(
        eq(userCalendarsWatched.accountId, acc.id),
        eq(userCalendarsWatched.readForBusy, true),
      ))
      totalCalendars += watched.length

      for (const w of watched) {
        const expiresAt = w.watchExpiresAt?.getTime() ?? 0
        if (!w.watchChannelId || expiresAt < Date.now() + RENEWAL_THRESHOLD_MS) {
          try {
            await CalendarSyncService.stopWatchCalendar(w.id)
          } catch {
            // ignore — best-effort cleanup
          }
          try {
            await CalendarSyncService.setupWatchCalendar(w.id)
            renewed++
          } catch (err) {
            failed++
            logger.error('calendar watch renewal failed', err, { watchedId: w.id, accountId: acc.id })
          }
        }
      }
    } catch (err) {
      failed++
      logger.error('calendar maintenance failed for account', err, { accountId: acc.id })
    }
  }

  return { totalAccounts: accounts.length, totalCalendars, refreshed, renewed, failed }
}

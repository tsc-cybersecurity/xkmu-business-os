import { db } from '@/lib/db'
import { userCalendarAccounts } from '@/lib/db/schema'
import { isNull } from 'drizzle-orm'
import { CalendarAccountService } from './calendar-account.service'
import { CalendarSyncService } from './calendar-sync.service'
import { logger } from '@/lib/utils/logger'

const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000  // renew channels expiring within 24h

/**
 * Maintenance for all active calendar accounts:
 * - Proactive token refresh (the underlying service refreshes when < 60s to expiry)
 * - Channel renewal: stop + re-watch when watch_expires_at < now + 24h
 */
export async function runCalendarSyncMaintenance(): Promise<{
  total: number
  refreshed: number
  renewed: number
  failed: number
}> {
  const accounts = await db.select().from(userCalendarAccounts)
    .where(isNull(userCalendarAccounts.revokedAt))

  let refreshed = 0
  let renewed = 0
  let failed = 0

  for (const acc of accounts) {
    try {
      // Touch the access token; the service refreshes if near expiry
      const before = acc.tokenExpiresAt.getTime()
      await CalendarAccountService.getValidAccessToken(acc.id)
      // We can't easily detect whether a refresh happened without re-reading;
      // count an attempt as "refreshed" when the original was within 30 min of expiry
      if (before < Date.now() + 30 * 60 * 1000) refreshed++

      // Channel renewal
      const expiresAt = acc.watchExpiresAt?.getTime() ?? 0
      if (!acc.watchChannelId || expiresAt < Date.now() + RENEWAL_THRESHOLD_MS) {
        try {
          await CalendarSyncService.stopWatch(acc.id)
        } catch {
          // ignore — best-effort cleanup
        }
        await CalendarSyncService.setupWatch(acc.id)
        renewed++
      }
    } catch (err) {
      failed++
      logger.error('calendar maintenance failed for account', err, { accountId: acc.id })
    }
  }

  return { total: accounts.length, refreshed, renewed, failed }
}

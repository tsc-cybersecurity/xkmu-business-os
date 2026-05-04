import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { encryptToken, decryptToken } from './calendar-token-crypto'
import { CalendarGoogleClient, type CalendarListEntry } from './calendar-google.client'

export interface StoreNewAccountInput {
  userId: string
  googleEmail: string
  accessToken: string
  refreshToken: string
  expiresInSec: number
  scopes: string[]
  calendars: CalendarListEntry[]
}

export const CalendarAccountService = {
  async getActiveAccount(userId: string) {
    const rows = await db.select().from(userCalendarAccounts).where(
      and(eq(userCalendarAccounts.userId, userId), isNull(userCalendarAccounts.revokedAt)),
    ).limit(1)
    return rows[0] ?? null
  },

  async getById(accountId: string) {
    const rows = await db.select().from(userCalendarAccounts).where(eq(userCalendarAccounts.id, accountId)).limit(1)
    return rows[0] ?? null
  },

  async storeNewAccount(input: StoreNewAccountInput) {
    const expiresAt = new Date(Date.now() + input.expiresInSec * 1000)
    const primary = input.calendars.find(c => c.isPrimary)
    const [acc] = await db.insert(userCalendarAccounts).values({
      userId: input.userId,
      provider: 'google',
      googleEmail: input.googleEmail,
      accessTokenEnc: encryptToken(input.accessToken),
      refreshTokenEnc: encryptToken(input.refreshToken),
      tokenExpiresAt: expiresAt,
      scopes: input.scopes,
      primaryCalendarId: primary?.id ?? input.calendars[0]?.id ?? null,
    }).returning({ id: userCalendarAccounts.id })

    if (input.calendars.length > 0) {
      await db.insert(userCalendarsWatched).values(
        input.calendars.map(c => ({
          accountId: acc.id,
          googleCalendarId: c.id,
          displayName: c.summary,
          readForBusy: c.isPrimary, // default: nur primary aktiv
        })),
      )
    }
    return acc
  },

  /**
   * Liefert einen gültigen Access-Token. Refresht wenn `< now + 60s`.
   * Concurrent-Schutz: pg advisory lock auf account_id (hash).
   */
  async getValidAccessToken(accountId: string): Promise<string> {
    const acc = await this.getById(accountId)
    if (!acc || acc.revokedAt) throw new Error(`Account ${accountId} not active`)

    const expiresAtMs = acc.tokenExpiresAt.getTime()
    if (expiresAtMs > Date.now() + 60_000) {
      return decryptToken(acc.accessTokenEnc)
    }

    // Refresh nötig — advisory lock setzen
    const lockKey = hashLockKey(accountId)
    await db.execute(sql`SELECT pg_advisory_lock(${lockKey})`)
    try {
      // Re-read nach Lock — vielleicht hat anderer Worker schon refreshed
      const fresh = await this.getById(accountId)
      if (fresh && fresh.tokenExpiresAt.getTime() > Date.now() + 60_000) {
        return decryptToken(fresh.accessTokenEnc)
      }
      try {
        const refreshed = await CalendarGoogleClient.refreshAccessToken(decryptToken(acc.refreshTokenEnc))
        const newExpires = new Date(Date.now() + refreshed.expiresInSec * 1000)
        await db.update(userCalendarAccounts).set({
          accessTokenEnc: encryptToken(refreshed.accessToken),
          tokenExpiresAt: newExpires,
          updatedAt: new Date(),
        }).where(eq(userCalendarAccounts.id, accountId))
        return refreshed.accessToken
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('invalid_grant')) {
          await db.update(userCalendarAccounts).set({
            revokedAt: new Date(), updatedAt: new Date(),
          }).where(eq(userCalendarAccounts.id, accountId))
        }
        throw err
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${lockKey})`)
    }
  },

  async revoke(accountId: string) {
    const acc = await this.getById(accountId)
    if (!acc || acc.revokedAt) return
    try {
      await CalendarGoogleClient.revokeToken(decryptToken(acc.refreshTokenEnc))
    } catch {
      // best-effort — wenn Google nicht erreichbar, lokal trotzdem revoken
    }
    await db.update(userCalendarAccounts).set({
      revokedAt: new Date(), updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },

  async listWatchedCalendars(accountId: string) {
    return db.select().from(userCalendarsWatched).where(eq(userCalendarsWatched.accountId, accountId))
  },

  async setPrimaryCalendar(accountId: string, googleCalendarId: string) {
    await db.update(userCalendarAccounts).set({
      primaryCalendarId: googleCalendarId, updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },

  async setReadForBusy(watchedId: string, readForBusy: boolean) {
    await db.update(userCalendarsWatched).set({ readForBusy })
      .where(eq(userCalendarsWatched.id, watchedId))
  },
}

function hashLockKey(uuid: string): number {
  // Stabiler 31-bit Hash für pg_advisory_lock (signed int4)
  let h = 0
  for (let i = 0; i < uuid.length; i++) {
    h = ((h << 5) - h + uuid.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

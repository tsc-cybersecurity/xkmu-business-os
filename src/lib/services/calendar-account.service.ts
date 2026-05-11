import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched, type UserCalendarAccount } from '@/lib/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { encryptToken, decryptToken } from './calendar-token-crypto'
import { CalendarGoogleClient, type CalendarListEntry } from './calendar-google.client'
import { CalendarConfigService } from './calendar-config.service'

export interface StoreNewAccountInput {
  userId: string
  googleEmail: string
  accessToken: string
  refreshToken: string
  expiresInSec: number
  scopes: string[]
  calendars: CalendarListEntry[]
}

async function requireOauthConfig() {
  const cfg = await CalendarConfigService.getConfig()
  if (!CalendarConfigService.isConfigured(cfg)) {
    throw new Error('Google Calendar integration not configured — set credentials under Einstellungen → Integrations')
  }
  return cfg as typeof cfg & { clientId: string; clientSecret: string; redirectUri: string; appPublicUrl: string }
}

export const CalendarAccountService = {
  async getActiveAccount(userId: string): Promise<UserCalendarAccount | null> {
    const rows = await db.select().from(userCalendarAccounts).where(
      and(eq(userCalendarAccounts.userId, userId), isNull(userCalendarAccounts.revokedAt)),
    ).limit(1)
    return rows[0] ?? null
  },

  async getById(accountId: string): Promise<UserCalendarAccount | null> {
    const rows = await db.select().from(userCalendarAccounts).where(eq(userCalendarAccounts.id, accountId)).limit(1)
    return rows[0] ?? null
  },

  async storeNewAccount(input: StoreNewAccountInput) {
    const cfg = await CalendarConfigService.getConfig()
    const expiresAt = new Date(Date.now() + input.expiresInSec * 1000)
    const primary = input.calendars.find(c => c.isPrimary)
    const primaryId = primary?.id ?? input.calendars[0]?.id ?? null

    // Reconnect-Pfad: existiert bereits ein revoked oder aktiver Account fuer
    // diesen User+Provider, dann reanimieren wir ihn statt neu anzulegen.
    // Damit bleiben external_busy/userCalendarsWatched-Eintraege gueltig
    // (verknuepft via account_id) — sonst wuerden alte Sync-Daten nach
    // Reconnect ins Leere zeigen und die Slot-Anzeige zaehlt sie nicht.
    // Aktiven Account bevorzugen, falls ein User aus historischen Reconnects
    // eine Split-Brain-Situation hat (mehrere Rows fuer gleiche user+provider).
    const existingRows = await db.select().from(userCalendarAccounts)
      .where(and(
        eq(userCalendarAccounts.userId, input.userId),
        eq(userCalendarAccounts.provider, 'google'),
      ))
      .orderBy(sql`revoked_at NULLS FIRST`, sql`updated_at DESC`)
      .limit(1)
    const existing = existingRows[0]

    // Split-Brain heilen: external_busy + userCalendarsWatched aus etwaigen
    // anderen (alten/revoked) Accounts auf diesen umhaengen, sonst bleiben
    // alte Sync-Daten orphaned und die Slot-Anzeige sieht sie nicht.
    if (existing) {
      await db.execute(sql`
        UPDATE external_busy SET account_id = ${existing.id}
        WHERE account_id IN (
          SELECT id FROM user_calendar_accounts
          WHERE user_id = ${input.userId} AND provider = 'google' AND id <> ${existing.id}
        )
      `)
      await db.execute(sql`
        DELETE FROM user_calendars_watched
        WHERE account_id IN (
          SELECT id FROM user_calendar_accounts
          WHERE user_id = ${input.userId} AND provider = 'google' AND id <> ${existing.id}
        )
      `)
      // Alte Account-Rows weg — wir brauchen die History nicht und sie blocken
      // sonst zukuenftige Lookups. Tokens sind dort eh schon revoked.
      await db.execute(sql`
        DELETE FROM user_calendar_accounts
        WHERE user_id = ${input.userId} AND provider = 'google' AND id <> ${existing.id}
      `)
    }

    if (existing) {
      await db.update(userCalendarAccounts).set({
        googleEmail: input.googleEmail,
        accessTokenEnc: encryptToken(input.accessToken, cfg.tokenEncryptionKeyHex),
        refreshTokenEnc: encryptToken(input.refreshToken, cfg.tokenEncryptionKeyHex),
        tokenExpiresAt: expiresAt,
        scopes: input.scopes,
        primaryCalendarId: primaryId,
        revokedAt: null,
        updatedAt: new Date(),
      }).where(eq(userCalendarAccounts.id, existing.id))

      // Watched-Calendars deduplizieren: existing rows behalten + Sync-State,
      // nur fuer NEUE Calendar-IDs Eintraege anlegen.
      const existingWatched = await db.select().from(userCalendarsWatched)
        .where(eq(userCalendarsWatched.accountId, existing.id))
      const knownIds = new Set(existingWatched.map(w => w.googleCalendarId))
      const newWatched = input.calendars.filter(c => !knownIds.has(c.id))
      if (newWatched.length > 0) {
        await db.insert(userCalendarsWatched).values(
          newWatched.map(c => ({
            accountId: existing.id,
            googleCalendarId: c.id,
            displayName: c.summary,
            readForBusy: c.isPrimary,
          })),
        )
      }
      return { id: existing.id }
    }

    // Neuer Account
    const [acc] = await db.insert(userCalendarAccounts).values({
      userId: input.userId,
      provider: 'google',
      googleEmail: input.googleEmail,
      accessTokenEnc: encryptToken(input.accessToken, cfg.tokenEncryptionKeyHex),
      refreshTokenEnc: encryptToken(input.refreshToken, cfg.tokenEncryptionKeyHex),
      tokenExpiresAt: expiresAt,
      scopes: input.scopes,
      primaryCalendarId: primaryId,
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

    const cfg = await CalendarConfigService.getConfig()

    const expiresAtMs = acc.tokenExpiresAt.getTime()
    if (expiresAtMs > Date.now() + 60_000) {
      return decryptToken(acc.accessTokenEnc, cfg.tokenEncryptionKeyHex)
    }

    // Refresh nötig — advisory lock setzen
    const lockKey = hashLockKey(accountId)
    await db.execute(sql`SELECT pg_advisory_lock(${lockKey})`)
    try {
      // Re-read nach Lock — vielleicht hat anderer Worker schon refreshed
      const fresh = await this.getById(accountId)
      if (fresh && fresh.tokenExpiresAt.getTime() > Date.now() + 60_000) {
        return decryptToken(fresh.accessTokenEnc, cfg.tokenEncryptionKeyHex)
      }
      const oauthCfg = await requireOauthConfig()
      try {
        const refreshed = await CalendarGoogleClient.refreshAccessToken(
          decryptToken(acc.refreshTokenEnc, cfg.tokenEncryptionKeyHex),
          { clientId: oauthCfg.clientId, clientSecret: oauthCfg.clientSecret },
        )
        const newExpires = new Date(Date.now() + refreshed.expiresInSec * 1000)
        await db.update(userCalendarAccounts).set({
          accessTokenEnc: encryptToken(refreshed.accessToken, cfg.tokenEncryptionKeyHex),
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
    const cfg = await CalendarConfigService.getConfig()
    try {
      await CalendarGoogleClient.revokeToken(decryptToken(acc.refreshTokenEnc, cfg.tokenEncryptionKeyHex))
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

  async setReadForBusy(watchedId: string, accountId: string, readForBusy: boolean) {
    await db.update(userCalendarsWatched).set({ readForBusy })
      .where(and(
        eq(userCalendarsWatched.id, watchedId),
        eq(userCalendarsWatched.accountId, accountId),
      ))
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

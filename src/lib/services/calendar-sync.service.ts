import { db } from '@/lib/db'
import { externalBusy, userCalendarAccounts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { createHmac, randomUUID } from 'node:crypto'
import { CalendarAccountService } from './calendar-account.service'
import { CalendarConfigService } from './calendar-config.service'
import { CalendarGoogleClient, type ExternalEvent } from './calendar-google.client'

function deriveChannelToken(masterSecret: string): string {
  // Domain-separated sub-key — must match the verification in
  // /api/google-calendar/webhook/route.ts
  return createHmac('sha256', masterSecret).update('watch-channel').digest('hex')
}

export const CalendarSyncService = {
  async fullSync(accountId: string, calendarId: string): Promise<{ syncToken: string | null; eventCount: number }> {
    const accessToken = await CalendarAccountService.getValidAccessToken(accountId)
    let pageToken: string | undefined
    let syncToken: string | null = null
    let totalEvents = 0
    do {
      const out = await CalendarGoogleClient.eventsList({
        accessToken, calendarId, pageToken,
      })
      await this.upsertEvents(accountId, calendarId, out.events)
      totalEvents += out.events.length
      pageToken = out.nextPageToken ?? undefined
      if (!pageToken && out.nextSyncToken) {
        syncToken = out.nextSyncToken
      }
    } while (pageToken)
    if (syncToken) {
      await db.update(userCalendarAccounts)
        .set({ syncToken, updatedAt: new Date() })
        .where(eq(userCalendarAccounts.id, accountId))
    }
    return { syncToken, eventCount: totalEvents }
  },

  async incrementalSync(accountId: string): Promise<{ events: number; channelExpired: boolean; reSynced: boolean }> {
    const acc = await CalendarAccountService.getById(accountId)
    if (!acc) throw new Error(`Account ${accountId} not found`)
    if (!acc.primaryCalendarId) throw new Error(`Account ${accountId} has no primary calendar`)
    if (!acc.syncToken) {
      // No sync token yet — do a full sync
      const out = await this.fullSync(accountId, acc.primaryCalendarId)
      return { events: out.eventCount, channelExpired: false, reSynced: true }
    }
    const accessToken = await CalendarAccountService.getValidAccessToken(accountId)
    const out = await CalendarGoogleClient.eventsList({
      accessToken, calendarId: acc.primaryCalendarId, syncToken: acc.syncToken,
    })
    if (out.status === 'sync_token_expired') {
      const fresh = await this.fullSync(accountId, acc.primaryCalendarId)
      return { events: fresh.eventCount, channelExpired: false, reSynced: true }
    }
    await this.upsertEvents(accountId, acc.primaryCalendarId, out.events)
    if (out.nextSyncToken) {
      await db.update(userCalendarAccounts)
        .set({ syncToken: out.nextSyncToken, updatedAt: new Date() })
        .where(eq(userCalendarAccounts.id, accountId))
    }
    return { events: out.events.length, channelExpired: false, reSynced: false }
  },

  async upsertEvents(accountId: string, calendarId: string, events: ExternalEvent[]): Promise<{ inserted: number; deleted: number; skipped: number }> {
    let inserted = 0, deleted = 0, skipped = 0
    for (const ev of events) {
      // Skip our own bookings (created with the extended property).
      // TODO Phase 4: when ev.status === 'cancelled' AND extendedXkmuAppointmentId
      // is set, the corresponding appointment in our DB should be cancelled too.
      // Currently we drop the cancellation signal entirely. Restructure to
      // check status === 'cancelled' first, then handle own-booking case.
      if (ev.extendedXkmuAppointmentId) {
        skipped++
        continue
      }
      // Cancelled or missing time → DELETE
      if (ev.status === 'cancelled' || !ev.start || !ev.end) {
        await db.delete(externalBusy).where(and(
          eq(externalBusy.googleCalendarId, calendarId),
          eq(externalBusy.googleEventId, ev.id),
        ))
        deleted++
        continue
      }
      // Upsert (insert ... on conflict do update)
      await db.insert(externalBusy).values({
        accountId,
        googleCalendarId: calendarId,
        googleEventId: ev.id,
        startAt: ev.start,
        endAt: ev.end,
        etag: ev.etag,
        transparency: ev.transparency,
        isAllDay: ev.isAllDay,
        summary: ev.summary?.slice(0, 500) ?? null,
        lastSyncedAt: new Date(),
      }).onConflictDoUpdate({
        target: [externalBusy.googleCalendarId, externalBusy.googleEventId],
        set: {
          startAt: ev.start,
          endAt: ev.end,
          etag: ev.etag,
          transparency: ev.transparency,
          isAllDay: ev.isAllDay,
          summary: ev.summary?.slice(0, 500) ?? null,
          lastSyncedAt: new Date(),
        },
      })
      inserted++
    }
    return { inserted, deleted, skipped }
  },

  async setupWatch(accountId: string): Promise<void> {
    const cfg = await CalendarConfigService.getConfig()
    if (!cfg.appPublicUrl) {
      throw new Error('app_public_url not set in CalendarConfig — cannot register Google watch channel')
    }
    const acc = await CalendarAccountService.getById(accountId)
    if (!acc) throw new Error(`Account ${accountId} not found`)
    if (!acc.primaryCalendarId) throw new Error(`Account ${accountId} has no primary calendar`)
    const accessToken = await CalendarAccountService.getValidAccessToken(accountId)
    const channelId = randomUUID()
    const webhookUrl = `${cfg.appPublicUrl.replace(/\/$/, '')}/api/google-calendar/webhook`
    const result = await CalendarGoogleClient.channelsWatch({
      accessToken,
      calendarId: acc.primaryCalendarId,
      channelId,
      webhookUrl,
      channelToken: deriveChannelToken(cfg.appointmentTokenSecret),
      ttlSeconds: 7 * 24 * 3600,
    })
    await db.update(userCalendarAccounts).set({
      watchChannelId: result.channelId,
      watchResourceId: result.resourceId,
      watchExpiresAt: new Date(result.expirationMs),
      updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },

  async stopWatch(accountId: string): Promise<void> {
    const acc = await CalendarAccountService.getById(accountId)
    if (!acc || !acc.watchChannelId || !acc.watchResourceId) return
    try {
      const accessToken = await CalendarAccountService.getValidAccessToken(accountId)
      await CalendarGoogleClient.channelsStop({
        accessToken,
        channelId: acc.watchChannelId,
        resourceId: acc.watchResourceId,
      })
    } catch {
      // best-effort — channel may already be gone or token invalid; clear locally either way
    }
    await db.update(userCalendarAccounts).set({
      watchChannelId: null,
      watchResourceId: null,
      watchExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(userCalendarAccounts.id, accountId))
  },
}

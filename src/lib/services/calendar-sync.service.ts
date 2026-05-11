import { db } from '@/lib/db'
import { externalBusy, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { createHmac, randomUUID } from 'node:crypto'
import { CalendarAccountService } from './calendar-account.service'
import { CalendarConfigService } from './calendar-config.service'
import { CalendarGoogleClient, type ExternalEvent } from './calendar-google.client'

// Per-Kalender Sync-State (Migration 025).
// Entwicklungs-Notiz: Vor 025 lebte der Sync-State auf userCalendarAccounts
// und nur primaryCalendarId wurde gesynct. Jetzt iterieren wir ueber alle
// userCalendarsWatched-Eintraege mit readForBusy=true. Account-Felder bleiben
// als Backfill-Quelle bestehen, werden vom Code aber nicht mehr gelesen.

function deriveChannelToken(masterSecret: string): string {
  // Domain-separated sub-key — must match the verification in
  // /api/google-calendar/webhook/route.ts
  return createHmac('sha256', masterSecret).update('watch-channel').digest('hex')
}

interface SyncSummary {
  events: number
  inserted: number
  deleted: number
  skipped: number
}

export const CalendarSyncService = {
  // ---------------------------------------------------------------------------
  // Per-Kalender-Operationen
  // ---------------------------------------------------------------------------

  async fullSyncCalendar(accountId: string, watchedId: string): Promise<SyncSummary> {
    const watched = await this.getWatchedById(watchedId)
    if (!watched || watched.accountId !== accountId) {
      throw new Error(`Watched calendar ${watchedId} not found or wrong account`)
    }
    // Re-attach: alle bestehenden external_busy-Zeilen fuer diesen Kalender
    // auf den aktuellen Account umhaengen, falls sie noch auf alte (revoked
    // oder geloeschte) Account-IDs zeigen. Sonst bleibt orphaned data uebrig
    // und das Slot-Listing (filtert nach aktuellem account_id) sieht sie
    // nicht. Greift speziell bei Reconnects.
    await db.update(externalBusy)
      .set({ accountId })
      .where(and(
        eq(externalBusy.googleCalendarId, watched.googleCalendarId),
        ne(externalBusy.accountId, accountId),
      ))
    const accessToken = await CalendarAccountService.getValidAccessToken(accountId)
    let pageToken: string | undefined
    let syncToken: string | null = null
    let totals: SyncSummary = { events: 0, inserted: 0, deleted: 0, skipped: 0 }
    do {
      const out = await CalendarGoogleClient.eventsList({
        accessToken, calendarId: watched.googleCalendarId, pageToken,
      })
      const stats = await this.upsertEvents(accountId, watched.googleCalendarId, out.events)
      totals.events += out.events.length
      totals.inserted += stats.inserted
      totals.deleted += stats.deleted
      totals.skipped += stats.skipped
      pageToken = out.nextPageToken ?? undefined
      if (!pageToken && out.nextSyncToken) {
        syncToken = out.nextSyncToken
      }
    } while (pageToken)
    if (syncToken) {
      await db.update(userCalendarsWatched)
        .set({ syncToken, lastSyncedAt: new Date() })
        .where(eq(userCalendarsWatched.id, watchedId))
    } else {
      await db.update(userCalendarsWatched)
        .set({ lastSyncedAt: new Date() })
        .where(eq(userCalendarsWatched.id, watchedId))
    }
    return totals
  },

  async incrementalSyncCalendar(watchedId: string): Promise<SyncSummary & { reSynced: boolean }> {
    const watched = await this.getWatchedById(watchedId)
    if (!watched) throw new Error(`Watched calendar ${watchedId} not found`)
    if (!watched.syncToken) {
      const out = await this.fullSyncCalendar(watched.accountId, watchedId)
      return { ...out, reSynced: true }
    }
    const accessToken = await CalendarAccountService.getValidAccessToken(watched.accountId)
    const out = await CalendarGoogleClient.eventsList({
      accessToken, calendarId: watched.googleCalendarId, syncToken: watched.syncToken,
    })
    if (out.status === 'sync_token_expired') {
      const fresh = await this.fullSyncCalendar(watched.accountId, watchedId)
      return { ...fresh, reSynced: true }
    }
    const stats = await this.upsertEvents(watched.accountId, watched.googleCalendarId, out.events)
    if (out.nextSyncToken) {
      await db.update(userCalendarsWatched)
        .set({ syncToken: out.nextSyncToken, lastSyncedAt: new Date() })
        .where(eq(userCalendarsWatched.id, watchedId))
    } else {
      await db.update(userCalendarsWatched)
        .set({ lastSyncedAt: new Date() })
        .where(eq(userCalendarsWatched.id, watchedId))
    }
    return { events: out.events.length, ...stats, reSynced: false }
  },

  async setupWatchCalendar(watchedId: string): Promise<void> {
    const cfg = await CalendarConfigService.getConfig()
    if (!cfg.appPublicUrl) {
      throw new Error('app_public_url not set in CalendarConfig — cannot register Google watch channel')
    }
    const watched = await this.getWatchedById(watchedId)
    if (!watched) throw new Error(`Watched calendar ${watchedId} not found`)
    const accessToken = await CalendarAccountService.getValidAccessToken(watched.accountId)
    const channelId = randomUUID()
    const webhookUrl = `${cfg.appPublicUrl.replace(/\/$/, '')}/api/google-calendar/webhook`
    const result = await CalendarGoogleClient.channelsWatch({
      accessToken,
      calendarId: watched.googleCalendarId,
      channelId,
      webhookUrl,
      channelToken: deriveChannelToken(cfg.appointmentTokenSecret),
      ttlSeconds: 7 * 24 * 3600,
    })
    await db.update(userCalendarsWatched).set({
      watchChannelId: result.channelId,
      watchResourceId: result.resourceId,
      watchExpiresAt: new Date(result.expirationMs),
    }).where(eq(userCalendarsWatched.id, watchedId))
  },

  async stopWatchCalendar(watchedId: string): Promise<void> {
    const watched = await this.getWatchedById(watchedId)
    if (!watched || !watched.watchChannelId || !watched.watchResourceId) return
    try {
      const accessToken = await CalendarAccountService.getValidAccessToken(watched.accountId)
      await CalendarGoogleClient.channelsStop({
        accessToken,
        channelId: watched.watchChannelId,
        resourceId: watched.watchResourceId,
      })
    } catch {
      // best-effort — channel may already be gone or token invalid; clear locally either way
    }
    await db.update(userCalendarsWatched).set({
      watchChannelId: null,
      watchResourceId: null,
      watchExpiresAt: null,
    }).where(eq(userCalendarsWatched.id, watchedId))
  },

  // ---------------------------------------------------------------------------
  // Account-weite Convenience-Wrapper (iterieren ueber alle readForBusy=true)
  // ---------------------------------------------------------------------------

  async fullSyncAccount(accountId: string): Promise<{ calendars: number; events: number; inserted: number; deleted: number; skipped: number }> {
    const watched = await this.listSyncableForAccount(accountId)
    let calendars = 0, events = 0, inserted = 0, deleted = 0, skipped = 0
    for (const w of watched) {
      const out = await this.fullSyncCalendar(accountId, w.id)
      calendars++
      events += out.events
      inserted += out.inserted
      deleted += out.deleted
      skipped += out.skipped
    }
    return { calendars, events, inserted, deleted, skipped }
  },

  async incrementalSyncAccount(accountId: string): Promise<{ calendars: number; events: number; reSynced: number }> {
    const watched = await this.listSyncableForAccount(accountId)
    let calendars = 0, events = 0, reSynced = 0
    for (const w of watched) {
      const out = await this.incrementalSyncCalendar(w.id)
      calendars++
      events += out.events
      if (out.reSynced) reSynced++
    }
    return { calendars, events, reSynced }
  },

  async setupWatchAccount(accountId: string): Promise<{ count: number }> {
    const watched = await this.listSyncableForAccount(accountId)
    let count = 0
    for (const w of watched) {
      await this.setupWatchCalendar(w.id)
      count++
    }
    return { count }
  },

  async stopWatchAccount(accountId: string): Promise<void> {
    const watched = await db.select().from(userCalendarsWatched)
      .where(eq(userCalendarsWatched.accountId, accountId))
    for (const w of watched) {
      await this.stopWatchCalendar(w.id)
    }
  },

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async getWatchedById(watchedId: string) {
    const rows = await db.select().from(userCalendarsWatched)
      .where(eq(userCalendarsWatched.id, watchedId)).limit(1)
    return rows[0] ?? null
  },

  async getWatchedByChannelId(channelId: string) {
    const rows = await db.select().from(userCalendarsWatched)
      .where(eq(userCalendarsWatched.watchChannelId, channelId)).limit(1)
    return rows[0] ?? null
  },

  async listSyncableForAccount(accountId: string) {
    return db.select().from(userCalendarsWatched).where(and(
      eq(userCalendarsWatched.accountId, accountId),
      eq(userCalendarsWatched.readForBusy, true),
    ))
  },

  async upsertEvents(accountId: string, calendarId: string, events: ExternalEvent[]): Promise<{ inserted: number; deleted: number; skipped: number; errors: Array<{ eventId: string; err: string }> }> {
    let inserted = 0, deleted = 0, skipped = 0
    const errors: Array<{ eventId: string; err: string }> = []
    for (const ev of events) {
      try {
        // Frueher: Events mit xkmu_appointment_id wurden geskipped, weil
        // die appointments-Tabelle sie schon haelt. Problem: orphaned
        // Events (appointments-Row geloescht, Google-Event bleibt) blocken
        // dann den Slot nicht. Daher syncen wir jetzt ALLE Events nach
        // external_busy. Visualisierung: Slot ist blockiert; falls auch
        // eine appointments-Row existiert, ueberlagert die UI sie als
        // Buchungs-Card oben drauf.

        // Cancelled or missing time → DELETE
        if (ev.status === 'cancelled' || !ev.start || !ev.end) {
          await db.delete(externalBusy).where(and(
            eq(externalBusy.googleCalendarId, calendarId),
            eq(externalBusy.googleEventId, ev.id),
          ))
          deleted++
          continue
        }
        // Upsert (insert ... on conflict do update). Wichtig: account_id
        // wird auch im UPDATE-Fall mitgeschrieben, sodass alte Zeilen, die
        // noch auf einen frueheren Account-ID zeigen, beim Re-Sync auf den
        // aktiven Account umgehaengt werden (sonst sieht das Slot-Listing
        // diese Events nicht, weil es nach aktuellem account_id filtert).
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
            accountId,
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
      } catch (err) {
        console.error('[CalendarSync] upsert event failed:', { calendarId, eventId: ev.id, err: String(err) })
        if (errors.length < 5) {
          // Drizzle wraps query+params in err.message — der echte Postgres-
          // Grund steckt in err.cause. Beides extrahieren, falls vorhanden.
          const e = err as { message?: string; cause?: { message?: string; code?: string; detail?: string } }
          const causeMsg = e.cause?.message ?? null
          const causeCode = e.cause?.code ?? null
          const causeDetail = e.cause?.detail ?? null
          errors.push({
            eventId: ev.id,
            err: JSON.stringify({
              type: (err as Error).name ?? 'Error',
              causeCode, causeMsg, causeDetail,
              eventSummary: ev.summary?.slice(0, 100) ?? null,
              eventStart: ev.start?.toISOString() ?? null,
              eventEnd: ev.end?.toISOString() ?? null,
              eventIsAllDay: ev.isAllDay,
              eventTransparency: ev.transparency,
            }).slice(0, 800),
          })
        }
        skipped++
      }
    }
    return { inserted, deleted, skipped, errors }
  },

  // ---------------------------------------------------------------------------
  // Backwards-compat shims: alte API-Aufrufer (OAuth-Callback, Tests)
  // erwarten weiterhin die Account-zentrierten Methoden. Diese delegieren
  // jetzt auf die per-Kalender-Versionen.
  // ---------------------------------------------------------------------------

  async fullSync(accountId: string, _calendarId: string): Promise<{ syncToken: string | null; eventCount: number }> {
    const out = await this.fullSyncAccount(accountId)
    return { syncToken: null, eventCount: out.events }
  },

  async incrementalSync(accountId: string): Promise<{ events: number; channelExpired: boolean; reSynced: boolean }> {
    const out = await this.incrementalSyncAccount(accountId)
    return { events: out.events, channelExpired: false, reSynced: out.reSynced > 0 }
  },

  async setupWatch(accountId: string): Promise<void> {
    await this.setupWatchAccount(accountId)
  },

  async stopWatch(accountId: string): Promise<void> {
    await this.stopWatchAccount(accountId)
  },
}

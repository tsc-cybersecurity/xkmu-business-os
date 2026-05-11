import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched, externalBusy, appointments } from '@/lib/db/schema'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { CalendarGoogleClient } from '@/lib/services/calendar-google.client'
import { CalendarSyncService } from '@/lib/services/calendar-sync.service'

/**
 * Diagnose-Endpoint fuer Google-Calendar-Sync.
 *
 * Robust gegen Sub-Query-Failures: jede Section in eigenem try/catch
 * mit safe-Fallback, damit ein fehlerhaftes Stueck nicht den ganzen
 * Endpoint auf 500 reisst.
 */
export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })

    const url = new URL(request.url)
    const probeLive = url.searchParams.get('probe') === '1'
    const forceSync = url.searchParams.get('forceSync') === '1'

    const errors: Record<string, string> = {}
    const safe = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn() } catch (err) { errors[name] = String(err); return fallback }
    }

    // 1. Alle Accounts dieses Users (auch revoked)
    const allAccounts = await safe('accounts', () =>
      db.select().from(userCalendarAccounts).where(eq(userCalendarAccounts.userId, auth.userId!)),
      [] as Array<typeof userCalendarAccounts.$inferSelect>,
    )
    const activeAccount = allAccounts.find(a => a.revokedAt === null)
    const revokedAccounts = allAccounts.filter(a => a.revokedAt !== null)
    const accountIds = allAccounts.map(a => a.id)

    // 2. Watched calendars
    const watched = await safe('watched', async () => {
      if (accountIds.length === 0) return []
      return db.select().from(userCalendarsWatched)
        .where(inArray(userCalendarsWatched.accountId, accountIds))
    }, [] as Array<typeof userCalendarsWatched.$inferSelect>)

    // 3. external_busy fuer naechste 14 Tage
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 14)

    const busyRows = await safe('externalBusy', async () => {
      if (accountIds.length === 0) return []
      return db.select().from(externalBusy)
        .where(and(
          inArray(externalBusy.accountId, accountIds),
          gte(externalBusy.endAt, from),
          lte(externalBusy.startAt, to),
        ))
        .limit(100)
    }, [] as Array<typeof externalBusy.$inferSelect>)

    const orphanedCount = activeAccount
      ? busyRows.filter(r => r.accountId !== activeAccount.id).length
      : 0

    // 4. Appointments fuer naechste 14 Tage
    const apptRows = await safe('appointments', () =>
      db.select({
        id: appointments.id,
        slotTypeId: appointments.slotTypeId,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
        googleEventId: appointments.googleEventId,
        customerName: appointments.customerName,
      }).from(appointments)
        .where(and(
          eq(appointments.userId, auth.userId!),
          gte(appointments.endAt, from),
          lte(appointments.startAt, to),
        )),
      [] as Array<{ id: string }>,
    )

    // 5a. Optional: Force-Sync (mit Trace) — analog zum POST-Handler, nur via GET
    let forceSyncResult: unknown = null
    if (forceSync && activeAccount) {
      forceSyncResult = await safe('forceSync', async () => {
        const accessToken = await CalendarAccountService.getValidAccessToken(activeAccount.id)
        const watchedSync = watched.filter(w => w.accountId === activeAccount.id && w.readForBusy)
        const results: Array<Record<string, unknown>> = []
        for (const w of watchedSync) {
          const trace: Record<string, unknown> = {
            watchedId: w.id,
            googleCalendarId: w.googleCalendarId,
            pages: [] as Array<unknown>,
            upsertStats: { events: 0, inserted: 0, deleted: 0, skipped: 0 },
            error: null as string | null,
          }
          try {
            await db.update(userCalendarsWatched).set({ syncToken: null }).where(eq(userCalendarsWatched.id, w.id))
            const timeMin = new Date(Date.now() - 30 * 86400_000)
            let pageToken: string | undefined
            let pageNum = 0
            do {
              pageNum++
              const out = await CalendarGoogleClient.eventsList({
                accessToken, calendarId: w.googleCalendarId, pageToken,
                timeMin: pageToken ? undefined : timeMin,
              })
              const pageSample = out.events.slice(0, 10).map(e => ({
                id: e.id, summary: e.summary,
                start: e.start?.toISOString() ?? null, end: e.end?.toISOString() ?? null,
                status: e.status, transparency: e.transparency,
                hasXkmuApptId: e.extendedXkmuAppointmentId !== null,
              }))
              ;(trace.pages as Array<unknown>).push({
                page: pageNum, eventCount: out.events.length, sample: pageSample,
                nextPageToken: out.nextPageToken ? `${out.nextPageToken.slice(0, 24)}...` : null,
                nextSyncToken: out.nextSyncToken ? 'set' : null,
              })
              const stats = await CalendarSyncService.upsertEvents(activeAccount.id, w.googleCalendarId, out.events)
              const cum = trace.upsertStats as { events: number; inserted: number; deleted: number; skipped: number }
              cum.events += out.events.length
              cum.inserted += stats.inserted
              cum.deleted += stats.deleted
              cum.skipped += stats.skipped
              if (stats.errors.length > 0 && !(trace.upsertErrors as Array<unknown> | undefined)) {
                trace.upsertErrors = stats.errors
              }
              pageToken = out.nextPageToken ?? undefined
              if (!pageToken && out.nextSyncToken) {
                await db.update(userCalendarsWatched).set({ syncToken: out.nextSyncToken, lastSyncedAt: new Date() })
                  .where(eq(userCalendarsWatched.id, w.id))
              }
            } while (pageToken && pageNum < 20)
            if (pageNum >= 20) trace.warning = 'Page-Limit (20) erreicht'
          } catch (err) {
            trace.error = String(err)
          }
          results.push(trace)
        }
        return results
      }, null)
    }

    // 5. Optional: Live Google-Probe fuer aktiven Account
    let liveProbe: unknown = null
    if (probeLive && activeAccount) {
      liveProbe = await safe('liveProbe', async () => {
        const accessToken = await CalendarAccountService.getValidAccessToken(activeAccount.id)
        const watchedForProbe = watched.filter(w => w.accountId === activeAccount.id && w.readForBusy)
        const calIds = watchedForProbe.map(w => w.googleCalendarId)

        // freeBusy
        const fb = await safe('liveProbe.freeBusy', async () => {
          if (calIds.length === 0) return { busy: [] }
          return CalendarGoogleClient.freeBusyQuery({ accessToken, calendarIds: calIds, timeMin: from, timeMax: to })
        }, { busy: [] as Array<{ calendarId: string; start: Date; end: Date }> })

        // events.list pro Kalender (limit 25)
        const eventsPerCal: Record<string, Array<{ id: string; summary: string | null; start: string | null; end: string | null; transparency: string; hasXkmuApptId: boolean }>> = {}
        for (const cid of calIds) {
          eventsPerCal[cid] = await safe(`liveProbe.events.${cid}`, async () => {
            const list = await CalendarGoogleClient.eventsList({ accessToken, calendarId: cid, timeMin: from })
            return list.events.slice(0, 25).map(e => ({
              id: e.id,
              summary: e.summary,
              start: e.start?.toISOString() ?? null,
              end: e.end?.toISOString() ?? null,
              transparency: e.transparency,
              hasXkmuApptId: e.extendedXkmuAppointmentId !== null,
            }))
          }, [])
        }

        return { freeBusy: fb.busy, eventsPerCalendar: eventsPerCal }
      }, null)
    }

    return NextResponse.json({
      now: new Date().toISOString(),
      window: { from: from.toISOString(), to: to.toISOString() },
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      accounts: {
        total: allAccounts.length,
        active: activeAccount ? {
          id: activeAccount.id,
          googleEmail: activeAccount.googleEmail,
          primaryCalendarId: activeAccount.primaryCalendarId,
          tokenExpiresAt: activeAccount.tokenExpiresAt,
          createdAt: activeAccount.createdAt,
          updatedAt: activeAccount.updatedAt,
        } : null,
        revoked: revokedAccounts.map(a => ({
          id: a.id,
          googleEmail: a.googleEmail,
          revokedAt: a.revokedAt,
        })),
        splitBrain: allAccounts.length > 1,
      },
      watched: watched.map(w => ({
        id: w.id,
        accountId: w.accountId,
        googleCalendarId: w.googleCalendarId,
        displayName: w.displayName,
        readForBusy: w.readForBusy,
        hasSyncToken: w.syncToken !== null,
        watchChannelId: w.watchChannelId,
        watchExpiresAt: w.watchExpiresAt,
        lastSyncedAt: w.lastSyncedAt,
        lastMessageNumber: w.lastMessageNumber,
      })),
      externalBusy: {
        count: busyRows.length,
        orphanedCount,
        sample: busyRows.slice(0, 20),
      },
      appointments: {
        count: apptRows.length,
        sample: apptRows.slice(0, 20),
      },
      liveProbe,
      forceSyncResult,
      hints: buildHints({ allAccounts, watched, busyRows, orphanedCount, activeAccount }),
    })
  })
}

/**
 * POST /api/v1/calendar-account/debug — triggert einen vollstaendigen Force-Sync
 * fuer alle readForBusy=true watched calendars und gibt detaillierte Stats
 * zurueck. Vor jedem Call wird sync_token=null gesetzt, damit Google den
 * gesamten Eventset liefert (kein incremental).
 *
 * Body (optional): { paginate: true } - laesst fullSyncCalendar laufen (mit
 * eigener Paginierung). Default: trace=true gibt zusaetzlich die ersten paar
 * Events pro Page aus, damit man sieht was Google wirklich liefert.
 */
export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })

    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })

    const watched = await db.select().from(userCalendarsWatched)
      .where(and(
        eq(userCalendarsWatched.accountId, account.id),
        eq(userCalendarsWatched.readForBusy, true),
      ))

    const results: Array<Record<string, unknown>> = []

    for (const w of watched) {
      const trace: Record<string, unknown> = {
        watchedId: w.id,
        googleCalendarId: w.googleCalendarId,
        beforeSyncToken: w.syncToken ? `${w.syncToken.slice(0, 24)}...` : null,
        pages: [] as Array<unknown>,
        upsertStats: { events: 0, inserted: 0, deleted: 0, skipped: 0 },
        error: null as string | null,
      }

      try {
        // sync_token nullen
        await db.update(userCalendarsWatched).set({ syncToken: null })
          .where(eq(userCalendarsWatched.id, w.id))

        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        const timeMin = new Date(Date.now() - 30 * 86400_000)
        let pageToken: string | undefined
        let pageNum = 0

        do {
          pageNum++
          const out = await CalendarGoogleClient.eventsList({
            accessToken,
            calendarId: w.googleCalendarId,
            pageToken,
            timeMin: pageToken ? undefined : timeMin,
          })

          const pageSample = out.events.slice(0, 10).map(e => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.toISOString() ?? null,
            end: e.end?.toISOString() ?? null,
            status: e.status,
            transparency: e.transparency,
            hasXkmuApptId: e.extendedXkmuAppointmentId !== null,
          }))

          ;(trace.pages as Array<unknown>).push({
            page: pageNum,
            eventCount: out.events.length,
            sample: pageSample,
            nextPageToken: out.nextPageToken ? `${out.nextPageToken.slice(0, 24)}...` : null,
            nextSyncToken: out.nextSyncToken ? 'set' : null,
          })

          const stats = await CalendarSyncService.upsertEvents(account.id, w.googleCalendarId, out.events)
          const cumStats = trace.upsertStats as { events: number; inserted: number; deleted: number; skipped: number }
          cumStats.events += out.events.length
          cumStats.inserted += stats.inserted
          cumStats.deleted += stats.deleted
          cumStats.skipped += stats.skipped
          if (stats.errors.length > 0 && !(trace.upsertErrors as Array<unknown> | undefined)) {
            trace.upsertErrors = stats.errors
          }

          pageToken = out.nextPageToken ?? undefined
          if (!pageToken && out.nextSyncToken) {
            await db.update(userCalendarsWatched).set({ syncToken: out.nextSyncToken, lastSyncedAt: new Date() })
              .where(eq(userCalendarsWatched.id, w.id))
          }
        } while (pageToken && pageNum < 20)  // Safety: max 20 pages

        if (pageNum >= 20) {
          trace.warning = 'Page-Limit (20) erreicht — Sync wurde abgebrochen'
        }
      } catch (err) {
        trace.error = String(err)
      }

      results.push(trace)
    }

    return NextResponse.json({ ok: true, accountId: account.id, results })
  })
}

function buildHints(input: {
  allAccounts: Array<{ id: string; revokedAt: Date | null }>
  watched: Array<{ readForBusy: boolean; googleCalendarId: string; watchChannelId: string | null; lastSyncedAt: Date | null }>
  busyRows: Array<{ googleCalendarId: string }>
  orphanedCount: number
  activeAccount: { id: string } | undefined
}): string[] {
  const hints: string[] = []
  if (input.allAccounts.length === 0) {
    hints.push('Kein Google-Account verbunden — Termine werden nicht extern blockiert.')
    return hints
  }
  if (!input.activeAccount) {
    hints.push('Alle Accounts sind revoked. Reconnect ueber /intern/settings/profile.')
    return hints
  }
  if (input.allAccounts.length > 1) {
    hints.push(`Split-Brain: ${input.allAccounts.length} Account-Rows fuer einen User. Reconnect oder Re-Sync zum Heilen.`)
  }
  if (input.orphanedCount > 0) {
    hints.push(`${input.orphanedCount} external_busy-Zeilen zeigen auf alten/revoked Account-ID. Re-Sync fuehrt Re-Attach durch.`)
  }
  const readForBusy = input.watched.filter(w => w.readForBusy)
  if (readForBusy.length === 0) {
    hints.push('Keine Kalender als "als belegt zaehlen" markiert. In /intern/settings/profile aktivieren.')
  }
  for (const w of readForBusy) {
    if (!w.watchChannelId) {
      hints.push(`Watch-Channel fehlt fuer ${w.googleCalendarId}. Re-Sync registriert ihn neu.`)
    } else if (!w.lastSyncedAt) {
      hints.push(`Kalender ${w.googleCalendarId}: Watch aktiv, aber fullSync nie erfolgreich abgeschlossen. Re-Sync triggern.`)
    }
  }
  const calsWithBusy = new Set(input.busyRows.map(r => r.googleCalendarId))
  for (const w of readForBusy) {
    if (!calsWithBusy.has(w.googleCalendarId) && w.lastSyncedAt) {
      hints.push(`Kalender ${w.googleCalendarId}: zuletzt gesynced, aber 0 external_busy. ?probe=1 fuer Live-Vergleich mit Google.`)
    }
  }
  if (hints.length === 0) hints.push('Alle Diagnose-Checks ok.')
  return hints
}

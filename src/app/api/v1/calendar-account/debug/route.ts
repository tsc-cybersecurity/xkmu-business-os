import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { userCalendarAccounts, userCalendarsWatched, externalBusy, appointments } from '@/lib/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { CalendarGoogleClient } from '@/lib/services/calendar-google.client'

/**
 * Diagnose-Endpoint fuer Google-Calendar-Sync.
 *
 * Liefert pro authentifiziertem User:
 * - Alle calendar_accounts (auch revoked) inkl. Sync-State
 * - Pro Account: alle watched calendars inkl. watch/sync-State
 * - external_busy-Counts + Sample fuer aktuelle Woche
 * - Mismatch-Detection: external_busy mit account_id <> aktiver Account
 * - Optional: Live Google FreeBusy-Probe (?probe=1)
 */
export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })

    const url = new URL(request.url)
    const probeLive = url.searchParams.get('probe') === '1'

    // 1. Alle Accounts dieses Users (auch revoked) — Split-Brain-Erkennung
    const allAccounts = await db.select().from(userCalendarAccounts)
      .where(eq(userCalendarAccounts.userId, auth.userId))
    const activeAccount = allAccounts.find(a => a.revokedAt === null)
    const revokedAccounts = allAccounts.filter(a => a.revokedAt !== null)

    // 2. Watched calendars (pro Account)
    const accountIds = allAccounts.map(a => a.id)
    const watched = accountIds.length === 0 ? [] : await db.execute(sql`
      SELECT id, account_id, google_calendar_id, display_name, read_for_busy,
             sync_token IS NOT NULL AS has_sync_token,
             watch_channel_id, watch_expires_at, last_synced_at, last_message_number
      FROM user_calendars_watched
      WHERE account_id = ANY(${accountIds}::uuid[])
      ORDER BY account_id, google_calendar_id
    `) as unknown as Array<Record<string, unknown>>

    // 3. external_busy fuer naechste 14 Tage
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 14)

    const busyRows = accountIds.length === 0 ? [] : await db.execute(sql`
      SELECT id, account_id, google_calendar_id, google_event_id,
             start_at, end_at, summary, transparency, last_synced_at
      FROM external_busy
      WHERE account_id = ANY(${accountIds}::uuid[])
        AND end_at >= ${from.toISOString()}::timestamptz
        AND start_at <= ${to.toISOString()}::timestamptz
      ORDER BY start_at
      LIMIT 100
    `) as unknown as Array<Record<string, unknown>>

    const orphanedCount = busyRows.filter(r => r.account_id !== activeAccount?.id).length

    // 4. Appointments fuer naechste 14 Tage (App-Buchungen)
    const apptRows = await db.select({
      id: appointments.id,
      slotTypeId: appointments.slotTypeId,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      googleEventId: appointments.googleEventId,
      customerName: appointments.customerName,
    }).from(appointments)
      .where(and(
        eq(appointments.userId, auth.userId),
        gte(appointments.endAt, from),
        lte(appointments.startAt, to),
      ))

    // 5. Optional: live Google freeBusy + events.list-Probe fuer aktiven Account
    let liveProbe: unknown = null
    if (probeLive && activeAccount) {
      try {
        const accessToken = await CalendarAccountService.getValidAccessToken(activeAccount.id)
        const watchedForProbe = await db.select().from(userCalendarsWatched)
          .where(and(
            eq(userCalendarsWatched.accountId, activeAccount.id),
            eq(userCalendarsWatched.readForBusy, true),
          ))
        const calIds = watchedForProbe.map(w => w.googleCalendarId)
        const fb = calIds.length > 0
          ? await CalendarGoogleClient.freeBusyQuery({ accessToken, calendarIds: calIds, timeMin: from, timeMax: to })
          : { busy: [] }

        // events.list pro Kalender (limit 25)
        const eventsPerCal: Record<string, Array<{ id: string; summary: string | null; start: string | null; end: string | null; transparency: string; hasXkmuApptId: boolean }>> = {}
        for (const cid of calIds) {
          const list = await CalendarGoogleClient.eventsList({ accessToken, calendarId: cid, timeMin: from })
          eventsPerCal[cid] = list.events.slice(0, 25).map(e => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.toISOString() ?? null,
            end: e.end?.toISOString() ?? null,
            transparency: e.transparency,
            hasXkmuApptId: e.extendedXkmuAppointmentId !== null,
          }))
        }

        liveProbe = { freeBusy: fb.busy, eventsPerCalendar: eventsPerCal }
      } catch (err) {
        liveProbe = { error: String(err) }
      }
    }

    return NextResponse.json({
      now: new Date().toISOString(),
      window: { from: from.toISOString(), to: to.toISOString() },
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
      watched,
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
      hints: buildHints({ allAccounts, watched, busyRows, orphanedCount, activeAccount }),
    })
  })
}

function buildHints(input: {
  allAccounts: Array<{ id: string; revokedAt: Date | null }>
  watched: Array<Record<string, unknown>>
  busyRows: Array<Record<string, unknown>>
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
  const readForBusy = input.watched.filter(w => w.read_for_busy === true)
  if (readForBusy.length === 0) {
    hints.push('Keine Kalender als "als belegt zaehlen" markiert. In /intern/settings/profile aktivieren.')
  }
  for (const w of readForBusy) {
    if (w.watch_channel_id === null) {
      hints.push(`Watch-Channel fehlt fuer ${w.google_calendar_id}. Re-Sync registriert ihn neu.`)
    } else if (w.last_synced_at === null) {
      hints.push(`Kalender ${w.google_calendar_id}: Watch aktiv, aber fullSync nie erfolgreich abgeschlossen. Re-Sync triggern.`)
    }
  }
  const calsWithBusy = new Set(input.busyRows.map(r => r.google_calendar_id))
  for (const w of readForBusy) {
    if (!calsWithBusy.has(w.google_calendar_id) && w.last_synced_at !== null) {
      hints.push(`Kalender ${w.google_calendar_id}: zuletzt gesynced, aber 0 external_busy in der naechsten Woche. ?probe=1 fuer Live-Vergleich mit Google.`)
    }
  }
  if (hints.length === 0) hints.push('Alle Diagnose-Checks ok.')
  return hints
}

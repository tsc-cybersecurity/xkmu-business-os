import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { externalBusy, userCalendarsWatched } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'
import { CalendarSyncService } from '@/lib/services/calendar-sync.service'
import { logger } from '@/lib/utils/logger'

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setPrimary'), googleCalendarId: z.string().min(1) }),
  z.object({ action: z.literal('setReadForBusy'), watchedId: z.string().uuid(), readForBusy: z.boolean() }),
  z.object({ action: z.literal('resyncCalendar'), watchedId: z.string().uuid() }),
  z.object({ action: z.literal('resyncAll') }),
])

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const cfg = await CalendarConfigService.getConfig()
    const configured = CalendarConfigService.isConfigured(cfg)
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ account: null, calendars: [], configured })
    const calendars = await CalendarAccountService.listWatchedCalendars(account.id)
    return NextResponse.json({
      account: {
        id: account.id,
        googleEmail: account.googleEmail,
        primaryCalendarId: account.primaryCalendarId,
        connectedAt: account.createdAt,
      },
      calendars: calendars.map((c) => ({
        id: c.id,
        googleCalendarId: c.googleCalendarId,
        displayName: c.displayName,
        readForBusy: c.readForBusy,
        // Sync-State fuer UI-Diagnose
        hasSyncToken: c.syncToken !== null,
        watchActive: c.watchChannelId !== null && c.watchExpiresAt !== null && c.watchExpiresAt.getTime() > Date.now(),
        watchExpiresAt: c.watchExpiresAt,
        lastSyncedAt: c.lastSyncedAt,
      })),
      configured,
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = PatchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })

    if (body.action === 'setPrimary') {
      await CalendarAccountService.setPrimaryCalendar(account.id, body.googleCalendarId)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'setReadForBusy') {
      await CalendarAccountService.setReadForBusy(body.watchedId, account.id, body.readForBusy)
      // Side-effects: bei aktivieren initial syncen + watch registrieren;
      // bei deaktivieren watch stoppen und gecachte external_busy-Eintraege fuer
      // diesen Kalender loeschen, damit alte Daten nicht weiter blocken.
      try {
        if (body.readForBusy) {
          await CalendarSyncService.fullSyncCalendar(account.id, body.watchedId)
          try {
            await CalendarSyncService.setupWatchCalendar(body.watchedId)
          } catch (err) {
            logger.error('setupWatchCalendar failed after enabling readForBusy', err, { watchedId: body.watchedId })
          }
        } else {
          try {
            await CalendarSyncService.stopWatchCalendar(body.watchedId)
          } catch (err) {
            logger.error('stopWatchCalendar failed after disabling readForBusy', err, { watchedId: body.watchedId })
          }
          // Cached busy-Eintraege wegraeumen — sonst blocken sie weiter trotz Toggle off
          const watched = await CalendarSyncService.getWatchedById(body.watchedId)
          if (watched) {
            await db.delete(externalBusy).where(and(
              eq(externalBusy.accountId, account.id),
              eq(externalBusy.googleCalendarId, watched.googleCalendarId),
            ))
          }
        }
      } catch (err) {
        logger.error('readForBusy side-effects failed (toggle was applied)', err, { watchedId: body.watchedId, readForBusy: body.readForBusy })
      }
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'resyncCalendar') {
      const watched = await CalendarSyncService.getWatchedById(body.watchedId)
      if (!watched || watched.accountId !== account.id) {
        return NextResponse.json({ error: 'watched_not_found' }, { status: 404 })
      }
      // Force full re-sync: clear sync-token first
      await db.update(userCalendarsWatched).set({ syncToken: null })
        .where(eq(userCalendarsWatched.id, body.watchedId))
      const sync = await CalendarSyncService.fullSyncCalendar(account.id, body.watchedId)
      // Re-arm watch channel if missing or near expiry
      const refreshed = await CalendarSyncService.getWatchedById(body.watchedId)
      const expiresAt = refreshed?.watchExpiresAt?.getTime() ?? 0
      if (!refreshed?.watchChannelId || expiresAt < Date.now() + 24 * 3600_000) {
        try { await CalendarSyncService.stopWatchCalendar(body.watchedId) } catch {}
        try { await CalendarSyncService.setupWatchCalendar(body.watchedId) } catch (err) {
          logger.error('setupWatchCalendar failed during resync', err, { watchedId: body.watchedId })
        }
      }
      return NextResponse.json({ ok: true, ...sync })
    }

    // resyncAll
    const out = await CalendarSyncService.fullSyncAccount(account.id)
    try { await CalendarSyncService.setupWatchAccount(account.id) } catch (err) {
      logger.error('setupWatchAccount failed during resyncAll', err, { accountId: account.id })
    }
    return NextResponse.json({ ok: true, ...out })
  })
}

export async function DELETE(request: NextRequest) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })
    await CalendarAccountService.revoke(account.id)
    return NextResponse.json({ ok: true })
  })
}

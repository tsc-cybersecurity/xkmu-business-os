import { db } from '@/lib/db'
import { appointments, users, externalBusy } from '@/lib/db/schema'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { SlotTypeService } from './slot-type.service'
import { AvailabilityService } from './availability.service'
import { AvailabilityCalcService } from './availability-calc.service'
import { CalendarAccountService } from './calendar-account.service'
import { CalendarGoogleClient } from './calendar-google.client'
import { LeadMatchService } from './lead-match.service'

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class SlotNoLongerAvailableError extends Error {
  constructor(message = 'Slot is no longer available') {
    super(message)
    this.name = 'SlotNoLongerAvailableError'
  }
}

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface BookInput {
  userId: string
  slotTypeId: string
  startAtUtc: Date
  customerName: string
  customerEmail: string
  customerPhone: string
  customerMessage: string | null
  source: 'public' | 'portal' | 'manual'
}

export interface BookResult {
  id: string
  status: string
  startAt: Date
  endAt: Date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDescription(input: {
  customerEmail: string
  customerPhone: string
  customerMessage: string | null
}): string {
  const lines = [
    `E-Mail: ${input.customerEmail}`,
    `Telefon: ${input.customerPhone}`,
  ]
  if (input.customerMessage) lines.push('', 'Nachricht:', input.customerMessage)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const AppointmentService = {
  async book(input: BookInput): Promise<BookResult> {
    const { userId, slotTypeId, startAtUtc } = input

    // -------------------------------------------------------------------------
    // 1. Load & validate slot type
    // -------------------------------------------------------------------------
    const slotType = await SlotTypeService.getById(slotTypeId)
    if (!slotType || slotType.userId !== userId || !slotType.isActive) {
      throw new Error('slot_type_invalid')
    }
    const endAtUtc = new Date(startAtUtc.getTime() + slotType.durationMinutes * 60_000)

    // -------------------------------------------------------------------------
    // 2. Load user timezone
    // -------------------------------------------------------------------------
    const userRows = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const userTimezone = userRows[0]?.timezone ?? 'Europe/Berlin'

    // -------------------------------------------------------------------------
    // 3. Re-check local availability
    // -------------------------------------------------------------------------
    const windowStart = new Date(startAtUtc.getTime() - 86_400_000)
    const windowEnd   = new Date(startAtUtc.getTime() + 86_400_000)

    const [rules, overrides] = await Promise.all([
      AvailabilityService.listRules(userId),
      AvailabilityService.listOverrides(userId, windowStart, windowEnd),
    ])

    // KNOWN GAP: existing appointments are passed without their own slot-type
    // buffers (we'd need a join to slot_types). Conservative under-blocking is
    // accepted for V1 — fix in Phase 5.
    const existingAppts = await db
      .select({ startAt: appointments.startAt, endAt: appointments.endAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          inArray(appointments.status, ['pending', 'confirmed']),
          gte(appointments.endAt, windowStart),
          lte(appointments.startAt, windowEnd),
        ),
      )
    const apptIntervals = existingAppts.map(a => ({
      startAt: a.startAt,
      endAt: a.endAt,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }))

    // Fetch external busy events in window (opaque, read_for_busy watched calendars)
    // We need to filter by read_for_busy = true watched calendar account IDs for this user.
    // Simpler: fetch all externalBusy for the user's watched calendars.
    // The externalBusy table has accountId → we need the account for this user.
    const account = await CalendarAccountService.getActiveAccount(userId)

    // Fetch watched calendars once and reuse for both externalBusy + live FreeBusy below
    const watchedCalendars = account
      ? await CalendarAccountService.listWatchedCalendars(account.id)
      : []
    const busyCalIds = watchedCalendars.filter(w => w.readForBusy).map(w => w.googleCalendarId)

    let externalBusyIntervals: { startAt: Date; endAt: Date }[] = []
    if (account && busyCalIds.length > 0) {
      const busyRows = await db
        .select({ startAt: externalBusy.startAt, endAt: externalBusy.endAt })
        .from(externalBusy)
        .where(
          and(
            eq(externalBusy.accountId, account.id),
            inArray(externalBusy.googleCalendarId, busyCalIds),
            eq(externalBusy.transparency, 'opaque'),
            gte(externalBusy.endAt, windowStart),
            lte(externalBusy.startAt, windowEnd),
          ),
        )
      externalBusyIntervals = busyRows
    }

    const freeSlots = AvailabilityCalcService.computeFreeSlots({
      slotType: {
        durationMinutes: slotType.durationMinutes,
        bufferBeforeMinutes: slotType.bufferBeforeMinutes,
        bufferAfterMinutes: slotType.bufferAfterMinutes,
        minNoticeHours: slotType.minNoticeHours,
        maxAdvanceDays: slotType.maxAdvanceDays,
      },
      rangeStart: windowStart,
      rangeEnd: windowEnd,
      rules: rules.map(r => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        isActive: r.isActive,
      })),
      overrides: overrides.map(o => ({
        startAt: o.startAt,
        endAt: o.endAt,
        kind: o.kind as 'free' | 'block',
      })),
      appointments: apptIntervals,
      externalBusy: externalBusyIntervals,
      userTimezone,
      now: new Date(),
    })

    const slotMs = startAtUtc.getTime()
    if (!freeSlots.some(s => s.getTime() === slotMs)) {
      throw new SlotNoLongerAvailableError()
    }

    // -------------------------------------------------------------------------
    // 4. Live FreeBusy check (best-effort, fail-open on Google errors)
    // KNOWN GAP: no DB transaction wraps recheck → live FreeBusy → INSERT.
    // Concurrent bookings of the same slot can both pass and both insert.
    // Acceptable for low-traffic single-instance V1; harden in Phase 5.
    // -------------------------------------------------------------------------
    if (account && busyCalIds.length > 0) {
      const calIds = busyCalIds  // reused from above
      {
        try {
          const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
          const fb = await Promise.race([
            CalendarGoogleClient.freeBusyQuery({
              accessToken,
              calendarIds: calIds,
              timeMin: startAtUtc,
              timeMax: endAtUtc,
            }),
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error('timeout')), 3000),
            ),
          ])
          const overlaps = fb.busy.some(b => b.start < endAtUtc && b.end > startAtUtc)
          if (overlaps) throw new SlotNoLongerAvailableError('busy_in_google')
        } catch (err) {
          if (err instanceof SlotNoLongerAvailableError) throw err
          // fail-open on any other error (Google down, timeout)
          console.warn('FreeBusy check failed, proceeding optimistically:', err)
        }
      }
    }

    // -------------------------------------------------------------------------
    // 5. Lead-Match (outside any TX)
    // -------------------------------------------------------------------------
    const { leadId, personId } = await LeadMatchService.findOrCreate({
      email: input.customerEmail,
      name: input.customerName,
      phone: input.customerPhone,
      source: 'public_booking',
    })

    // -------------------------------------------------------------------------
    // 6. INSERT appointment (status='pending', googleEventId=null)
    // -------------------------------------------------------------------------
    const [appt] = await db.insert(appointments).values({
      userId,
      slotTypeId: input.slotTypeId,
      startAt: startAtUtc,
      endAt: endAtUtc,
      status: 'pending',
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerMessage: input.customerMessage,
      leadId,
      personId,
      source: input.source,
    }).returning()

    // -------------------------------------------------------------------------
    // 7. Sync Google event (synchronous; set syncError on failure, still confirmed)
    // -------------------------------------------------------------------------
    if (account && account.primaryCalendarId) {
      try {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        const event = await CalendarGoogleClient.eventsInsert({
          accessToken,
          calendarId: account.primaryCalendarId,
          summary: `${slotType.name} – ${input.customerName}`,
          description: buildDescription(input),
          startUtc: startAtUtc,
          endUtc: endAtUtc,
          timeZone: userTimezone,
          attendeeEmail: input.customerEmail,
          attendeeName: input.customerName,
          appointmentId: appt.id,
          sendUpdates: 'none',
        })
        await db.update(appointments).set({
          status: 'confirmed',
          googleEventId: event.id,
          googleCalendarId: account.primaryCalendarId,
          updatedAt: new Date(),
        }).where(eq(appointments.id, appt.id))
      } catch (err) {
        await db.update(appointments).set({
          status: 'confirmed',
          syncError: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
          updatedAt: new Date(),
        }).where(eq(appointments.id, appt.id))
      }
    } else {
      await db.update(appointments).set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(appointments.id, appt.id))
    }

    // -------------------------------------------------------------------------
    // 8. Queue confirmation mails + reminders (fail-open)
    // -------------------------------------------------------------------------
    try {
      const { AppointmentMailService } = await import('./appointment-mail.service')
      await AppointmentMailService.queueConfirmation(appt.id)
      await AppointmentMailService.queueReminders(appt.id)
    } catch (err) {
      // Log but don't fail the booking — mail can be retried via task_queue
      console.error('Failed to queue confirmation mails / reminders:', err)
    }

    // -------------------------------------------------------------------------
    // 9. Return
    // -------------------------------------------------------------------------
    return { id: appt.id, status: 'confirmed', startAt: startAtUtc, endAt: endAtUtc }
  },
}

import { db } from '@/lib/db'
import { appointments, users, externalBusy, persons } from '@/lib/db/schema'
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

export class AppointmentTokenError extends Error {
  constructor(public reason: 'expired' | 'invalid' | 'revoked' | 'wrong_purpose', message?: string) {
    super(message ?? reason)
    this.name = 'AppointmentTokenError'
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
  personIdOverride?: string  // when set: skip LeadMatchService, use this personId directly
  suppressCustomerMail?: boolean  // when true: skip customer confirmation + reminders (staff mail still sent)
  leadSource?: string  // override for LeadMatchService.findOrCreate; defaults to 'public_booking' for back-compat
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
// Mutation helpers (private, module scope)
//
// Extracted from cancel() / reschedule() so Phase-6 auth-based variants
// (cancelByOwner, rescheduleByOwner) can reuse the exact same mutation steps
// without duplicating logic. The helpers receive an already-loaded `appt` row
// — they do NOT re-select from the DB.
// ---------------------------------------------------------------------------

async function _applyCancelMutation(args: {
  appointmentId: string
  reason: string | null
  cancelledBy: 'customer' | 'staff'
  appt: typeof appointments.$inferSelect
}): Promise<void> {
  // 1. DB update
  await db.update(appointments).set({
    status: 'cancelled',
    cancelTokenHash: null,
    rescheduleTokenHash: null,
    cancelledAt: new Date(),
    cancelledBy: args.cancelledBy,
    // cancellationReason is plain user text from the public cancel form.
    // It must be HTML-escaped on render in any future template that displays it.
    cancellationReason: args.reason,
    updatedAt: new Date(),
  }).where(eq(appointments.id, args.appointmentId))

  // 2. Cancel pending reminders
  const { AppointmentMailService } = await import('./appointment-mail.service')
  await AppointmentMailService.cancelPendingReminders(args.appointmentId)

  // 3. Queue cancel mails (fail-open)
  try { await AppointmentMailService.queueCancellation(args.appointmentId) }
  catch (err) { console.error('Failed to queue cancel mails:', err) }

  // 4. Google delete (best-effort)
  if (args.appt.googleEventId && args.appt.googleCalendarId) {
    try {
      const account = await CalendarAccountService.getActiveAccount(args.appt.userId)
      if (account) {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        await CalendarGoogleClient.eventsDelete({
          accessToken,
          calendarId: args.appt.googleCalendarId,
          eventId: args.appt.googleEventId,
          sendUpdates: 'all',
        })
      }
    } catch (err) {
      console.warn('Google event delete failed:', err)
    }
  }
}

async function _applyRescheduleMutation(args: {
  appointmentId: string
  appt: typeof appointments.$inferSelect
  newStartAtUtc: Date
  newEndAtUtc: Date
  userTimezone: string
}): Promise<void> {
  // 1. DB UPDATE (token hashes get overwritten by loadContext later)
  await db.update(appointments).set({
    startAt: args.newStartAtUtc,
    endAt: args.newEndAtUtc,
    updatedAt: new Date(),
  }).where(eq(appointments.id, args.appointmentId))

  // 2. Cancel old pending reminders (the times have changed)
  const { AppointmentMailService } = await import('./appointment-mail.service')
  await AppointmentMailService.cancelPendingReminders(args.appointmentId)

  // 3. Queue reschedule mails + new reminders (loadContext also regenerates token hashes)
  try { await AppointmentMailService.queueReschedule(args.appointmentId) }
  catch (err) { console.error('Failed to queue reschedule mails:', err) }
  try { await AppointmentMailService.queueReminders(args.appointmentId) }
  catch (err) { console.error('Failed to queue new reminders:', err) }

  // 4. Patch Google event (best-effort)
  if (args.appt.googleEventId && args.appt.googleCalendarId) {
    try {
      const account = await CalendarAccountService.getActiveAccount(args.appt.userId)
      if (account) {
        const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
        await CalendarGoogleClient.eventsPatch({
          accessToken,
          calendarId: args.appt.googleCalendarId,
          eventId: args.appt.googleEventId,
          startUtc: args.newStartAtUtc,
          endUtc: args.newEndAtUtc,
          timeZone: args.userTimezone,
          sendUpdates: 'all',
        })
      }
    } catch (err) {
      console.warn('Google event patch failed:', err)
    }
  }
}

async function _validateNewSlot(args: {
  appt: typeof appointments.$inferSelect
  newStartAtUtc: Date
}): Promise<{ newEndAtUtc: Date; userTimezone: string }> {
  // Load slot type
  const slotType = await SlotTypeService.getById(args.appt.slotTypeId)
  if (!slotType || !slotType.isActive) throw new Error('slot_type_invalid')
  const newEndAtUtc = new Date(args.newStartAtUtc.getTime() + slotType.durationMinutes * 60_000)

  // Load user timezone
  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, args.appt.userId))
    .limit(1)
  const userTimezone = userRows[0]?.timezone ?? 'Europe/Berlin'

  // KNOWN GAP (same as book() lines 188-193): no DB transaction wraps recheck
  // → live FreeBusy → UPDATE. Two concurrent reschedules of the same
  // appointment can both pass and both update — last write wins, mails get
  // queued twice. Acceptable for low-traffic single-instance V1; harden later.
  //
  // Re-check local availability — same window logic as book(), but EXCLUDE this appointment
  const windowStart = new Date(args.newStartAtUtc.getTime() - 86_400_000)
  const windowEnd = new Date(args.newStartAtUtc.getTime() + 86_400_000)

  const [rules, overrides] = await Promise.all([
    AvailabilityService.listRules(args.appt.userId),
    AvailabilityService.listOverrides(args.appt.userId, windowStart, windowEnd),
  ])

  // CRITICAL: filter out the appointment we're rescheduling — else it blocks itself
  const existingAppts = await db
    .select({ id: appointments.id, startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, args.appt.userId),
        inArray(appointments.status, ['pending', 'confirmed']),
        gte(appointments.endAt, windowStart),
        lte(appointments.startAt, windowEnd),
      ),
    )
  const apptIntervals = existingAppts
    .filter(a => a.id !== args.appt.id)
    .map(a => ({ startAt: a.startAt, endAt: a.endAt, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }))

  const account = await CalendarAccountService.getActiveAccount(args.appt.userId)
  const watchedCalendars = account ? await CalendarAccountService.listWatchedCalendars(account.id) : []
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
    rules: rules.map(r => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, isActive: r.isActive })),
    overrides: overrides.map(o => ({ startAt: o.startAt, endAt: o.endAt, kind: o.kind as 'free' | 'block' })),
    appointments: apptIntervals,
    externalBusy: externalBusyIntervals,
    userTimezone,
    now: new Date(),
  })

  const slotMs = args.newStartAtUtc.getTime()
  if (!freeSlots.some(s => s.getTime() === slotMs)) {
    throw new SlotNoLongerAvailableError()
  }

  // Live FreeBusy check (same fail-open pattern as book())
  if (account && busyCalIds.length > 0) {
    try {
      const accessToken = await CalendarAccountService.getValidAccessToken(account.id)
      const fb = await Promise.race([
        CalendarGoogleClient.freeBusyQuery({
          accessToken,
          calendarIds: busyCalIds,
          timeMin: args.newStartAtUtc,
          timeMax: newEndAtUtc,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
      ])
      const overlaps = fb.busy.some(b => b.start < newEndAtUtc && b.end > args.newStartAtUtc)
      if (overlaps && args.appt.googleEventId) {
        const isOnlyOurOldSelf = fb.busy.length === 1
          && fb.busy[0].start.getTime() === args.appt.startAt.getTime()
          && fb.busy[0].end.getTime() === args.appt.endAt.getTime()
        if (!isOnlyOurOldSelf) throw new SlotNoLongerAvailableError('busy_in_google')
      } else if (overlaps) {
        throw new SlotNoLongerAvailableError('busy_in_google')
      }
    } catch (err) {
      if (err instanceof SlotNoLongerAvailableError) throw err
      console.warn('FreeBusy check failed during reschedule, proceeding optimistically:', err)
    }
  }

  return { newEndAtUtc, userTimezone }
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
    const { leadId, personId } = input.personIdOverride
      ? { leadId: null, personId: input.personIdOverride }
      : await LeadMatchService.findOrCreate({
          email: input.customerEmail,
          name: input.customerName,
          phone: input.customerPhone,
          source: input.leadSource ?? 'public_booking',
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
      await AppointmentMailService.queueConfirmation(appt.id, { skipCustomer: input.suppressCustomerMail })
      if (!input.suppressCustomerMail) {
        await AppointmentMailService.queueReminders(appt.id)
      }
    } catch (err) {
      // Log but don't fail the booking — mail can be retried via task_queue
      console.error('Failed to queue confirmation mails / reminders:', err)
    }

    // -------------------------------------------------------------------------
    // 9. Return
    // -------------------------------------------------------------------------
    return { id: appt.id, status: 'confirmed', startAt: startAtUtc, endAt: endAtUtc }
  },

  async reschedule(args: { token: string; newStartAtUtc: Date }): Promise<{ startAt: Date; endAt: Date }> {
    const { verifyAppointmentToken, hashOf } = await import('@/lib/utils/appointment-token.util')
    const v = verifyAppointmentToken(args.token)
    if (!v.ok) {
      if (v.reason === 'expired') throw new AppointmentTokenError('expired')
      throw new AppointmentTokenError('invalid')
    }
    if (v.payload.p !== 'reschedule') throw new AppointmentTokenError('wrong_purpose')

    const [appt] = await db.select().from(appointments).where(eq(appointments.id, v.payload.a)).limit(1)
    if (!appt) throw new AppointmentTokenError('invalid')
    if (appt.rescheduleTokenHash !== hashOf(args.token)) throw new AppointmentTokenError('revoked')
    if (appt.status === 'cancelled') throw new AppointmentTokenError('invalid', 'appointment is cancelled')

    const { newEndAtUtc, userTimezone } = await _validateNewSlot({ appt, newStartAtUtc: args.newStartAtUtc })

    await _applyRescheduleMutation({
      appointmentId: appt.id,
      appt,
      newStartAtUtc: args.newStartAtUtc,
      newEndAtUtc,
      userTimezone,
    })
    return { startAt: args.newStartAtUtc, endAt: newEndAtUtc }
  },

  async cancel(args: { token: string; reason?: string }): Promise<{ alreadyCancelled: boolean }> {
    const { verifyAppointmentToken, hashOf } = await import('@/lib/utils/appointment-token.util')
    const v = verifyAppointmentToken(args.token)
    if (!v.ok) {
      if (v.reason === 'expired') throw new AppointmentTokenError('expired')
      throw new AppointmentTokenError('invalid')
    }
    if (v.payload.p !== 'cancel') throw new AppointmentTokenError('wrong_purpose')

    const [appt] = await db.select().from(appointments).where(eq(appointments.id, v.payload.a)).limit(1)
    if (!appt) throw new AppointmentTokenError('invalid')
    if (appt.cancelTokenHash !== hashOf(args.token)) throw new AppointmentTokenError('revoked')

    if (appt.status === 'cancelled') return { alreadyCancelled: true }

    await _applyCancelMutation({
      appointmentId: appt.id,
      reason: args.reason ?? null,
      cancelledBy: 'customer',
      appt,
    })
    return { alreadyCancelled: false }
  },

  async bookForPortal(args: {
    portalUserId: string
    userId: string
    slotTypeId: string
    startAtUtc: Date
    message?: string | null
  }): Promise<BookResult> {
    const [person] = await db
      .select()
      .from(persons)
      .where(eq(persons.portalUserId, args.portalUserId))
      .limit(1)
    if (!person) throw new Error('person_not_linked')
    if (!person.email) throw new Error('person_missing_email')

    // Reject bookings against staff who haven't enabled their booking page —
    // matches the public flow's slug-lookup precondition. Without this, a
    // portal user could craft a POST with any userId, including admin users.
    const [staffUser] = await db
      .select({ bookingPageActive: users.bookingPageActive })
      .from(users)
      .where(eq(users.id, args.userId))
      .limit(1)
    if (!staffUser || !staffUser.bookingPageActive) throw new Error('staff_not_bookable')

    const fullName = `${person.firstName} ${person.lastName}`.trim()
    return AppointmentService.book({
      userId: args.userId,
      slotTypeId: args.slotTypeId,
      startAtUtc: args.startAtUtc,
      customerName: fullName,
      customerEmail: person.email,
      customerPhone: person.phone ?? person.mobile ?? '',
      customerMessage: args.message ?? null,
      source: 'portal',
      personIdOverride: person.id,
    })
  },

  /**
   * Manually book an appointment from the backend (staff-initiated).
   * Delegates to `book()` with `source: 'manual'`. When `suppressCustomerMail`
   * is true, the customer-facing confirmation + reminders are skipped while
   * the staff notification is still sent.
   */
  async bookManual(args: {
    userId: string
    slotTypeId: string
    startAtUtc: Date
    customer: {
      name: string
      email: string
      phone: string
      message?: string | null
    }
    personId?: string
    suppressCustomerMail?: boolean
  }): Promise<BookResult> {
    return AppointmentService.book({
      userId: args.userId,
      slotTypeId: args.slotTypeId,
      startAtUtc: args.startAtUtc,
      customerName: args.customer.name,
      customerEmail: args.customer.email,
      customerPhone: args.customer.phone,
      customerMessage: args.customer.message ?? null,
      source: 'manual',
      personIdOverride: args.personId,
      suppressCustomerMail: args.suppressCustomerMail,
      leadSource: 'manual_booking',
    })
  },

  async cancelByOwner(args: {
    appointmentId: string
    portalUserId: string
    reason?: string | null
  }): Promise<{ alreadyCancelled: boolean }> {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, args.appointmentId)).limit(1)
    if (!appt) throw new Error('appointment_not_found')
    if (!appt.personId) throw new Error('not_owned')

    const [person] = await db.select({ portalUserId: persons.portalUserId })
      .from(persons).where(eq(persons.id, appt.personId)).limit(1)
    if (!person || person.portalUserId !== args.portalUserId) throw new Error('not_owned')

    if (appt.status === 'cancelled') return { alreadyCancelled: true }

    await _applyCancelMutation({
      appointmentId: appt.id,
      reason: args.reason ?? null,
      cancelledBy: 'customer',
      appt,
    })
    return { alreadyCancelled: false }
  },

  async rescheduleByOwner(args: {
    appointmentId: string
    portalUserId: string
    newStartAtUtc: Date
  }): Promise<{ startAt: Date; endAt: Date }> {
    // 1. Load appointment + verify ownership
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, args.appointmentId)).limit(1)
    if (!appt) throw new Error('appointment_not_found')
    if (!appt.personId) throw new Error('not_owned')
    const [person] = await db.select({ portalUserId: persons.portalUserId })
      .from(persons).where(eq(persons.id, appt.personId)).limit(1)
    if (!person || person.portalUserId !== args.portalUserId) throw new Error('not_owned')
    if (appt.status === 'cancelled') throw new Error('appointment_cancelled')

    // 2. Validate new slot
    const { newEndAtUtc, userTimezone } = await _validateNewSlot({ appt, newStartAtUtc: args.newStartAtUtc })

    // 3. Apply mutation
    await _applyRescheduleMutation({
      appointmentId: appt.id,
      appt,
      newStartAtUtc: args.newStartAtUtc,
      newEndAtUtc,
      userTimezone,
    })
    return { startAt: args.newStartAtUtc, endAt: newEndAtUtc }
  },
}

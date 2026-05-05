import { db } from '@/lib/db'
import { appointments, slotTypes, taskQueue, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { generateAppointmentToken } from '@/lib/utils/appointment-token.util'
import { buildIcs, buildIcsDescription } from './appointment-ics.util'

interface RenderContext {
  customer: { name: string; email: string; phone: string; message: string }
  slot: { type_name: string; duration_minutes: string; location: string; location_details: string }
  appointment: { start_local: string; end_local: string; timezone: string }
  links: { cancel_url: string; reschedule_url: string }
  org: { name: string }
}

interface LoadedContext {
  appt: {
    id: string
    userId: string
    startAt: Date
    endAt: Date
    customerName: string
    customerEmail: string
    customerPhone: string
    customerMessage: string | null
    leadId: string | null
    personId: string | null
    icsSequence: number
    status: string
  }
  user: {
    email: string | null
    firstName: string | null
    lastName: string | null
  }
  ctx: RenderContext
  cancelUrl: string
  rescheduleUrl: string
}

interface IcsAttachmentArgs {
  appointmentId: string
  sequence: number
  method: 'REQUEST' | 'CANCEL'
  startUtc: Date
  endUtc: Date
  summary: string
  description: string
  location: string
  organizerEmail: string
  organizerName: string
  attendeeEmail: string
  attendeeName: string
}

function buildIcsAttachment(args: IcsAttachmentArgs): { filename: string; content: string; contentType: string } {
  const ics = buildIcs({
    uid: args.appointmentId,
    sequence: args.sequence,
    method: args.method,
    startUtc: args.startUtc,
    endUtc: args.endUtc,
    summary: args.summary,
    description: args.description,
    location: args.location,
    organizerEmail: args.organizerEmail,
    organizerName: args.organizerName,
    attendeeEmail: args.attendeeEmail,
    attendeeName: args.attendeeName,
  })
  return {
    filename: 'termin.ics',
    content: ics,
    contentType: `text/calendar; charset=utf-8; method=${args.method}`,
  }
}

function customerIcsAttachment(
  appt: LoadedContext['appt'],
  user: LoadedContext['user'],
  ctx: RenderContext,
  method: 'REQUEST' | 'CANCEL',
): { filename: string; content: string; contentType: string } {
  return buildIcsAttachment({
    appointmentId: appt.id,
    sequence: appt.icsSequence,
    method,
    startUtc: appt.startAt,
    endUtc: appt.endAt,
    summary: ctx.slot.type_name,
    description: buildIcsDescription({
      customerPhone: ctx.customer.phone,
      customerEmail: ctx.customer.email,
      customerMessage: ctx.customer.message || null,
    }),
    location: ctx.slot.location_details || ctx.slot.location,
    organizerEmail: user.email ?? 'noreply@xkmu.de',
    organizerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'xKMU',
    attendeeEmail: appt.customerEmail,
    attendeeName: appt.customerName,
  })
}

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) || 'https://www.xkmu.de'

function buildPlaceholders(ctx: RenderContext): Record<string, string> {
  return {
    'customer.name': ctx.customer.name,
    'customer.email': ctx.customer.email,
    'customer.phone': ctx.customer.phone,
    'customer.message': ctx.customer.message,
    'slot.type_name': ctx.slot.type_name,
    'slot.duration_minutes': ctx.slot.duration_minutes,
    'slot.location': ctx.slot.location,
    'slot.location_details': ctx.slot.location_details,
    'appointment.start_local': ctx.appointment.start_local,
    'appointment.end_local': ctx.appointment.end_local,
    'appointment.timezone': ctx.appointment.timezone,
    'links.cancel_url': ctx.links.cancel_url,
    'links.reschedule_url': ctx.links.reschedule_url,
    'org.name': ctx.org.name,
  }
}

async function ensureTokensAndUrls(args: {
  appointmentId: string
  startAt: Date
}): Promise<{ cancelUrl: string; rescheduleUrl: string }> {
  // Graceful degradation when APPOINTMENT_TOKEN_SECRET is missing:
  // generateAppointmentToken throws — we still want the confirmation/reminder
  // mail to go out (just without self-service links), rather than failing
  // mail-queue inserts entirely.
  let cancel: { token: string; hash: string }
  let reschedule: { token: string; hash: string }
  try {
    cancel = generateAppointmentToken({ appointmentId: args.appointmentId, purpose: 'cancel', expiresAt: args.startAt })
    reschedule = generateAppointmentToken({ appointmentId: args.appointmentId, purpose: 'reschedule', expiresAt: args.startAt })
  } catch (err) {
    console.warn(
      'Could not generate appointment tokens — sending mail without cancel/reschedule URLs:',
      err instanceof Error ? err.message : err,
    )
    return { cancelUrl: '', rescheduleUrl: '' }
  }
  await db.update(appointments).set({
    cancelTokenHash: cancel.hash,
    rescheduleTokenHash: reschedule.hash,
    updatedAt: new Date(),
  }).where(eq(appointments.id, args.appointmentId))
  return {
    cancelUrl: `${PUBLIC_SITE_URL}/buchen/cancel?token=${encodeURIComponent(cancel.token)}`,
    rescheduleUrl: `${PUBLIC_SITE_URL}/buchen/reschedule?token=${encodeURIComponent(reschedule.token)}`,
  }
}

function formatLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d) + ' Uhr'
}

const LOCATION_LABELS: Record<string, string> = {
  phone: 'Telefon',
  video: 'Video',
  onsite: 'Vor Ort',
  custom: 'Sonstiges',
}

async function loadContext(appointmentId: string): Promise<LoadedContext> {
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1)
  if (!appt) throw new Error(`Appointment ${appointmentId} not found`)

  const [slotType] = await db.select().from(slotTypes).where(eq(slotTypes.id, appt.slotTypeId)).limit(1)
  if (!slotType) throw new Error(`SlotType ${appt.slotTypeId} not found`)

  const [user] = await db.select({
    email: users.email, firstName: users.firstName, lastName: users.lastName, timezone: users.timezone,
  }).from(users).where(eq(users.id, appt.userId)).limit(1)
  if (!user) throw new Error(`User ${appt.userId} not found`)

  const { cancelUrl, rescheduleUrl } = await ensureTokensAndUrls({
    appointmentId: appt.id,
    startAt: appt.startAt,
  })

  const tz = user.timezone || 'Europe/Berlin'
  const ctx: RenderContext = {
    customer: {
      name: appt.customerName,
      email: appt.customerEmail,
      phone: appt.customerPhone,
      message: appt.customerMessage ?? '',
    },
    slot: {
      type_name: slotType.name,
      duration_minutes: String(slotType.durationMinutes),
      location: LOCATION_LABELS[slotType.location] ?? slotType.location,
      location_details: slotType.locationDetails ?? '',
    },
    appointment: {
      start_local: formatLocal(appt.startAt, tz),
      end_local: formatLocal(appt.endAt, tz),
      timezone: tz,
    },
    links: { cancel_url: cancelUrl, reschedule_url: rescheduleUrl },
    org: {
      name: 'xKMU',  // TODO Phase 8: read from organization table
    },
  }

  return {
    appt: {
      id: appt.id,
      userId: appt.userId,
      startAt: appt.startAt,
      endAt: appt.endAt,
      customerName: appt.customerName,
      customerEmail: appt.customerEmail,
      customerPhone: appt.customerPhone,
      customerMessage: appt.customerMessage,
      leadId: appt.leadId,
      personId: appt.personId,
      icsSequence: appt.icsSequence ?? 0,
      status: appt.status,
    },
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    ctx,
    cancelUrl,
    rescheduleUrl,
  }
}

export const AppointmentMailService = {
  /**
   * Queue confirmation emails for an appointment.
   * - Customer gets `appointment.customer.confirmation` (unless `opts.skipCustomer`)
   * - Staff (the user owning the calendar) gets `appointment.staff.notification`
   *
   * When `opts.skipCustomer === true` the customer mail row is NOT inserted,
   * but the staff notification is still queued. Used by manual backend booking
   * where staff already informed the customer through another channel.
   */
  async queueConfirmation(
    appointmentId: string,
    opts?: { skipCustomer?: boolean },
  ): Promise<void> {
    const { appt, user, ctx } = await loadContext(appointmentId)

    // Queue customer mail (unless caller asked to skip it)
    if (!opts?.skipCustomer) {
      await db.insert(taskQueue).values({
        type: 'email',
        status: 'pending',
        priority: 1,
        payload: {
          templateSlug: 'appointment.customer.confirmation',
          to: appt.customerEmail,
          placeholders: buildPlaceholders(ctx),
          leadId: appt.leadId,
          personId: appt.personId,
          attachments: [customerIcsAttachment(appt, user, ctx, 'REQUEST')],
        },
        referenceType: 'appointment',
        referenceId: appt.id,
      })
    }

    // Queue staff mail (if the user has an email — which they should)
    if (user.email) {
      await db.insert(taskQueue).values({
        type: 'email',
        status: 'pending',
        priority: 2,
        payload: {
          templateSlug: 'appointment.staff.notification',
          to: user.email,
          placeholders: buildPlaceholders(ctx),
        },
        referenceType: 'appointment',
        referenceId: appt.id,
      })
    }
  },

  /**
   * Queue 24h-before and 1h-before reminder tasks for an appointment.
   * Skips reminders whose scheduled time is already in the past
   * (e.g., bookings made <24h before start get no 24h reminder).
   */
  async queueReminders(appointmentId: string): Promise<void> {
    const { appt, ctx } = await loadContext(appointmentId)
    const startMs = appt.startAt.getTime()
    const reminders = [
      { templateSlug: 'appointment.customer.reminder_24h', scheduledFor: new Date(startMs - 24 * 60 * 60 * 1000) },
      { templateSlug: 'appointment.customer.reminder_1h', scheduledFor: new Date(startMs - 60 * 60 * 1000) },
    ]
    const now = Date.now()
    for (const r of reminders) {
      if (r.scheduledFor.getTime() <= now) continue
      await db.insert(taskQueue).values({
        type: 'appointment_reminder',
        status: 'pending',
        priority: 4,
        scheduledFor: r.scheduledFor,
        payload: {
          templateSlug: r.templateSlug,
          to: appt.customerEmail,
          placeholders: buildPlaceholders(ctx),
          leadId: appt.leadId,
          personId: appt.personId,
        },
        referenceType: 'appointment',
        referenceId: appt.id,
      })
    }
  },

  /**
   * Queue cancellation emails for an appointment.
   * - Customer gets `appointment.customer.cancelled`
   * - Staff (the user owning the calendar) gets `appointment.staff.cancelled`
   */
  async queueCancellation(appointmentId: string): Promise<void> {
    const { appt, user, ctx } = await loadContext(appointmentId)

    await db.insert(taskQueue).values({
      type: 'email',
      status: 'pending',
      priority: 1,
      payload: {
        templateSlug: 'appointment.customer.cancelled',
        to: appt.customerEmail,
        placeholders: buildPlaceholders(ctx),
        leadId: appt.leadId,
        personId: appt.personId,
        attachments: [customerIcsAttachment(appt, user, ctx, 'CANCEL')],
      },
      referenceType: 'appointment',
      referenceId: appt.id,
    })

    if (user.email) {
      await db.insert(taskQueue).values({
        type: 'email',
        status: 'pending',
        priority: 2,
        payload: {
          templateSlug: 'appointment.staff.cancelled',
          to: user.email,
          placeholders: buildPlaceholders(ctx),
        },
        referenceType: 'appointment',
        referenceId: appt.id,
      })
    }
  },

  /**
   * Queue reschedule emails for an appointment.
   * - Customer gets `appointment.customer.rescheduled`
   * - Staff (the user owning the calendar) gets `appointment.staff.rescheduled`
   *
   * Side-effect: `loadContext` regenerates fresh cancel/reschedule token hashes
   * via `ensureTokensAndUrls`, so the URLs in the email reflect the new times.
   */
  async queueReschedule(appointmentId: string): Promise<void> {
    const { appt, user, ctx } = await loadContext(appointmentId)

    await db.insert(taskQueue).values({
      type: 'email',
      status: 'pending',
      priority: 1,
      payload: {
        templateSlug: 'appointment.customer.rescheduled',
        to: appt.customerEmail,
        placeholders: buildPlaceholders(ctx),
        leadId: appt.leadId,
        personId: appt.personId,
        attachments: [customerIcsAttachment(appt, user, ctx, 'REQUEST')],
      },
      referenceType: 'appointment',
      referenceId: appt.id,
    })

    if (user.email) {
      await db.insert(taskQueue).values({
        type: 'email',
        status: 'pending',
        priority: 2,
        payload: {
          templateSlug: 'appointment.staff.rescheduled',
          to: user.email,
          placeholders: buildPlaceholders(ctx),
        },
        referenceType: 'appointment',
        referenceId: appt.id,
      })
    }
  },

  /**
   * Mark all pending `appointment_reminder` tasks for the given appointment
   * as cancelled. Returns the count of tasks affected.
   */
  async cancelPendingReminders(appointmentId: string): Promise<number> {
    const result = await db.update(taskQueue)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(taskQueue.type, 'appointment_reminder'),
        eq(taskQueue.referenceId, appointmentId),
        eq(taskQueue.status, 'pending'),
      ))
      .returning({ id: taskQueue.id })
    return result.length
  },
}

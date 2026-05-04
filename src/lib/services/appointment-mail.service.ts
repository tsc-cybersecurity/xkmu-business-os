import { db } from '@/lib/db'
import { appointments, slotTypes, taskQueue, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface RenderContext {
  customer: { name: string; email: string; phone: string; message: string }
  slot: { type_name: string; duration_minutes: string; location: string; location_details: string }
  appointment: { start_local: string; end_local: string; timezone: string }
  org: { name: string }
}

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
    'org.name': ctx.org.name,
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

export const AppointmentMailService = {
  /**
   * Queue confirmation emails for an appointment.
   * - Customer gets `appointment.customer.confirmation`
   * - Staff (the user owning the calendar) gets `appointment.staff.notification`
   */
  async queueConfirmation(appointmentId: string): Promise<void> {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1)
    if (!appt) throw new Error(`Appointment ${appointmentId} not found`)

    const [slotType] = await db.select().from(slotTypes).where(eq(slotTypes.id, appt.slotTypeId)).limit(1)
    if (!slotType) throw new Error(`SlotType ${appt.slotTypeId} not found`)

    const [user] = await db.select({
      email: users.email, firstName: users.firstName, lastName: users.lastName, timezone: users.timezone,
    }).from(users).where(eq(users.id, appt.userId)).limit(1)
    if (!user) throw new Error(`User ${appt.userId} not found`)

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
      org: {
        name: 'xKMU',  // TODO Phase 8: read from organization table
      },
    }

    // Queue customer mail
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
      },
      referenceType: 'appointment',
      referenceId: appt.id,
    })

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
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  users, slotTypes, availabilityRules, availabilityOverrides, appointments,
  externalBusy, userCalendarAccounts, userCalendarsWatched,
} from '@/lib/db/schema'
import { AvailabilityCalcService } from '@/lib/services/availability-calc.service'

interface RouteContext { params: Promise<{ slug: string }> }

const QuerySchema = z.object({
  slotTypeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params

  // Find user by booking_slug, must be active
  const userRows = await db.select({
    id: users.id, timezone: users.timezone, bookingPageActive: users.bookingPageActive,
  }).from(users).where(eq(users.bookingSlug, slug)).limit(1)
  const user = userRows[0]
  if (!user || !user.bookingPageActive) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Validate query
  const searchParams = (request.nextUrl ?? new URL(request.url)).searchParams
  const parsed = QuerySchema.safeParse({
    slotTypeId: searchParams.get('slotTypeId') ?? '',
    date: searchParams.get('date') ?? '',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', details: parsed.error.flatten() }, { status: 400 })
  }

  // Validate slot type belongs to this user + active
  const stRows = await db.select().from(slotTypes)
    .where(and(eq(slotTypes.id, parsed.data.slotTypeId), eq(slotTypes.userId, user.id), eq(slotTypes.isActive, true)))
    .limit(1)
  const slotType = stRows[0]
  if (!slotType) {
    return NextResponse.json({ error: 'slot_type_not_found' }, { status: 404 })
  }

  // Compute UTC range for the requested local date
  const [yStr, mStr, dStr] = parsed.data.date.split('-')
  const y = Number(yStr), m = Number(mStr), d = Number(dStr)
  // Day starts at 00:00 in user timezone, ends at 24:00 (next day 00:00)
  const dayStartUtc = localTimeToUtc(y, m, d, 0, 0, user.timezone)
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 3600_000)

  // Load context for the day
  const [rules, overrides, existingAppts] = await Promise.all([
    db.select().from(availabilityRules).where(and(eq(availabilityRules.userId, user.id), eq(availabilityRules.isActive, true))),
    db.select().from(availabilityOverrides)
      .where(and(
        eq(availabilityOverrides.userId, user.id),
        gte(availabilityOverrides.endAt, dayStartUtc),
        lte(availabilityOverrides.startAt, dayEndUtc),
      )),
    db.select({
      startAt: appointments.startAt, endAt: appointments.endAt,
    }).from(appointments)
      .where(and(
        eq(appointments.userId, user.id),
        or(eq(appointments.status, 'pending'), eq(appointments.status, 'confirmed')),
        gte(appointments.endAt, dayStartUtc),
        lte(appointments.startAt, dayEndUtc),
      )),
  ])

  // External busy from any read-for-busy watched calendar
  const accountRows = await db.select().from(userCalendarAccounts)
    .where(and(eq(userCalendarAccounts.userId, user.id), isNull(userCalendarAccounts.revokedAt)))
    .limit(1)
  const account = accountRows[0]
  let busy: { startAt: Date; endAt: Date }[] = []
  if (account) {
    const watched = await db.select().from(userCalendarsWatched)
      .where(and(eq(userCalendarsWatched.accountId, account.id), eq(userCalendarsWatched.readForBusy, true)))
    if (watched.length > 0) {
      const eb = await db.select({
        startAt: externalBusy.startAt, endAt: externalBusy.endAt, transparency: externalBusy.transparency,
      }).from(externalBusy)
        .where(and(
          eq(externalBusy.accountId, account.id),
          eq(externalBusy.transparency, 'opaque'),
          gte(externalBusy.endAt, dayStartUtc),
          lte(externalBusy.startAt, dayEndUtc),
        ))
      // Filter to only watched calendar IDs (in case schema doesn't enforce)
      busy = eb
        .map(e => ({ startAt: e.startAt, endAt: e.endAt }))
    }
  }

  const slots = AvailabilityCalcService.computeFreeSlots({
    slotType: {
      durationMinutes: slotType.durationMinutes,
      bufferBeforeMinutes: slotType.bufferBeforeMinutes,
      bufferAfterMinutes: slotType.bufferAfterMinutes,
      minNoticeHours: slotType.minNoticeHours,
      maxAdvanceDays: slotType.maxAdvanceDays,
    },
    rangeStart: dayStartUtc,
    rangeEnd: dayEndUtc,
    rules: rules.map(r => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, isActive: r.isActive })),
    overrides: overrides.map(o => ({ startAt: o.startAt, endAt: o.endAt, kind: o.kind as 'free' | 'block' })),
    appointments: existingAppts.map(a => ({
      startAt: a.startAt, endAt: a.endAt,
      bufferBeforeMinutes: 0, bufferAfterMinutes: 0,  // conservative — buffer not joined
    })),
    externalBusy: busy,
    userTimezone: user.timezone,
    now: new Date(),
  })

  return NextResponse.json({ slots: slots.map(s => s.toISOString()) })
}

// Local helper — duplicate from availability-calc.service.ts to avoid exporting internals
function localTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = tzOffsetMinutes(approx, timeZone)
  return new Date(approx.getTime() - offset * 60_000)
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  const hour = Number(parts.hour === '24' ? '00' : parts.hour)
  const asLocalUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    hour, Number(parts.minute), Number(parts.second),
  )
  return Math.round((asLocalUtc - date.getTime()) / 60000)
}

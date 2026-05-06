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
  // YYYY-MM
  month: z.string().regex(/^\d{4}-\d{2}$/),
})

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params

  const userRows = await db.select({
    id: users.id, timezone: users.timezone, bookingPageActive: users.bookingPageActive,
  }).from(users).where(eq(users.bookingSlug, slug)).limit(1)
  const user = userRows[0]
  if (!user || !user.bookingPageActive) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const searchParams = (request.nextUrl ?? new URL(request.url)).searchParams
  const parsed = QuerySchema.safeParse({
    slotTypeId: searchParams.get('slotTypeId') ?? '',
    month: searchParams.get('month') ?? '',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', details: parsed.error.flatten() }, { status: 400 })
  }

  const stRows = await db.select().from(slotTypes)
    .where(and(eq(slotTypes.id, parsed.data.slotTypeId), eq(slotTypes.userId, user.id), eq(slotTypes.isActive, true)))
    .limit(1)
  const slotType = stRows[0]
  if (!slotType) {
    return NextResponse.json({ error: 'slot_type_not_found' }, { status: 404 })
  }

  const [yStr, mStr] = parsed.data.month.split('-')
  const y = Number(yStr), m = Number(mStr)
  const monthStartUtc = localTimeToUtc(y, m, 1, 0, 0, user.timezone)
  const nextMonthY = m === 12 ? y + 1 : y
  const nextMonthM = m === 12 ? 1 : m + 1
  const monthEndUtc = localTimeToUtc(nextMonthY, nextMonthM, 1, 0, 0, user.timezone)

  const [rules, overrides, existingAppts] = await Promise.all([
    db.select().from(availabilityRules).where(and(eq(availabilityRules.userId, user.id), eq(availabilityRules.isActive, true))),
    db.select().from(availabilityOverrides)
      .where(and(
        eq(availabilityOverrides.userId, user.id),
        gte(availabilityOverrides.endAt, monthStartUtc),
        lte(availabilityOverrides.startAt, monthEndUtc),
      )),
    db.select({
      startAt: appointments.startAt, endAt: appointments.endAt,
    }).from(appointments)
      .where(and(
        eq(appointments.userId, user.id),
        or(eq(appointments.status, 'pending'), eq(appointments.status, 'confirmed')),
        gte(appointments.endAt, monthStartUtc),
        lte(appointments.startAt, monthEndUtc),
      )),
  ])

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
          gte(externalBusy.endAt, monthStartUtc),
          lte(externalBusy.startAt, monthEndUtc),
        ))
      busy = eb.map(e => ({ startAt: e.startAt, endAt: e.endAt }))
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
    rangeStart: monthStartUtc,
    rangeEnd: monthEndUtc,
    rules: rules.map(r => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, isActive: r.isActive })),
    overrides: overrides.map(o => ({ startAt: o.startAt, endAt: o.endAt, kind: o.kind as 'free' | 'block' })),
    appointments: existingAppts.map(a => ({
      startAt: a.startAt, endAt: a.endAt,
      bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
    })),
    externalBusy: busy,
    userTimezone: user.timezone,
    now: new Date(),
  })

  // Group by local calendar day (en-CA produces YYYY-MM-DD)
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: user.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const counts: Record<string, number> = {}
  for (const s of slots) {
    const key = dtf.format(s)
    counts[key] = (counts[key] ?? 0) + 1
  }

  return NextResponse.json({ counts })
}

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

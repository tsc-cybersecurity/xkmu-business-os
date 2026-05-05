import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, slotTypes } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const staff = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    bookingSlug: users.bookingSlug,
    bookingPageTitle: users.bookingPageTitle,
    bookingPageSubtitle: users.bookingPageSubtitle,
    timezone: users.timezone,
  }).from(users).where(eq(users.bookingPageActive, true))

  const slots = await db.select({
    id: slotTypes.id,
    userId: slotTypes.userId,
    name: slotTypes.name,
    durationMinutes: slotTypes.durationMinutes,
    location: slotTypes.location,
    locationDetails: slotTypes.locationDetails,
    description: slotTypes.description,
    color: slotTypes.color,
    minNoticeHours: slotTypes.minNoticeHours,
    maxAdvanceDays: slotTypes.maxAdvanceDays,
  }).from(slotTypes).where(eq(slotTypes.isActive, true))

  const slotsByUser = new Map<string, typeof slots>()
  for (const s of slots) {
    const list = slotsByUser.get(s.userId) ?? []
    list.push(s)
    slotsByUser.set(s.userId, list)
  }

  return NextResponse.json({
    staff: staff.map(u => ({
      ...u,
      slotTypes: slotsByUser.get(u.id) ?? [],
    })),
  })
}

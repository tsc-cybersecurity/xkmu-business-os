import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, slotTypes } from '@/lib/db/schema'
import { BookingWizard } from './_components/BookingWizard'

interface Props {
  params: Promise<{ slug: string; slotType: string }>
}

export default async function BookingStep23({ params }: Props) {
  const { slug, slotType: slotTypeSlug } = await params

  const userRows = await db.select({
    id: users.id,
    bookingPageActive: users.bookingPageActive,
    timezone: users.timezone,
  }).from(users).where(eq(users.bookingSlug, slug)).limit(1)
  const user = userRows[0]
  if (!user || !user.bookingPageActive) notFound()

  const stRows = await db.select().from(slotTypes)
    .where(and(eq(slotTypes.userId, user.id), eq(slotTypes.slug, slotTypeSlug), eq(slotTypes.isActive, true)))
    .limit(1)
  const slotType = stRows[0]
  if (!slotType) notFound()

  return (
    <BookingWizard
      slug={slug}
      timezone={user.timezone}
      slotType={{
        id: slotType.id,
        slug: slotType.slug,
        name: slotType.name,
        description: slotType.description,
        durationMinutes: slotType.durationMinutes,
        location: slotType.location,
        locationDetails: slotType.locationDetails,
        minNoticeHours: slotType.minNoticeHours,
        maxAdvanceDays: slotType.maxAdvanceDays,
      }}
    />
  )
}

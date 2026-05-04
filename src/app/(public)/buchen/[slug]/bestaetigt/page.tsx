import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, slotTypes, users } from '@/lib/db/schema'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ id?: string }>
}

export default async function BookingConfirmation({ params, searchParams }: Props) {
  const [{ slug }, { id }] = await Promise.all([params, searchParams])
  if (!id) notFound()

  // Lookup user by slug
  const [user] = await db.select({ id: users.id, timezone: users.timezone, bookingSlug: users.bookingSlug })
    .from(users).where(eq(users.bookingSlug, slug)).limit(1)
  if (!user) notFound()

  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, user.id))).limit(1)
  if (!appt) notFound()

  const [slotType] = await db.select().from(slotTypes).where(eq(slotTypes.id, appt.slotTypeId)).limit(1)
  if (!slotType) notFound()

  const formatLocal = (d: Date) => new Intl.DateTimeFormat('de-DE', {
    timeZone: user.timezone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <CardTitle>Vielen Dank!</CardTitle>
          <CardDescription>Ihr Termin ist bestätigt.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Art</dt>
              <dd className="font-medium">{slotType.name} ({slotType.durationMinutes} min)</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Datum &amp; Uhrzeit</dt>
              <dd className="font-medium">{formatLocal(appt.startAt)} Uhr</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Name</dt>
              <dd>{appt.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">E-Mail</dt>
              <dd>{appt.customerEmail}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-md bg-muted/40 border p-3 text-sm">
            Wir haben Ihnen eine Bestätigungs-Mail an <strong>{appt.customerEmail}</strong> gesendet.
            Bei Fragen antworten Sie einfach auf diese Mail.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

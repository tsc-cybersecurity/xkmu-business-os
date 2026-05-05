import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, slotTypes, users } from '@/lib/db/schema'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, Download, Calendar } from 'lucide-react'

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
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`/api/v1/appointments/${appt.id}/ics`}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Termin als .ics herunterladen
            </a>
            <a
              href={buildGoogleCalendarUrl({
                title: slotType.name,
                startUtc: appt.startAt,
                endUtc: appt.endAt,
                details: appt.customerMessage ?? '',
                location: slotType.locationDetails || slotType.location,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <Calendar className="h-4 w-4" />
              Zu Google Kalender hinzufügen
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function buildGoogleCalendarUrl(args: {
  title: string
  startUtc: Date
  endUtc: Date
  details: string
  location: string
}): string {
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: args.title,
    dates: `${fmt(args.startUtc)}/${fmt(args.endUtc)}`,
    details: args.details,
    location: args.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

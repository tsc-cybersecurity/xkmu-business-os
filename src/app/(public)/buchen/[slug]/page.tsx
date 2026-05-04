import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, slotTypes } from '@/lib/db/schema'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Phone, Video, MapPin, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

const LOCATION_ICON: Record<string, typeof Phone> = {
  phone: Phone, video: Video, onsite: MapPin, custom: Clock,
}
const LOCATION_LABEL: Record<string, string> = {
  phone: 'Telefon', video: 'Video', onsite: 'Vor Ort', custom: 'Sonstiges',
}

export default async function BookingStep1({ params }: Props) {
  const { slug } = await params

  const userRows = await db.select({
    id: users.id,
    bookingPageActive: users.bookingPageActive,
    bookingPageTitle: users.bookingPageTitle,
    bookingPageSubtitle: users.bookingPageSubtitle,
    bookingPageIntro: users.bookingPageIntro,
  }).from(users).where(eq(users.bookingSlug, slug)).limit(1)
  const user = userRows[0]
  if (!user || !user.bookingPageActive) notFound()

  const types = await db.select().from(slotTypes)
    .where(and(eq(slotTypes.userId, user.id), eq(slotTypes.isActive, true)))
    .orderBy(asc(slotTypes.displayOrder), asc(slotTypes.createdAt))

  const title = user.bookingPageTitle || 'Termin vereinbaren'
  const subtitle = user.bookingPageSubtitle || 'Wähle die gewünschte Termin-Art aus.'

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold mb-2">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
        {user.bookingPageIntro && (
          <p className="mt-4 text-sm whitespace-pre-line">{user.bookingPageIntro}</p>
        )}
      </header>

      {types.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aktuell sind keine Termin-Arten verfügbar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {types.map(t => {
            const Icon = LOCATION_ICON[t.location] ?? Clock
            return (
              <Link key={t.id} href={`/buchen/${slug}/${t.slug}`} className="block">
                <Card className="hover:border-primary transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}20` }}>
                        <Icon className="h-6 w-6" style={{ color: t.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{t.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {t.durationMinutes} min · {LOCATION_LABEL[t.location] ?? t.location}
                        </CardDescription>
                        {t.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                        )}
                      </div>
                      <div className="text-muted-foreground self-center">→</div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

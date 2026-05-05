import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { persons } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'
import { PortalTerminClient } from './_components/PortalTerminClient'

export default async function PortalTerminPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'portal_user') redirect('/intern/login')

  // Find linked person — show error if not linked
  const [person] = await db.select().from(persons)
    .where(eq(persons.portalUserId, session.user.id)).limit(1)
  if (!person) {
    return (
      <main className="container max-w-md py-12">
        <h1 className="text-2xl font-semibold mb-4">Termin buchen</h1>
        <p className="text-muted-foreground">
          Dein Account ist noch nicht mit einem Personenprofil verknüpft. Bitte wende dich an deinen Administrator.
        </p>
      </main>
    )
  }

  return (
    <main className="container max-w-3xl py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Termine</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hier kannst du neue Termine buchen und bestehende einsehen oder anpassen.
        </p>
      </header>
      <PortalTerminClient />
    </main>
  )
}

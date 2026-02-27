import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DatabaseAdmin } from './_components/database-admin'

export default async function DatabasePage() {
  const session = await getSession()
  if (!session) {
    redirect('/intern/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Datenbank-Verwaltung</h1>
        <p className="text-muted-foreground">
          Tabelleninhalte anzeigen und bearbeiten
        </p>
      </div>
      <DatabaseAdmin />
    </div>
  )
}

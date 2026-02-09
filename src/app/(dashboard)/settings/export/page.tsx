import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Database, Download, AlertCircle } from 'lucide-react'
import { ExportButton } from './_components/export-button'

export default async function ExportPage() {
  const session = await getSession()

  // Nur Admins dürfen exportieren
  const isAdmin = session?.user.role === 'owner' || session?.user.role === 'admin'

  if (!isAdmin) {
    redirect('/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Datenbank-Export</h1>
        <p className="text-muted-foreground">
          Exportieren Sie die komplette Datenbank als SQL-Datei
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            <CardTitle>SQL-Export</CardTitle>
          </div>
          <CardDescription>
            Erstellt einen vollständigen SQL-Dump aller Tabellen und Daten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Wichtige Hinweise:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Der Export enthält alle Daten Ihres Tenants</li>
                  <li>Sensible Daten wie Passwörter werden mit exportiert</li>
                  <li>Die Datei sollte sicher gespeichert werden</li>
                  <li>Der Export kann je nach Datenmenge einige Sekunden dauern</li>
                </ul>
              </div>
            </div>
          </div>

          <ExportButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Was wird exportiert?</CardTitle>
          <CardDescription>
            Übersicht der exportierten Datenstrukturen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Tabellen</span>
              <span className="text-muted-foreground">Alle Tenant-spezifischen Tabellen</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Benutzer & Rollen</span>
              <span className="text-muted-foreground">Inkl. Berechtigungen</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Kontakte</span>
              <span className="text-muted-foreground">Firmen & Personen</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Leads & Aktivitäten</span>
              <span className="text-muted-foreground">Inkl. Timeline</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Katalog</span>
              <span className="text-muted-foreground">Produkte & Kategorien</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">KI-Konfiguration</span>
              <span className="text-muted-foreground">Provider, Prompts & Logs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

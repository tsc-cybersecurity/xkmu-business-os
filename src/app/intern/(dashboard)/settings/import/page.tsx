import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Database, AlertTriangle, Info } from 'lucide-react'
import { ImportButton } from './_components/import-button'

export default async function ImportPage() {
  const session = await getSession()

  // Nur Admins dürfen importieren
  const isAdmin = session?.user.role === 'owner' || session?.user.role === 'admin'

  if (!isAdmin) {
    redirect('/intern/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Datenbank-Import</h1>
        <p className="text-muted-foreground">
          Importieren Sie eine SQL-Datei in die Datenbank
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            <CardTitle>SQL-Import</CardTitle>
          </div>
          <CardDescription>
            Laden Sie eine SQL-Export-Datei hoch, um Daten zu importieren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Wichtige Hinweise:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Importieren Sie nur Dateien aus vertrauenswürdigen Quellen</li>
                  <li>Erstellen Sie vor dem Import einen Export als Backup</li>
                  <li>Im Modus &quot;Ersetzen&quot; werden alle bestehenden Daten gelöscht</li>
                  <li>Der Import kann je nach Dateigröße einige Sekunden dauern</li>
                </ul>
              </div>
            </div>
          </div>

          <ImportButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import-Modi</CardTitle>
          <CardDescription>
            Wählen Sie den passenden Modus für Ihren Import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Zusammenführen (Standard)</p>
                <p className="text-muted-foreground mt-1">
                  Bestehende Daten bleiben erhalten. Neue Einträge werden hinzugefügt.
                  Bei Konflikten (gleiche ID) wird der bestehende Eintrag beibehalten.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Ersetzen</p>
                <p className="text-muted-foreground mt-1">
                  Alle bestehenden Tenant-Daten werden gelöscht und durch die Import-Daten
                  ersetzt. Nutzen Sie diesen Modus, um einen vollständigen Backup wiederherzustellen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

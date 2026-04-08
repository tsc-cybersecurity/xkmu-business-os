import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import {
  UserCog,
  Building,
  Users,
  Shield,
  Bot,
  Sparkles,
  FileText,
  Database,
  Webhook,
  Key,
  Workflow,
  Download,
  Upload,
  Book,
} from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage() {
  const session = await getSession()

  const isAdmin = session?.user.role === 'owner' || session?.user.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          System- und Anwendungseinstellungen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/intern/settings/profile">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <UserCog className="h-8 w-8 text-muted-foreground" />
              <CardTitle className="mt-4">Mein Profil</CardTitle>
              <CardDescription>
                Persönliche Daten und Passwort ändern
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/intern/settings/tenant">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Building className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Organisation</CardTitle>
                <CardDescription>
                  Organisationseinstellungen und Abonnement
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/intern/settings/users">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Users className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Benutzer</CardTitle>
                <CardDescription>
                  Benutzer hinzufügen, bearbeiten und Rollen zuweisen
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/intern/settings/roles">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Shield className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Rollen</CardTitle>
                <CardDescription>
                  Rollen und Berechtigungen verwalten
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/intern/settings/ai-providers">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Bot className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">KI-Provider</CardTitle>
                <CardDescription>
                  KI-Provider, Firecrawl und API-Schlüssel verwalten
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        <Link href="/intern/settings/ai-prompts">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <CardTitle className="mt-4">KI-Prompts</CardTitle>
              <CardDescription>
                Prompt-Vorlagen für die KI-Recherche bearbeiten
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/intern/settings/ai-logs">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <FileText className="h-8 w-8 text-muted-foreground" />
              <CardTitle className="mt-4">KI-Logging</CardTitle>
              <CardDescription>
                KI-Anfragen und Antworten einsehen
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/intern/settings/database">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Database className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Datenbank</CardTitle>
                <CardDescription>
                  Datenbank-Tabellen und Statistiken einsehen
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>

      {isAdmin && (
        <>
          <div>
            <h2 className="text-xl font-semibold">Weitere Einstellungen</h2>
            <p className="text-sm text-muted-foreground">
              Integrationen, Import/Export und Dokumentation
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/intern/settings/webhooks" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Webhooks</p>
                <p className="text-xs text-muted-foreground">HTTP-Callbacks für externe Automatisierungen</p>
              </div>
            </Link>

            <Link href="/intern/settings/api-keys" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">API-Schlüssel</p>
                <p className="text-xs text-muted-foreground">API-Schlüssel für externe Integrationen</p>
              </div>
            </Link>

            <Link href="/intern/settings/n8n" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Workflow className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">n8n-Verbindung</p>
                <p className="text-xs text-muted-foreground">n8n Workflow-Automatisierung verbinden</p>
              </div>
            </Link>

            <Link href="/intern/settings/export" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Export</p>
                <p className="text-xs text-muted-foreground">SQL-Export der Datenbank herunterladen</p>
              </div>
            </Link>

            <Link href="/intern/settings/import" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Import</p>
                <p className="text-xs text-muted-foreground">SQL-Datei importieren und Daten wiederherstellen</p>
              </div>
            </Link>

            <Link href="/intern/settings/api-docs" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <Book className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">API-Dokumentation</p>
                <p className="text-xs text-muted-foreground">REST API-Referenz mit curl-Beispielen</p>
              </div>
            </Link>

            <Link href="/intern/settings/app-docs" className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">App-Dokumentation</p>
                <p className="text-xs text-muted-foreground">Technische Dokumentation und Architektur</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { Users, Key, Building, Bot, FileText, Sparkles, Webhook, Shield } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage() {
  const session = await getSession()

  const isAdmin = session?.user.role === 'owner' || session?.user.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Anwendungseinstellungen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <Link href="/settings/users">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Users className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Benutzerverwaltung</CardTitle>
                <CardDescription>
                  Benutzer hinzufugen, bearbeiten und Rollen zuweisen
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/settings/roles">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Shield className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Rollenverwaltung</CardTitle>
                <CardDescription>
                  Rollen und Berechtigungen verwalten
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/settings/api-keys">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Key className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">API-Schlussel</CardTitle>
                <CardDescription>
                  API-Schlussel fur externe Integrationen verwalten
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {session?.user.role === 'owner' && (
          <Link href="/settings/tenant">
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
          <Link href="/settings/ai-providers">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Bot className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">KI-Anbieter</CardTitle>
                <CardDescription>
                  KI-Provider und API-Schlüssel verwalten
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/settings/ai-prompts">
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
        )}

        {isAdmin && (
          <Link href="/settings/ai-logs">
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
        )}

        {isAdmin && (
          <Link href="/settings/webhooks">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <Webhook className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">Webhooks</CardTitle>
                <CardDescription>
                  HTTP-Callbacks fuer externe Automatisierungen
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ihr Profil</CardTitle>
          <CardDescription>
            Ihre aktuellen Kontoinformationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">E-Mail:</span>
            <p className="font-medium">{session?.user.email}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Name:</span>
            <p className="font-medium">
              {session?.user.firstName} {session?.user.lastName}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Rolle:</span>
            <p className="font-medium capitalize">{session?.user.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

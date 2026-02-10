import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Book, Key, Shield } from 'lucide-react'
import { ApiDocsContent } from './_components/api-docs-content'

export default async function ApiDocsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/intern/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API-Dokumentation</h1>
        <p className="text-muted-foreground">
          Vollständige REST API-Referenz mit curl-Beispielen
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Book className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="mt-4">REST API v1</CardTitle>
            <CardDescription>
              Zugriff auf alle Ressourcen über HTTP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Base URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/v1</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Key className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="mt-4">Authentifizierung</CardTitle>
            <CardDescription>
              Session-basiert mit httpOnly Cookies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Nach Login automatisch gesetzt
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="mt-4">Tenant-Isolation</CardTitle>
            <CardDescription>
              Automatische Datentrennung pro Tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Keine zusätzlichen Header erforderlich
            </div>
          </CardContent>
        </Card>
      </div>

      <ApiDocsContent />
    </div>
  )
}

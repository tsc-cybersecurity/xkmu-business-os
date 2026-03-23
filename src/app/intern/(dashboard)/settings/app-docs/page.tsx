import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Layers, Monitor, Brain, Shield, BarChart3 } from 'lucide-react'
import { AppDocsContent } from './_components/app-docs-content'

export default async function AppDocsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/intern/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anwendungsdokumentation</h1>
        <p className="text-muted-foreground">
          Vollstaendige Dokumentation aller Module, Seiten und Funktionen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <Monitor className="h-6 w-6 text-blue-500" />
            <CardTitle className="mt-2 text-sm">22 Module</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">CRM, Finanzen, Marketing u.v.m.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Layers className="h-6 w-6 text-green-500" />
            <CardTitle className="mt-2 text-sm">80+ Seiten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Dashboard, Listen, Formulare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <BookOpen className="h-6 w-6 text-orange-500" />
            <CardTitle className="mt-2 text-sm">170+ APIs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">RESTful Endpunkte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Brain className="h-6 w-6 text-purple-500" />
            <CardTitle className="mt-2 text-sm">KI-Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">8 Provider, Research, Content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Shield className="h-6 w-6 text-red-500" />
            <CardTitle className="mt-2 text-sm">RBAC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rollen & Berechtigungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <BarChart3 className="h-6 w-6 text-teal-500" />
            <CardTitle className="mt-2 text-sm">Multi-Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mandantenfaehig</p>
          </CardContent>
        </Card>
      </div>

      <AppDocsContent />
    </div>
  )
}

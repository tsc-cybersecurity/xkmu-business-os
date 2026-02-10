'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function ApiDocsContent() {
  return (
    <Tabs defaultValue="auth" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="auth">Auth</TabsTrigger>
        <TabsTrigger value="companies">Firmen</TabsTrigger>
        <TabsTrigger value="persons">Personen</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="products">Produkte</TabsTrigger>
        <TabsTrigger value="ai">KI</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="admin">Admin</TabsTrigger>
      </TabsList>

      {/* Authentication */}
      <TabsContent value="auth" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentifizierung</CardTitle>
            <CardDescription>Login, Logout und Session-Management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="POST"
              path="/api/v1/auth/login"
              description="Benutzer anmelden"
              requestBody={{
                email: 'user@example.com',
                password: 'passwort123',
              }}
              responseExample={{
                message: 'Login erfolgreich',
                user: {
                  id: 'uuid',
                  email: 'user@example.com',
                  firstName: 'Max',
                  lastName: 'Mustermann',
                  role: 'admin',
                },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/auth/register"
              description="Neuen Benutzer registrieren"
              requestBody={{
                email: 'neu@example.com',
                password: 'sicheres-passwort',
                firstName: 'Max',
                lastName: 'Mustermann',
              }}
              responseExample={{
                message: 'Registrierung erfolgreich',
                user: {
                  id: 'uuid',
                  email: 'neu@example.com',
                },
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/auth/me"
              description="Aktuelle Session-Informationen abrufen"
              responseExample={{
                user: {
                  id: 'uuid',
                  email: 'user@example.com',
                  tenantId: 'uuid',
                  role: 'admin',
                },
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/auth/permissions"
              description="Berechtigungen des aktuellen Benutzers"
              responseExample={{
                permissions: {
                  companies: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
                  leads: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
                },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/auth/logout"
              description="Benutzer abmelden"
              responseExample={{
                message: 'Logout erfolgreich',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Companies */}
      <TabsContent value="companies" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Firmen</CardTitle>
            <CardDescription>Verwaltung von Firmenkontakten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/companies"
              description="Alle Firmen abrufen"
              queryParams={['page=1', 'limit=20', 'search=Begriff', 'status=customer']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Musterfirma GmbH',
                    status: 'customer',
                    city: 'Berlin',
                    email: 'info@musterfirma.de',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 42 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/companies"
              description="Neue Firma erstellen"
              requestBody={{
                name: 'Neue Firma GmbH',
                legalForm: 'GmbH',
                street: 'Hauptstraße',
                houseNumber: '123',
                postalCode: '10115',
                city: 'Berlin',
                email: 'kontakt@neuefirma.de',
                phone: '+49 30 12345678',
                website: 'https://neuefirma.de',
                industry: 'IT',
                status: 'prospect',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neue Firma GmbH',
                status: 'prospect',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/companies/:id"
              description="Einzelne Firma abrufen"
              responseExample={{
                id: 'uuid',
                name: 'Musterfirma GmbH',
                legalForm: 'GmbH',
                city: 'Berlin',
                status: 'customer',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/companies/:id"
              description="Firma aktualisieren"
              requestBody={{
                status: 'customer',
                notes: 'Wichtiger Kunde',
              }}
              responseExample={{
                id: 'uuid',
                status: 'customer',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/companies/:id"
              description="Firma löschen"
              responseExample={{
                message: 'Firma gelöscht',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/companies/:id/research"
              description="KI-Recherche für Firma durchführen"
              responseExample={{
                message: 'Recherche gestartet',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/companies/:id/persons"
              description="Kontaktpersonen einer Firma abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    firstName: 'Max',
                    lastName: 'Mustermann',
                    jobTitle: 'Geschäftsführer',
                    email: 'max@musterfirma.de',
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Persons */}
      <TabsContent value="persons" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Personen</CardTitle>
            <CardDescription>Verwaltung von Kontaktpersonen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/persons"
              description="Alle Personen abrufen"
              queryParams={['page=1', 'limit=20', 'search=Name', 'companyId=uuid']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    firstName: 'Max',
                    lastName: 'Mustermann',
                    email: 'max@example.com',
                    jobTitle: 'CEO',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 15 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/persons"
              description="Neue Person erstellen"
              requestBody={{
                companyId: 'uuid',
                salutation: 'Herr',
                firstName: 'Max',
                lastName: 'Mustermann',
                email: 'max@example.com',
                phone: '+49 30 12345678',
                mobile: '+49 170 1234567',
                jobTitle: 'Geschäftsführer',
                department: 'Management',
              }}
              responseExample={{
                id: 'uuid',
                firstName: 'Max',
                lastName: 'Mustermann',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/persons/:id"
              description="Einzelne Person abrufen"
              responseExample={{
                id: 'uuid',
                firstName: 'Max',
                lastName: 'Mustermann',
                email: 'max@example.com',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/persons/:id"
              description="Person aktualisieren"
              requestBody={{
                jobTitle: 'Senior Manager',
                mobile: '+49 170 9876543',
              }}
              responseExample={{
                id: 'uuid',
                jobTitle: 'Senior Manager',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/persons/:id"
              description="Person löschen"
              responseExample={{
                message: 'Person gelöscht',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/persons/:id/research"
              description="KI-Recherche für Person durchführen"
              responseExample={{
                message: 'Recherche gestartet',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Leads */}
      <TabsContent value="leads" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Lead-Management und Sales Pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/leads"
              description="Alle Leads abrufen"
              queryParams={['page=1', 'limit=20', 'status=new', 'source=website']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    title: 'Anfrage Website',
                    source: 'website',
                    status: 'new',
                    score: 85,
                  },
                ],
                pagination: { page: 1, limit: 20, total: 30 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/leads"
              description="Neuen Lead erstellen"
              requestBody={{
                companyId: 'uuid',
                personId: 'uuid',
                title: 'Produktanfrage',
                source: 'email',
                sourceDetail: 'info@firma.de',
                status: 'new',
                notes: 'Interessiert an Produkt X',
              }}
              responseExample={{
                id: 'uuid',
                title: 'Produktanfrage',
                status: 'new',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/leads/:id"
              description="Einzelnen Lead abrufen"
              responseExample={{
                id: 'uuid',
                title: 'Anfrage',
                status: 'qualified',
                score: 85,
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/leads/:id"
              description="Lead aktualisieren"
              requestBody={{
                status: 'qualified',
                assignedTo: 'user-uuid',
              }}
              responseExample={{
                id: 'uuid',
                status: 'qualified',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/leads/:id"
              description="Lead löschen"
              responseExample={{
                message: 'Lead gelöscht',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/leads/:id/research"
              description="KI-Recherche für Lead durchführen"
              responseExample={{
                message: 'Recherche gestartet',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/leads/:id/outreach"
              description="Automatische Kontaktaufnahme via KI"
              requestBody={{
                channel: 'email',
                message: 'Benutzerdefinierte Nachricht',
              }}
              responseExample={{
                message: 'Outreach gesendet',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Products */}
      <TabsContent value="products" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Produkte & Dienstleistungen</CardTitle>
            <CardDescription>Produktkatalog-Management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/products"
              description="Alle Produkte abrufen"
              queryParams={['page=1', 'limit=20', 'type=product', 'categoryId=uuid']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Premium Widget',
                    type: 'product',
                    priceNet: '99.99',
                    status: 'active',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 50 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/products"
              description="Neues Produkt erstellen"
              requestBody={{
                type: 'product',
                name: 'Neues Produkt',
                description: 'Produktbeschreibung',
                sku: 'PROD-001',
                categoryId: 'uuid',
                priceNet: '149.99',
                vatRate: '19.00',
                unit: 'Stück',
                status: 'active',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neues Produkt',
                priceNet: '149.99',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/product-categories"
              description="Alle Produktkategorien abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Kategorie 1',
                    slug: 'kategorie-1',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/product-categories"
              description="Neue Kategorie erstellen"
              requestBody={{
                name: 'Neue Kategorie',
                slug: 'neue-kategorie',
                description: 'Beschreibung',
                parentId: null,
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neue Kategorie',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* AI */}
      <TabsContent value="ai" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>KI-Funktionen</CardTitle>
            <CardDescription>AI Provider, Prompts und Logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/ai-providers"
              description="Alle KI-Provider abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    providerType: 'openrouter',
                    name: 'OpenRouter GPT-4',
                    model: 'openai/gpt-4o-mini',
                    isActive: true,
                    isDefault: true,
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai-providers"
              description="Neuen KI-Provider erstellen"
              requestBody={{
                providerType: 'openrouter',
                name: 'Mein Provider',
                model: 'openai/gpt-4o-mini',
                apiKey: 'sk-...',
                maxTokens: 2000,
                temperature: '0.7',
                isActive: true,
              }}
              responseExample={{
                id: 'uuid',
                name: 'Mein Provider',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai/completion"
              description="Text-Vervollständigung via KI"
              requestBody={{
                prompt: 'Schreibe einen Text über...',
                systemPrompt: 'Du bist ein hilfreicher Assistent',
              }}
              responseExample={{
                response: 'Generierte Antwort...',
                model: 'gpt-4o-mini',
                tokensUsed: 150,
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-logs"
              description="KI-Logs abrufen"
              queryParams={['page=1', 'limit=20', 'status=success', 'feature=research']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    model: 'gpt-4o-mini',
                    feature: 'research',
                    status: 'success',
                    totalTokens: 350,
                    createdAt: '2024-01-01T12:00:00Z',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-logs/stats"
              description="KI-Statistiken abrufen"
              responseExample={{
                totalRequests: 1250,
                successRate: 98.5,
                avgDurationMs: 850,
                totalTokens: 125000,
                byProvider: [
                  { provider: 'openrouter', count: 1000 },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-prompt-templates"
              description="Alle Prompt-Templates abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    slug: 'lead_research',
                    name: 'Lead-Recherche',
                    systemPrompt: 'Du bist...',
                    userPrompt: 'Recherchiere...',
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Webhooks */}
      <TabsContent value="webhooks" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>HTTP-Callbacks für Automatisierungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/webhooks"
              description="Alle Webhooks abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Lead Created',
                    url: 'https://example.com/webhook',
                    events: ['lead.created', 'lead.status_changed'],
                    isActive: true,
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/webhooks"
              description="Neuen Webhook erstellen"
              requestBody={{
                name: 'Mein Webhook',
                url: 'https://example.com/webhook',
                events: ['lead.created', 'company.created'],
                secret: 'optional-secret',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Mein Webhook',
                url: 'https://example.com/webhook',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/webhooks/:id"
              description="Webhook aktualisieren"
              requestBody={{
                isActive: false,
              }}
              responseExample={{
                id: 'uuid',
                isActive: false,
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/webhooks/:id"
              description="Webhook löschen"
              responseExample={{
                message: 'Webhook gelöscht',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Admin */}
      <TabsContent value="admin" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Benutzer, Rollen, API-Keys und Tenant-Verwaltung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/users"
              description="Alle Benutzer abrufen (Admin)"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    email: 'user@example.com',
                    firstName: 'Max',
                    lastName: 'Mustermann',
                    role: 'member',
                    status: 'active',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/roles"
              description="Alle Rollen abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'sales',
                    displayName: 'Vertrieb',
                    isSystem: false,
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/roles"
              description="Neue Rolle erstellen"
              requestBody={{
                name: 'custom_role',
                displayName: 'Benutzerdefinierte Rolle',
                description: 'Beschreibung',
                permissions: {
                  companies: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
                },
              }}
              responseExample={{
                id: 'uuid',
                name: 'custom_role',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/api-keys"
              description="Alle API-Keys abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Production Key',
                    keyPrefix: 'xk_live_',
                    permissions: ['read', 'write'],
                    lastUsedAt: '2024-01-01T12:00:00Z',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/api-keys"
              description="Neuen API-Key erstellen"
              requestBody={{
                name: 'Mein API Key',
                permissions: ['read', 'write'],
                expiresAt: '2025-12-31T23:59:59Z',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Mein API Key',
                key: 'xk_live_...', // Nur einmalig sichtbar!
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/tenant"
              description="Tenant-Informationen abrufen"
              responseExample={{
                id: 'uuid',
                name: 'Meine Firma',
                slug: 'meine-firma',
                status: 'active',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/tenant"
              description="Tenant aktualisieren"
              requestBody={{
                name: 'Neue Firmenbezeichnung',
                settings: {
                  theme: 'dark',
                },
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neue Firmenbezeichnung',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/dashboard"
              description="Dashboard-Statistiken"
              responseExample={{
                stats: {
                  totalLeads: 150,
                  newLeads: 12,
                  totalCompanies: 85,
                  totalPersons: 200,
                },
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

interface EndpointDocProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  requestBody?: Record<string, unknown>
  queryParams?: string[]
  responseExample: unknown
}

function EndpointDoc({ method, path, description, requestBody, queryParams, responseExample }: EndpointDocProps) {
  const [copied, setCopied] = useState(false)

  const getCurlCommand = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
    let curl = `curl -X ${method} "${baseUrl}${path}`

    if (queryParams && queryParams.length > 0) {
      curl += `?${queryParams.join('&')}`
    }

    curl += `"`

    if (requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(requestBody, null, 2)}'`
    }

    return curl
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getCurlCommand())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const methodColors = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-500 border-green-500/20',
    PUT: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`${methodColors[method]} font-mono font-bold`}>
              {method}
            </Badge>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{path}</code>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {queryParams && queryParams.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Query-Parameter (optional):</h4>
          <div className="flex flex-wrap gap-2">
            {queryParams.map((param) => (
              <code key={param} className="text-xs bg-muted px-2 py-1 rounded">
                {param}
              </code>
            ))}
          </div>
        </div>
      )}

      {requestBody && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Request Body:</h4>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
            {JSON.stringify(requestBody, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Response:</h4>
        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
          {JSON.stringify(responseExample, null, 2)}
        </pre>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">curl-Beispiel:</h4>
          <button
            onClick={copyToClipboard}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Kopieren
              </>
            )}
          </button>
        </div>
        <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto font-mono">
          {getCurlCommand()}
        </pre>
      </div>
    </div>
  )
}

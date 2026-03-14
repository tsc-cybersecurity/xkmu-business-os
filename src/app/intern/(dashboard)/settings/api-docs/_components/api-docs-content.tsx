'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function ApiDocsContent() {
  return (
    <Tabs defaultValue="auth" className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
        <TabsTrigger value="auth" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auth</TabsTrigger>
        <TabsTrigger value="companies" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Firmen</TabsTrigger>
        <TabsTrigger value="persons" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Personen</TabsTrigger>
        <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Leads</TabsTrigger>
        <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Produkte</TabsTrigger>
        <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dokumente</TabsTrigger>
        <TabsTrigger value="ideas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ideen</TabsTrigger>
        <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Aktivitaeten</TabsTrigger>
        <TabsTrigger value="cms" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CMS</TabsTrigger>
        <TabsTrigger value="blog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Blog</TabsTrigger>
        <TabsTrigger value="marketing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Marketing</TabsTrigger>
        <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Social Media</TabsTrigger>
        <TabsTrigger value="din" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">DIN Audit</TabsTrigger>
        <TabsTrigger value="wiba" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">WiBA</TabsTrigger>
        <TabsTrigger value="media" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Medien</TabsTrigger>
        <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">KI</TabsTrigger>
        <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Webhooks</TabsTrigger>
        <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Backup</TabsTrigger>
        <TabsTrigger value="public" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Oeffentlich</TabsTrigger>
        <TabsTrigger value="n8n" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">n8n</TabsTrigger>
        <TabsTrigger value="kie" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">kie.ai</TabsTrigger>
        <TabsTrigger value="admin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Admin</TabsTrigger>
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

      {/* Backup */}
      <TabsContent value="backup" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Datenbank-Backup</CardTitle>
            <CardDescription>SQL-Export und -Import für Datensicherung und Wiederherstellung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/export/database"
              description="Kompletten SQL-Dump aller Tenant-Daten herunterladen. Erfordert Admin-Rolle oder API-Key mit read-Berechtigung."
              responseExample="-- SQL Export für Tenant: uuid\n-- Erstellt am: 2026-02-12T10:00:00Z\nINSERT INTO companies (...) VALUES (...);\n..."
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/import/database"
              description="SQL-Datei importieren. Erfordert Admin-Rolle oder API-Key mit write-Berechtigung. Unterstützt zwei Modi: 'merge' (Standard, ON CONFLICT DO NOTHING) und 'replace' (bestehende Daten löschen)."
              requestBody={{
                file: '(SQL-Datei als multipart/form-data)',
                mode: 'merge | replace',
              }}
              responseExample={{
                success: true,
                message: 'Import erfolgreich abgeschlossen',
                stats: {
                  totalStatements: 150,
                  totalInserted: 148,
                  tablesAffected: 12,
                  perTable: {
                    companies: 25,
                    persons: 50,
                    leads: 30,
                  },
                  errors: ['persons: duplicate key...'],
                },
              }}
            />

            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="text-sm font-semibold">Hinweise zum Backup-Workflow</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Export via API-Key (curl):</strong></p>
                <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto font-mono">
{`curl -X GET "https://your-domain.com/api/v1/export/database" \\
  -H "x-api-key: xkmu_your_key" \\
  -o backup.sql`}
                </pre>
                <p className="mt-3"><strong>Import via API-Key (curl):</strong></p>
                <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto font-mono">
{`curl -X POST "https://your-domain.com/api/v1/import/database" \\
  -H "x-api-key: xkmu_your_key" \\
  -F "file=@backup.sql" \\
  -F "mode=merge"`}
                </pre>
                <p className="mt-3"><strong>Tabellen (Tenant):</strong> roles, users, api_keys, companies, persons, leads, product_categories, products, ai_providers, ai_logs, ai_prompt_templates, ideas, activities, webhooks, audit_log, documents, document_items, din_audit_sessions, din_answers, cms_pages, cms_blocks, cms_block_templates, cms_navigation_items, blog_posts, media_uploads, company_researches, firecrawl_researches, business_documents, business_profiles, marketing_campaigns, marketing_tasks, marketing_templates, social_media_topics, social_media_posts</p>
                <p className="mt-1"><strong>Tabellen (Global):</strong> din_requirements, din_grants, cms_block_type_definitions</p>
                <p className="mt-1"><strong>Sonstige:</strong> tenants (WHERE id), role_permissions (ueber JOIN mit roles)</p>
              </div>
            </div>
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
              description="Tenant aktualisieren (Name, Slug, Settings inkl. Branding)"
              requestBody={{
                name: 'Neue Firmenbezeichnung',
                settings: {
                  logoUrl: '/api/v1/media/serve/tenant-id/logo.png',
                  logoAlt: 'Meine Firma',
                },
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neue Firmenbezeichnung',
                settings: { logoUrl: '/api/v1/media/serve/tenant-id/logo.png', logoAlt: 'Meine Firma' },
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

            <EndpointDoc
              method="POST"
              path="/api/v1/tenant/seed-demo"
              description="Demo-Daten fuer den Tenant importieren (CMS-Seiten, Blog, Firmen, Personen, Leads, Produkte, Aktivitaeten)"
              responseExample={{
                message: 'Demo-Daten erfolgreich importiert',
                cmsPages: 7,
                navigation: 10,
                blogPosts: 3,
                companies: 5,
                persons: 8,
                leads: 5,
                products: 6,
                activities: 5,
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/admin/database/tables"
              description="Datenbank-Tabellen mit Spalteninformationen auflisten (Admin)"
              responseExample={{
                data: [
                  { tableName: 'companies', columns: [{ name: 'id', type: 'uuid' }, { name: 'name', type: 'text' }] },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/email/send"
              description="E-Mail versenden"
              requestBody={{
                to: 'empfaenger@example.com',
                subject: 'Betreff',
                body: '<p>HTML-Inhalt</p>',
              }}
              responseExample={{ message: 'E-Mail gesendet' }}
            />

            <EndpointDoc
              method="GET"
              path="/api/health"
              description="Health-Check Endpunkt"
              responseExample={{ status: 'ok' }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documents */}
      <TabsContent value="documents" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Dokumente (Angebote & Rechnungen)</CardTitle>
            <CardDescription>Dokumentenmanagement mit Positionen und Status-Workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/documents" description="Dokumente auflisten" queryParams={['type=offer|invoice', 'status=draft|sent|paid', 'companyId=uuid', 'page=1', 'limit=20']} responseExample={{ data: [{ id: 'uuid', number: 'RE-2026-0001', type: 'invoice', status: 'sent', total: 15000 }], pagination: { page: 1, limit: 20, total: 30 } }} />
            <EndpointDoc method="POST" path="/api/v1/documents" description="Neues Dokument anlegen" requestBody={{ type: 'invoice', companyId: 'uuid', date: '2026-02-24', dueDate: '2026-03-24' }} responseExample={{ id: 'uuid', number: 'RE-2026-0042', type: 'invoice', status: 'draft' }} />
            <EndpointDoc method="GET" path="/api/v1/documents/next-number" description="Naechste Dokumentnummer generieren" queryParams={['type=invoice']} responseExample={{ number: 'RE-2026-0043' }} />
            <EndpointDoc method="GET" path="/api/v1/documents/:id" description="Dokument mit Positionen abrufen" responseExample={{ id: 'uuid', number: 'RE-2026-0042', total: 15000, items: [{ description: 'IT-Beratung', quantity: 10, unitPrice: 150 }] }} />
            <EndpointDoc method="PUT" path="/api/v1/documents/:id" description="Dokument aktualisieren" requestBody={{ notes: 'Zahlungsziel 14 Tage' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/documents/:id" description="Dokument loeschen" responseExample={{ message: 'Dokument geloescht' }} />
            <EndpointDoc method="PUT" path="/api/v1/documents/:id/status" description="Dokumentstatus aendern" requestBody={{ status: 'sent' }} responseExample={{ id: 'uuid', status: 'sent' }} />
            <EndpointDoc method="POST" path="/api/v1/documents/:id/convert" description="Angebot in Rechnung konvertieren" responseExample={{ id: 'new-uuid', type: 'invoice', number: 'RE-2026-0043' }} />
            <EndpointDoc method="GET" path="/api/v1/documents/:id/items" description="Positionen eines Dokuments abrufen" responseExample={{ data: [{ id: 'uuid', description: 'IT-Beratung', quantity: 10, unitPrice: 150, total: 1500 }] }} />
            <EndpointDoc method="POST" path="/api/v1/documents/:id/items" description="Position hinzufuegen" requestBody={{ productId: 'uuid', description: 'IT-Beratung', quantity: 10, unitPrice: 150, taxRate: 19 }} responseExample={{ id: 'uuid', total: 1500 }} />
            <EndpointDoc method="PUT" path="/api/v1/documents/:id/items/:itemId" description="Position aktualisieren" requestBody={{ quantity: 20 }} responseExample={{ id: 'uuid', total: 3000 }} />
            <EndpointDoc method="DELETE" path="/api/v1/documents/:id/items/:itemId" description="Position entfernen" responseExample={{ message: 'Position entfernt' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Ideas */}
      <TabsContent value="ideas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ideen</CardTitle>
            <CardDescription>Geschaeftsideen erfassen und in Leads konvertieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/ideas" description="Ideen auflisten" queryParams={['page=1', 'limit=20', 'search=Begriff']} responseExample={{ data: [{ id: 'uuid', title: 'Neues SaaS-Produkt', status: 'open' }] }} />
            <EndpointDoc method="POST" path="/api/v1/ideas" description="Neue Idee anlegen" requestBody={{ title: 'Cloud-Migration Service', description: 'Managed Cloud Migration fuer KMU anbieten' }} responseExample={{ id: 'uuid', title: 'Cloud-Migration Service' }} />
            <EndpointDoc method="GET" path="/api/v1/ideas/:id" description="Idee abrufen" responseExample={{ id: 'uuid', title: 'Cloud-Migration Service', description: '...' }} />
            <EndpointDoc method="PUT" path="/api/v1/ideas/:id" description="Idee aktualisieren" requestBody={{ title: 'Cloud-Migration Premium' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/ideas/:id" description="Idee loeschen" responseExample={{ message: 'Idee geloescht' }} />
            <EndpointDoc method="POST" path="/api/v1/ideas/:id/convert" description="Idee in Lead konvertieren" requestBody={{ targetType: 'lead' }} responseExample={{ leadId: 'uuid', message: 'Idee konvertiert' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Activities */}
      <TabsContent value="activities" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitaeten</CardTitle>
            <CardDescription>Protokollierung von Anrufen, E-Mails, Meetings und Notizen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/activities" description="Aktivitaeten auflisten" queryParams={['page=1', 'limit=20', 'companyId=uuid', 'personId=uuid', 'leadId=uuid', 'type=call|email|meeting|note']} responseExample={{ data: [{ id: 'uuid', type: 'call', subject: 'Erstgespraech', notes: 'Interesse an Produkt X', companyId: 'uuid', createdAt: '2026-02-24T10:00:00Z' }], pagination: { page: 1, limit: 20, total: 50 } }} />
            <EndpointDoc method="POST" path="/api/v1/activities" description="Neue Aktivitaet anlegen" requestBody={{ type: 'call', subject: 'Nachfass-Anruf', notes: 'Angebot besprochen', companyId: 'uuid', personId: 'uuid' }} responseExample={{ id: 'uuid', type: 'call' }} />
            <EndpointDoc method="GET" path="/api/v1/activities/:id" description="Einzelne Aktivitaet abrufen" responseExample={{ id: 'uuid', type: 'call', subject: 'Erstgespraech', notes: '...' }} />
            <EndpointDoc method="DELETE" path="/api/v1/activities/:id" description="Aktivitaet loeschen" responseExample={{ message: 'Aktivitaet geloescht' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* CMS */}
      <TabsContent value="cms" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>CMS - Seiten</CardTitle>
            <CardDescription>Block-basiertes Content Management fuer Website-Seiten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/cms/pages" description="CMS-Seiten auflisten" queryParams={['page=1', 'limit=20', 'status=published|draft']} responseExample={{ data: [{ id: 'uuid', title: 'Startseite', slug: '/', status: 'published' }] }} />
            <EndpointDoc method="POST" path="/api/v1/cms/pages" description="Neue Seite anlegen" requestBody={{ title: 'Ueber uns', slug: '/ueber-uns', status: 'draft' }} responseExample={{ id: 'uuid', slug: '/ueber-uns' }} />
            <EndpointDoc method="GET" path="/api/v1/cms/pages/:id" description="Seite mit Bloecken abrufen" responseExample={{ id: 'uuid', title: 'Startseite', blocks: [{ id: 'uuid', type: 'hero', content: {} }] }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/pages/:id" description="Seite aktualisieren" requestBody={{ title: 'Ueber uns - Neu' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/cms/pages/:id" description="Seite loeschen" responseExample={{ message: 'Seite geloescht' }} />
            <EndpointDoc method="POST" path="/api/v1/cms/pages/:id/publish" description="Seite veroeffentlichen" responseExample={{ status: 'published' }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CMS - Bloecke</CardTitle>
            <CardDescription>Content-Bloecke innerhalb von Seiten verwalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/cms/pages/:id/blocks" description="Bloecke einer Seite auflisten" responseExample={{ data: [{ id: 'uuid', type: 'hero', sortOrder: 0, content: {} }] }} />
            <EndpointDoc method="POST" path="/api/v1/cms/pages/:id/blocks" description="Block zu Seite hinzufuegen" requestBody={{ blockTypeId: 'uuid', content: { title: 'Willkommen' }, sortOrder: 0 }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/pages/:id/blocks/reorder" description="Block-Reihenfolge aendern" requestBody={{ blockIds: ['uuid-1', 'uuid-2', 'uuid-3'] }} responseExample={{ message: 'Reihenfolge aktualisiert' }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/blocks/:id" description="Block aktualisieren" requestBody={{ content: { title: 'Neuer Titel' } }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/cms/blocks/:id" description="Block loeschen" responseExample={{ message: 'Block geloescht' }} />
            <EndpointDoc method="POST" path="/api/v1/cms/blocks/:id/duplicate" description="Block duplizieren" responseExample={{ id: 'new-uuid' }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CMS - Navigation, Templates & Block-Typen</CardTitle>
            <CardDescription>Website-Navigation, Vorlagen und Block-Typ-Definitionen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/cms/navigation" description="Navigationseintraege auflisten" responseExample={{ data: [{ id: 'uuid', label: 'Startseite', url: '/', parentId: null, sortOrder: 0 }] }} />
            <EndpointDoc method="POST" path="/api/v1/cms/navigation" description="Navigationseintrag anlegen" requestBody={{ label: 'Kontakt', url: '/kontakt', sortOrder: 5 }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/navigation/:id" description="Navigationseintrag aktualisieren" requestBody={{ label: 'Kontakt & Support' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/cms/navigation/:id" description="Navigationseintrag loeschen" responseExample={{ message: 'Eintrag geloescht' }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/navigation/reorder" description="Navigation umsortieren" requestBody={{ items: [{ id: 'uuid', sortOrder: 0 }] }} responseExample={{ message: 'Sortierung aktualisiert' }} />
            <EndpointDoc method="GET" path="/api/v1/cms/templates" description="Block-Vorlagen auflisten" responseExample={{ data: [{ id: 'uuid', name: 'Hero Standard', blockType: 'hero', content: {} }] }} />
            <EndpointDoc method="POST" path="/api/v1/cms/templates" description="Block-Vorlage erstellen" requestBody={{ name: 'Mein Template', blockTypeId: 'uuid', content: { title: 'Vorlage' } }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/cms/block-types" description="Block-Typ-Definitionen auflisten" responseExample={{ data: [{ id: 'uuid', slug: 'hero', name: 'Hero', schema: {} }] }} />
            <EndpointDoc method="POST" path="/api/v1/cms/block-types" description="Block-Typ erstellen" requestBody={{ slug: 'custom', name: 'Custom Block', schema: {} }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="PUT" path="/api/v1/cms/block-types/:id" description="Block-Typ aktualisieren" requestBody={{ name: 'Custom Block v2' }} responseExample={{ id: 'uuid' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Blog */}
      <TabsContent value="blog" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Blog</CardTitle>
            <CardDescription>Blog-Beitraege erstellen, veroeffentlichen und per KI generieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/blog/posts" description="Blog-Beitraege auflisten" queryParams={['page=1', 'limit=20', 'status=published|draft', 'search=Titel']} responseExample={{ data: [{ id: 'uuid', title: 'IT-Trends 2026', slug: 'it-trends-2026', status: 'published' }] }} />
            <EndpointDoc method="POST" path="/api/v1/blog/posts" description="Blog-Beitrag anlegen" requestBody={{ title: 'Neuer Beitrag', content: '<p>Inhalt...</p>', status: 'draft' }} responseExample={{ id: 'uuid', slug: 'neuer-beitrag' }} />
            <EndpointDoc method="GET" path="/api/v1/blog/posts/:id" description="Beitrag abrufen" responseExample={{ id: 'uuid', title: 'IT-Trends 2026', content: '<p>...</p>', status: 'published' }} />
            <EndpointDoc method="PUT" path="/api/v1/blog/posts/:id" description="Beitrag aktualisieren" requestBody={{ title: 'IT-Trends 2026 - Update' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/blog/posts/:id" description="Beitrag loeschen" responseExample={{ message: 'Beitrag geloescht' }} />
            <EndpointDoc method="POST" path="/api/v1/blog/posts/:id/publish" description="Beitrag veroeffentlichen" responseExample={{ status: 'published', publishedAt: '2026-02-24T10:00:00Z' }} />
            <EndpointDoc method="POST" path="/api/v1/blog/posts/generate" description="Kompletten Blog-Beitrag per KI generieren" requestBody={{ topic: 'Cybersecurity fuer KMU', keywords: ['IT-Sicherheit', 'KMU'], tone: 'professionell', length: 'mittel' }} responseExample={{ id: 'uuid', title: 'Cybersecurity fuer KMU...', content: '<p>...</p>' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Marketing */}
      <TabsContent value="marketing" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Marketing - Kampagnen</CardTitle>
            <CardDescription>Marketing-Kampagnen planen und verwalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/marketing/campaigns" description="Kampagnen auflisten" queryParams={['page=1', 'limit=20', 'status=active|draft|completed']} responseExample={{ data: [{ id: 'uuid', name: 'Fruehjahrs-Kampagne', status: 'active', budget: 5000 }] }} />
            <EndpointDoc method="POST" path="/api/v1/marketing/campaigns" description="Kampagne erstellen" requestBody={{ name: 'Newsletter Q1', type: 'email', budget: 1000, startDate: '2026-03-01', endDate: '2026-03-31' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/marketing/campaigns/:id" description="Kampagne abrufen" responseExample={{ id: 'uuid', name: 'Newsletter Q1', status: 'active', tasks: [] }} />
            <EndpointDoc method="PUT" path="/api/v1/marketing/campaigns/:id" description="Kampagne aktualisieren" requestBody={{ status: 'completed' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/marketing/campaigns/:id" description="Kampagne loeschen" responseExample={{ message: 'Kampagne geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/marketing/campaigns/:id/tasks" description="Aufgaben einer Kampagne abrufen" responseExample={{ data: [{ id: 'uuid', title: 'Landing Page erstellen', status: 'pending' }] }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Marketing - Aufgaben & Vorlagen</CardTitle>
            <CardDescription>Kampagnen-Aufgaben und wiederverwendbare Vorlagen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/marketing/tasks" description="Alle Marketing-Aufgaben auflisten" queryParams={['page=1', 'limit=20', 'status=pending|done', 'campaignId=uuid']} responseExample={{ data: [{ id: 'uuid', title: 'Zielgruppen-Analyse', status: 'pending', campaignId: 'uuid' }] }} />
            <EndpointDoc method="POST" path="/api/v1/marketing/tasks" description="Aufgabe erstellen" requestBody={{ title: 'Social Media Posts planen', campaignId: 'uuid', priority: 'high' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/marketing/tasks/:id" description="Aufgabe abrufen" responseExample={{ id: 'uuid', title: 'Social Media Posts planen', status: 'pending' }} />
            <EndpointDoc method="PUT" path="/api/v1/marketing/tasks/:id" description="Aufgabe aktualisieren" requestBody={{ status: 'done' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/marketing/tasks/:id" description="Aufgabe loeschen" responseExample={{ message: 'Aufgabe geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/marketing/templates" description="Marketing-Vorlagen auflisten" responseExample={{ data: [{ id: 'uuid', name: 'Email-Kampagne Standard', type: 'email' }] }} />
            <EndpointDoc method="POST" path="/api/v1/marketing/templates" description="Vorlage erstellen" requestBody={{ name: 'Messe-Kampagne', type: 'event', content: {} }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/marketing/templates/:id" description="Vorlage abrufen" responseExample={{ id: 'uuid', name: 'Messe-Kampagne', content: {} }} />
            <EndpointDoc method="PUT" path="/api/v1/marketing/templates/:id" description="Vorlage aktualisieren" requestBody={{ name: 'Messe-Kampagne v2' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/marketing/templates/:id" description="Vorlage loeschen" responseExample={{ message: 'Vorlage geloescht' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Social Media */}
      <TabsContent value="social" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
            <CardDescription>Posts erstellen, planen und per KI optimieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/social-media/posts" description="Social-Media-Posts auflisten" queryParams={['page=1', 'limit=20', 'platform=linkedin|facebook|instagram|twitter|xing', 'status=draft|scheduled|published']} responseExample={{ data: [{ id: 'uuid', content: 'Neuer Post...', platform: 'linkedin', status: 'scheduled' }] }} />
            <EndpointDoc method="POST" path="/api/v1/social-media/posts" description="Post erstellen" requestBody={{ content: 'Spannende Einblicke...', platform: 'linkedin', hashtags: ['IT', 'KMU'], status: 'draft' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/social-media/posts/:id" description="Post abrufen" responseExample={{ id: 'uuid', content: 'Post-Text...', platform: 'linkedin' }} />
            <EndpointDoc method="PUT" path="/api/v1/social-media/posts/:id" description="Post aktualisieren" requestBody={{ content: 'Aktualisierter Text...' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/social-media/posts/:id" description="Post loeschen" responseExample={{ message: 'Post geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/social-media/topics" description="Themen auflisten" responseExample={{ data: [{ id: 'uuid', name: 'IT-Security', description: 'Beitraege zu IT-Sicherheit' }] }} />
            <EndpointDoc method="POST" path="/api/v1/social-media/topics" description="Thema anlegen" requestBody={{ name: 'Cloud Computing', description: 'Beitraege zu Cloud-Themen' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/social-media/topics/:id" description="Thema abrufen" responseExample={{ id: 'uuid', name: 'IT-Security' }} />
            <EndpointDoc method="PUT" path="/api/v1/social-media/topics/:id" description="Thema aktualisieren" requestBody={{ name: 'IT-Sicherheit' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/social-media/topics/:id" description="Thema loeschen" responseExample={{ message: 'Thema geloescht' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* DIN Audit */}
      <TabsContent value="din" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>DIN SPEC 27076 Audits</CardTitle>
            <CardDescription>Digitalisierungs-Checks fuer KMU und Foerdermittel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/din/audits" description="Audits auflisten" responseExample={{ data: [{ id: 'uuid', companyName: 'Musterfirma GmbH', score: 72, status: 'completed' }] }} />
            <EndpointDoc method="POST" path="/api/v1/din/audits" description="Neues Audit anlegen" requestBody={{ companyId: 'uuid' }} responseExample={{ id: 'uuid', status: 'created' }} />
            <EndpointDoc method="GET" path="/api/v1/din/audits/:id" description="Audit abrufen" responseExample={{ id: 'uuid', company: { name: 'Musterfirma GmbH' }, score: 72, status: 'completed' }} />
            <EndpointDoc method="PUT" path="/api/v1/din/audits/:id" description="Audit aktualisieren" requestBody={{ status: 'in_progress' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/din/audits/:id" description="Audit loeschen" responseExample={{ message: 'Audit geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/din/audits/:id/answers" description="Audit-Antworten abrufen" responseExample={{ data: [{ requirementId: 'uuid', score: 3, notes: 'Gut umgesetzt' }] }} />
            <EndpointDoc method="POST" path="/api/v1/din/audits/:id/answers" description="Audit-Antworten speichern" requestBody={{ answers: [{ requirementId: 'uuid', score: 3, notes: 'Gut umgesetzt' }] }} responseExample={{ message: 'Antworten gespeichert' }} />
            <EndpointDoc method="GET" path="/api/v1/din/audits/:id/scoring" description="Scoring berechnen" responseExample={{ totalScore: 72, maxScore: 100, categories: [{ name: 'IT-Sicherheit', score: 80 }] }} />
            <EndpointDoc method="GET" path="/api/v1/din/requirements" description="DIN-Anforderungen auflisten" responseExample={{ data: [{ id: 'uuid', category: 'IT-Sicherheit', question: 'Ist eine Firewall vorhanden?', maxScore: 4 }] }} />
            <EndpointDoc method="GET" path="/api/v1/din/grants" description="Foerderprogramme auflisten" responseExample={{ data: [{ id: 'uuid', name: 'Digital Jetzt', maxAmount: 50000, region: 'Bundesweit' }] }} />
            <EndpointDoc method="POST" path="/api/v1/din/grants" description="Foerderprogramm anlegen" requestBody={{ name: 'go-digital', maxAmount: 16500, region: 'Bundesweit' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="GET" path="/api/v1/din/grants/:id" description="Foerderprogramm abrufen" responseExample={{ id: 'uuid', name: 'go-digital', maxAmount: 16500 }} />
            <EndpointDoc method="PUT" path="/api/v1/din/grants/:id" description="Foerderprogramm aktualisieren" requestBody={{ maxAmount: 20000 }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/din/grants/:id" description="Foerderprogramm loeschen" responseExample={{ message: 'Foerderprogramm geloescht' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* WiBA */}
      <TabsContent value="wiba" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>BSI WiBA-Checks</CardTitle>
            <CardDescription>Weg in die Basis-Absicherung - IT-Sicherheitspruefung mit 257 Anforderungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/wiba/audits" description="WiBA-Checks auflisten" responseExample={{ data: [{ id: 'uuid', companyName: 'Musterfirma GmbH', status: 'in_progress' }] }} />
            <EndpointDoc method="POST" path="/api/v1/wiba/audits" description="Neuen WiBA-Check anlegen" requestBody={{ companyId: 'uuid' }} responseExample={{ id: 'uuid', status: 'created' }} />
            <EndpointDoc method="GET" path="/api/v1/wiba/audits/:id" description="WiBA-Check abrufen" responseExample={{ id: 'uuid', company: { name: 'Musterfirma GmbH' }, status: 'in_progress' }} />
            <EndpointDoc method="PUT" path="/api/v1/wiba/audits/:id" description="WiBA-Check aktualisieren" requestBody={{ status: 'completed' }} responseExample={{ id: 'uuid' }} />
            <EndpointDoc method="DELETE" path="/api/v1/wiba/audits/:id" description="WiBA-Check loeschen" responseExample={{ message: 'Check geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/wiba/audits/:id/answers" description="Antworten abrufen" responseExample={{ data: [{ requirementId: 1, status: 'ja', notes: 'Umgesetzt' }] }} />
            <EndpointDoc method="POST" path="/api/v1/wiba/audits/:id/answers" description="Antworten speichern (einzeln oder Bulk)" requestBody={{ requirementId: 1, status: 'ja', notes: 'Umgesetzt' }} responseExample={{ message: 'Antwort gespeichert' }} />
            <EndpointDoc method="GET" path="/api/v1/wiba/audits/:id/scoring" description="Scoring und Risikobewertung berechnen" responseExample={{ currentScore: 180, maxScore: 257, riskLevel: { level: 'Mittel', color: 'yellow' }, categoryProgress: { 1: 85, 2: 60 } }} />
            <EndpointDoc method="GET" path="/api/v1/wiba/requirements" description="Alle 257 WiBA-Anforderungen auflisten" responseExample={{ data: { requirements: [{ id: 1, category: 1, questionText: 'Sind Sicherheitsrichtlinien definiert?' }], categoryNames: { 1: 'Organisation & Personal' }, categoryOrder: [1, 2, 3], categoryPriorities: { 1: 1, 2: 2 } } }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Media */}
      <TabsContent value="media" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Medien</CardTitle>
            <CardDescription>Dateien hochladen und verwalten (Bilder, Dokumente etc.)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/media" description="Alle Medien-Uploads auflisten" queryParams={['page=1', 'limit=20']} responseExample={{ data: [{ id: 'uuid', filename: 'logo.png', mimeType: 'image/png', sizeBytes: 45000, path: '/api/v1/media/serve/tenant-id/logo.png', createdAt: '2026-02-24T10:00:00Z' }] }} />
            <EndpointDoc method="POST" path="/api/v1/media/upload" description="Datei hochladen (multipart/form-data, Feld: file). Erlaubt: JPEG, PNG, WebP, GIF, max. 5 MB. In Produktion persistent im Docker-Volume." requestBody={{ file: '(Datei als FormData)' }} responseExample={{ id: 'uuid', filename: 'a1b2c3d4.png', originalName: 'foto.jpg', path: '/api/v1/media/serve/tenant-id/a1b2c3d4.png', mimeType: 'image/jpeg', sizeBytes: 120000 }} />
            <EndpointDoc method="DELETE" path="/api/v1/media/:id" description="Datei loeschen (DB-Eintrag + Datei auf Disk)" responseExample={{ message: 'Datei geloescht' }} />
            <EndpointDoc method="GET" path="/api/v1/media/serve/:tenantId/:filename" description="Hochgeladene Datei ausliefern (oeffentlich, kein Auth). Cache: 1 Jahr, immutable." responseExample={{ '(Bilddatei als Binary-Response)': true }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Public */}
      <TabsContent value="public" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Oeffentliche API</CardTitle>
            <CardDescription>Endpunkte ohne Authentifizierung fuer die oeffentliche Website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/public/branding" description="Branding-Informationen (Logo, Alt-Text). Fallback auf Standard-Logo wenn keins in Tenant-Settings konfiguriert." responseExample={{ logoUrl: '/api/v1/media/serve/tenant-id/logo.png', logoAlt: 'Meine Firma' }} />
            <EndpointDoc method="GET" path="/api/v1/public/blog/posts" description="Veroeffentlichte Blog-Beitraege (oeffentlich, keine Auth)" queryParams={['page=1', 'limit=10']} responseExample={{ data: [{ title: 'IT-Trends', slug: 'it-trends', excerpt: '...', publishedAt: '2026-02-20' }] }} />
            <EndpointDoc method="GET" path="/api/v1/public/blog/posts/:slug" description="Blog-Beitrag nach Slug (oeffentlich)" responseExample={{ title: 'IT-Trends', content: '<p>...</p>', publishedAt: '2026-02-20' }} />
            <EndpointDoc method="GET" path="/api/v1/public/pages/:slug" description="CMS-Seite nach Slug (oeffentlich)" responseExample={{ title: 'Ueber uns', blocks: [{ type: 'hero', content: {} }] }} />
            <EndpointDoc method="GET" path="/api/v1/public/navigation" description="Website-Navigation (oeffentlich)" responseExample={{ data: [{ label: 'Startseite', url: '/', children: [] }] }} />
            <EndpointDoc method="POST" path="/api/v1/contact" description="Kontaktformular absenden (keine Auth)" requestBody={{ name: 'Max Mustermann', email: 'max@example.com', subject: 'Anfrage', message: 'Ich interessiere mich fuer...' }} responseExample={{ message: 'Nachricht gesendet' }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* n8n Workflows */}
      <TabsContent value="n8n" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>n8n Verbindung</CardTitle>
            <CardDescription>n8n-Instanz verbinden und verwalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/n8n/connection" description="n8n-Verbindung anzeigen" responseExample={{ success: true, data: { id: '...', name: 'n8n Cloud', apiUrl: 'https://your.app.n8n.cloud', apiKey: '****abcd', isActive: true } }} />
            <EndpointDoc method="POST" path="/api/v1/n8n/connection" description="n8n-Verbindung erstellen oder aktualisieren" requestBody={{ name: 'n8n Cloud', apiUrl: 'https://your.app.n8n.cloud', apiKey: 'n8n_api_...' }} responseExample={{ success: true, data: { id: '...', name: 'n8n Cloud', apiUrl: 'https://your.app.n8n.cloud', apiKey: '****_...' } }} />
            <EndpointDoc method="POST" path="/api/v1/n8n/connection/test" description="n8n-Verbindung testen" responseExample={{ success: true, data: { success: true, message: 'Verbindung erfolgreich' } }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>n8n Workflows</CardTitle>
            <CardDescription>Workflows auflisten, erstellen, steuern</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="GET" path="/api/v1/n8n/workflows" description="Alle Workflows auflisten" responseExample={{ success: true, data: [{ id: '1', name: 'Video Generator', active: true }] }} />
            <EndpointDoc method="POST" path="/api/v1/n8n/workflows" description="Workflow erstellen (JSON)" requestBody={{ name: 'Mein Workflow', nodes: [], connections: {}, settings: { executionOrder: 'v1' } }} responseExample={{ success: true, data: { id: '1', name: 'Mein Workflow', active: false } }} />
            <EndpointDoc method="GET" path="/api/v1/n8n/workflows/:id" description="Workflow-Details abrufen" responseExample={{ success: true, data: { id: '1', name: 'Video Generator', active: true, nodes: [] } }} />
            <EndpointDoc method="PUT" path="/api/v1/n8n/workflows/:id" description="Workflow aktualisieren" requestBody={{ name: 'Neuer Name' }} responseExample={{ success: true, data: { id: '1', name: 'Neuer Name' } }} />
            <EndpointDoc method="DELETE" path="/api/v1/n8n/workflows/:id" description="Workflow loeschen" responseExample={{ success: true, data: { deleted: true } }} />
            <EndpointDoc method="POST" path="/api/v1/n8n/workflows/:id/activate" description="Workflow aktivieren/deaktivieren" requestBody={{ active: true }} responseExample={{ success: true, data: { id: '1', active: true } }} />
            <EndpointDoc method="POST" path="/api/v1/n8n/workflows/:id/execute" description="Workflow ausfuehren" requestBody={{ data: { key: 'value' } }} responseExample={{ success: true, data: { executionId: '123' } }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KI-Workflow-Generator</CardTitle>
            <CardDescription>Workflows aus natürlicher Sprache generieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="POST" path="/api/v1/n8n/workflows/generate" description="Workflow aus Beschreibung generieren" requestBody={{ prompt: 'Erstelle einen Workflow der...', autoDeploy: false }} responseExample={{ success: true, data: { workflowJson: { name: 'Generierter Workflow', nodes: [] }, logId: '...', status: 'draft' } }} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* kie.ai Video-Generierung */}
      <TabsContent value="kie" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>kie.ai Video-Generierung</CardTitle>
            <CardDescription>Videos mit Kling 3.0 generieren und Status abfragen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc method="POST" path="/api/v1/kie/generate" description="Video-Generierung starten" requestBody={{ prompt: 'Cinematic video of a product showcase', model: 'market/kling/kling-3.0', aspectRatio: '16:9', mode: 'std', sound: false }} responseExample={{ success: true, data: { taskId: 'task_abc123' } }} />
            <EndpointDoc method="GET" path="/api/v1/kie/status/:taskId" description="Video-Generierungs-Status abfragen" responseExample={{ success: true, data: { taskId: 'task_abc123', status: 'completed', progress: 100, resultUrl: 'https://...' } }} />
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

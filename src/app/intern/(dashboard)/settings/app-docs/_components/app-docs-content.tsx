'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Copy,
  Check,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  FileText,
  TrendingUp,
  Lightbulb,
  Globe,
  Brain,
  Shield,
  Settings,
  Megaphone,
  Share2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'

export function AppDocsContent() {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
        <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Uebersicht</TabsTrigger>
        <TabsTrigger value="auth" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auth</TabsTrigger>
        <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dashboard</TabsTrigger>
        <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Kontakte</TabsTrigger>
        <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Katalog</TabsTrigger>
        <TabsTrigger value="finance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Finanzen</TabsTrigger>
        <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Leads</TabsTrigger>
        <TabsTrigger value="ideas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ideen</TabsTrigger>
        <TabsTrigger value="cms" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CMS</TabsTrigger>
        <TabsTrigger value="blog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Blog</TabsTrigger>
        <TabsTrigger value="marketing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Marketing</TabsTrigger>
        <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Social Media</TabsTrigger>
        <TabsTrigger value="din" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">DIN Audit</TabsTrigger>
        <TabsTrigger value="cyber" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cybersecurity</TabsTrigger>
        <TabsTrigger value="bi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">BI</TabsTrigger>
        <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">KI</TabsTrigger>
        <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Einstellungen</TabsTrigger>
        <TabsTrigger value="public" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Oeffentlich</TabsTrigger>
      </TabsList>

      {/* ===== ÜBERSICHT ===== */}
      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Architektur-Uebersicht</CardTitle>
            <CardDescription>Technischer Aufbau und Kernkonzepte der Anwendung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Tech-Stack">
              <InfoTable rows={[
                ['Framework', 'Next.js 16 (App Router)'],
                ['Frontend', 'React 19, Tailwind CSS, shadcn/ui'],
                ['Datenbank', 'PostgreSQL mit Drizzle ORM'],
                ['Deployment', 'Docker (Self-Hosted)'],
                ['Authentifizierung', 'Session-basiert mit httpOnly Cookies'],
                ['Sprache', 'Deutsch (UI), Englisch (API/Code)'],
              ]} />
            </SectionBlock>

            <SectionBlock title="Multi-Tenant-Architektur">
              <p className="text-sm text-muted-foreground mb-3">
                Jede Datenbankentitaet ist mit einer <code className="text-xs bg-muted px-1.5 py-0.5 rounded">tenantId</code> versehen.
                Benutzer sehen ausschliesslich Daten ihres eigenen Mandanten. Die Tenant-Isolation wird automatisch
                durch die Middleware sichergestellt.
              </p>
              <CodeBlock code={`// Beispiel: Middleware-Pattern
withPermission(request, 'companies', 'read', async (req, session) => {
  const companies = await db.query.companies.findMany({
    where: eq(companies.tenantId, session.tenantId),
  })
  return apiSuccess(companies)
})`} />
            </SectionBlock>

            <SectionBlock title="Berechtigungssystem (RBAC)">
              <p className="text-sm text-muted-foreground mb-3">
                Rollenbasierte Zugriffskontrolle. Jede Rolle definiert Berechtigungen pro Modul und Aktion.
              </p>
              <InfoTable rows={[
                ['Modul', 'Aktionen'],
                ['contacts', 'read, create, update, delete'],
                ['catalog', 'read, create, update, delete'],
                ['finance / documents', 'read, create, update, delete'],
                ['leads', 'read, create, update, delete'],
                ['ideas', 'read, create, update, delete'],
                ['blog', 'read, create, update, delete, publish'],
                ['cms', 'read, create, update, delete, publish'],
                ['marketing', 'read, create, update, delete'],
                ['social_media', 'read, create, update, delete'],
                ['din_audits', 'read, create, update, delete'],
                ['basisabsicherung', 'read, create, update, delete'],
                ['settings', 'read, update'],
                ['users', 'read, create, update, delete'],
                ['roles', 'read, create, update, delete'],
                ['ai', 'read, create'],
                ['business_intelligence', 'read'],
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Konventionen">
              <p className="text-sm text-muted-foreground mb-3">
                Alle API-Endpunkte befinden sich unter <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/v1/</code> und
                folgen einheitlichen Mustern:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Erfolgreiche Antwort</h4>
                  <CodeBlock code={`{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Fehler-Antwort</h4>
                  <CodeBlock code={`{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ressource nicht gefunden"
  }
}`} />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title="Moduluebersicht">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <ModuleCard icon={<Building2 className="h-5 w-5" />} name="Kontakte" desc="Firmen & Personen verwalten" pages={8} apis={12} />
                <ModuleCard icon={<Package className="h-5 w-5" />} name="Katalog" desc="Produkte, Services, Kategorien" pages={7} apis={6} />
                <ModuleCard icon={<FileText className="h-5 w-5" />} name="Finanzen" desc="Angebote & Rechnungen" pages={6} apis={10} />
                <ModuleCard icon={<TrendingUp className="h-5 w-5" />} name="Leads" desc="Sales Pipeline" pages={3} apis={6} />
                <ModuleCard icon={<Lightbulb className="h-5 w-5" />} name="Ideen" desc="Ideen erfassen & konvertieren" pages={2} apis={5} />
                <ModuleCard icon={<Globe className="h-5 w-5" />} name="CMS" desc="Block-basiertes Content Management" pages={4} apis={18} />
                <ModuleCard icon={<FileText className="h-5 w-5" />} name="Blog" desc="Blog-Beitraege mit KI" pages={3} apis={7} />
                <ModuleCard icon={<Megaphone className="h-5 w-5" />} name="Marketing" desc="Kampagnen & Aufgaben" pages={4} apis={12} />
                <ModuleCard icon={<Share2 className="h-5 w-5" />} name="Social Media" desc="Posts & Content-Planung" pages={5} apis={10} />
                <ModuleCard icon={<Shield className="h-5 w-5" />} name="DIN Audit" desc="DIN SPEC 27076 Audits" pages={6} apis={10} />
                <ModuleCard icon={<Shield className="h-5 w-5" />} name="Cybersecurity" desc="IT-Grundschutz Basisabsicherung" pages={1} apis={0} />
                <ModuleCard icon={<Brain className="h-5 w-5" />} name="Business Intelligence" desc="KPIs & Analysen" pages={1} apis={2} />
                <ModuleCard icon={<Settings className="h-5 w-5" />} name="Einstellungen" desc="System-Konfiguration" pages={14} apis={20} />
              </div>
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== AUTHENTIFIZIERUNG ===== */}
      <TabsContent value="auth" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentifizierung & Autorisierung</CardTitle>
            <CardDescription>Login, Registrierung, Session-Management und Berechtigungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/login', name: 'Login', desc: 'Anmeldung mit E-Mail und Passwort. Weiterleitung zum Dashboard nach Erfolg.' },
                { url: '/intern/register', name: 'Registrierung', desc: 'Neuen Benutzer und Mandanten (Tenant) anlegen. Erstellt automatisch Admin-Rolle.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Ablauf">
              <FlowDiagram steps={[
                'Benutzer gibt E-Mail + Passwort ein',
                'Server validiert Credentials',
                'Session-Cookie (httpOnly) wird gesetzt',
                'Weiterleitung zum Dashboard',
                'Bei jedem Request: Session wird geprueft',
                'Berechtigungen werden aus der Rolle geladen',
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc
                method="POST"
                path="/api/v1/auth/login"
                description="Benutzer anmelden. Setzt Session-Cookie."
                requestBody={{
                  email: 'user@example.com',
                  password: 'passwort123',
                }}
                responseExample={{
                  message: 'Login erfolgreich',
                  user: { id: 'uuid', email: 'user@example.com', firstName: 'Max', lastName: 'Mustermann', role: 'admin' },
                }}
              />
              <EndpointDoc
                method="POST"
                path="/api/v1/auth/register"
                description="Neuen Benutzer und Tenant registrieren."
                requestBody={{
                  email: 'neu@example.com',
                  password: 'sicheres-passwort',
                  firstName: 'Max',
                  lastName: 'Mustermann',
                }}
                responseExample={{
                  message: 'Registrierung erfolgreich',
                  user: { id: 'uuid', email: 'neu@example.com' },
                }}
              />
              <EndpointDoc
                method="GET"
                path="/api/v1/auth/me"
                description="Aktuelle Session-Informationen und Benutzerdetails abrufen."
                responseExample={{
                  user: { id: 'uuid', email: 'user@example.com', tenantId: 'uuid', role: 'admin' },
                }}
              />
              <EndpointDoc
                method="GET"
                path="/api/v1/auth/permissions"
                description="Berechtigungen des aktuellen Benutzers fuer alle Module."
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
                description="Session beenden und Cookie loeschen."
                responseExample={{ message: 'Logout erfolgreich' }}
              />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== DASHBOARD ===== */}
      <TabsContent value="dashboard" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><LayoutDashboard className="inline h-5 w-5 mr-2" />Dashboard</CardTitle>
            <CardDescription>Zentrale Uebersicht mit KPIs, Trends und aktuellen Daten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seite">
              <PageTable pages={[
                { url: '/intern/dashboard', name: 'Haupt-Dashboard', desc: 'Zeigt Geschaeftskennzahlen, Umsatztrends, letzte Kontakte, offene Angebote/Rechnungen, Lead-Status und Aktivitaeten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Dashboard-Inhalte">
              <FeatureList features={[
                { name: 'KPI-Karten', desc: 'Gesamtumsatz, offene Rechnungen, aktive Leads, Anzahl Kontakte' },
                { name: 'Umsatz-Trend', desc: 'Monatlicher Umsatzverlauf als Chart' },
                { name: 'Letzte Kontakte', desc: 'Zuletzt angelegte oder bearbeitete Firmen/Personen' },
                { name: 'Offene Angebote', desc: 'Angebote im Status "gesendet" mit Wert' },
                { name: 'Faellige Rechnungen', desc: 'Ueberfaellige Rechnungen mit Betrag' },
                { name: 'Lead-Pipeline', desc: 'Verteilung der Leads nach Status' },
                { name: 'Aktivitaeten', desc: 'Letzte Aktivitaeten (Anrufe, E-Mails, Meetings)' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkt">
              <EndpointDoc
                method="GET"
                path="/api/v1/dashboard"
                description="Dashboard-Daten mit allen KPIs und Statistiken abrufen."
                responseExample={{
                  stats: {
                    totalRevenue: 125000,
                    openInvoices: 12,
                    activeLeads: 23,
                    totalContacts: 156,
                  },
                  recentCompanies: ['...'],
                  openOffers: ['...'],
                  leadsByStatus: { new: 5, contacted: 8, qualified: 6, proposal: 4 },
                }}
              />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== KONTAKTE ===== */}
      <TabsContent value="contacts" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Building2 className="inline h-5 w-5 mr-2" />Kontakte - Firmen</CardTitle>
            <CardDescription>Verwaltung von Firmenkontakten mit KI-Recherche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/contacts/companies', name: 'Firmenliste', desc: 'Tabellarische Uebersicht aller Firmen mit Suche, Filter (Status, Branche), Sortierung und Paginierung.' },
                { url: '/intern/contacts/companies/new', name: 'Neue Firma', desc: 'Formular zum Anlegen einer neuen Firma mit allen Stammdaten.' },
                { url: '/intern/contacts/companies/[id]', name: 'Firmendetail', desc: 'Detailansicht mit Stammdaten, zugeordneten Personen, Aktivitaeten und Research-Ergebnissen.' },
                { url: '/intern/contacts/companies/[id]/edit', name: 'Firma bearbeiten', desc: 'Bearbeitungsformular fuer alle Firmendaten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell">
              <FieldTable fields={[
                { name: 'name', type: 'string', required: true, desc: 'Firmenname' },
                { name: 'legalForm', type: 'string', required: false, desc: 'Rechtsform (GmbH, AG, etc.)' },
                { name: 'industry', type: 'string', required: false, desc: 'Branche' },
                { name: 'website', type: 'string', required: false, desc: 'Website-URL' },
                { name: 'email', type: 'string', required: false, desc: 'E-Mail-Adresse' },
                { name: 'phone', type: 'string', required: false, desc: 'Telefonnummer' },
                { name: 'street', type: 'string', required: false, desc: 'Strasse' },
                { name: 'houseNumber', type: 'string', required: false, desc: 'Hausnummer' },
                { name: 'postalCode', type: 'string', required: false, desc: 'PLZ' },
                { name: 'city', type: 'string', required: false, desc: 'Stadt' },
                { name: 'country', type: 'string', required: false, desc: 'Land' },
                { name: 'status', type: 'enum', required: false, desc: 'prospect | customer | inactive' },
                { name: 'notes', type: 'text', required: false, desc: 'Freitext-Notizen' },
                { name: 'tags', type: 'string[]', required: false, desc: 'Tags zur Kategorisierung' },
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen">
              <FeatureList features={[
                { name: 'Website-Crawling', desc: 'Automatisches Auslesen von Firmendaten (Branche, Beschreibung, Kontaktdaten) von der Firmen-Website.' },
                { name: 'KI-Research', desc: 'Umfassende KI-Recherche zur Firma mit automatischer Datenextraktion (Mitarbeiterzahl, Umsatz, etc.). Ergebnisse koennen angenommen oder abgelehnt werden.' },
                { name: 'Dokumentenanalyse', desc: 'PDF-Upload und KI-Analyse zur Extraktion von Finanz-KPIs und Geschaeftsdaten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc
                method="GET"
                path="/api/v1/companies"
                description="Alle Firmen abrufen mit Paginierung und Filtern."
                queryParams={['page=1', 'limit=20', 'search=Begriff', 'status=customer', 'tags=tag1,tag2']}
                responseExample={{
                  data: [{ id: 'uuid', name: 'Musterfirma GmbH', status: 'customer', city: 'Berlin' }],
                  pagination: { page: 1, limit: 20, total: 42 },
                }}
              />
              <EndpointDoc
                method="POST"
                path="/api/v1/companies"
                description="Neue Firma erstellen."
                requestBody={{
                  name: 'Neue Firma GmbH',
                  legalForm: 'GmbH',
                  street: 'Hauptstrasse',
                  houseNumber: '123',
                  postalCode: '10115',
                  city: 'Berlin',
                  email: 'kontakt@neuefirma.de',
                  industry: 'IT',
                  status: 'prospect',
                }}
                responseExample={{ id: 'uuid', name: 'Neue Firma GmbH', status: 'prospect' }}
              />
              <EndpointDoc method="GET" path="/api/v1/companies/:id" description="Einzelne Firma abrufen." responseExample={{ id: 'uuid', name: 'Musterfirma GmbH', status: 'customer', city: 'Berlin' }} />
              <EndpointDoc method="PUT" path="/api/v1/companies/:id" description="Firma aktualisieren." requestBody={{ status: 'customer', notes: 'Wichtiger Kunde' }} responseExample={{ id: 'uuid', status: 'customer' }} />
              <EndpointDoc method="DELETE" path="/api/v1/companies/:id" description="Firma loeschen." responseExample={{ message: 'Firma geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/companies/:id/crawl" description="Website der Firma crawlen und Daten extrahieren." responseExample={{ data: { industry: 'IT-Dienstleistungen', description: '...' } }} />
              <EndpointDoc method="POST" path="/api/v1/companies/:id/research" description="KI-Recherche fuer Firma starten." responseExample={{ message: 'Recherche gestartet' }} />
              <EndpointDoc method="POST" path="/api/v1/companies/:id/research/:researchId/apply" description="Research-Ergebnisse auf Firmendaten anwenden." responseExample={{ message: 'Daten uebernommen' }} />
              <EndpointDoc method="POST" path="/api/v1/companies/:id/research/:researchId/reject" description="Research-Ergebnisse ablehnen." responseExample={{ message: 'Ergebnisse abgelehnt' }} />
              <EndpointDoc method="POST" path="/api/v1/companies/:id/analyze-document" description="PDF-Dokument hochladen und per KI analysieren." requestBody={{ file: '(PDF als FormData)' }} responseExample={{ data: { revenue: '5.200.000', employees: 45 } }} />
              <EndpointDoc method="GET" path="/api/v1/companies/:id/persons" description="Kontaktpersonen einer Firma auflisten." responseExample={{ data: [{ id: 'uuid', firstName: 'Max', lastName: 'Mustermann', jobTitle: 'CEO' }] }} />
            </SectionBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><Users className="inline h-5 w-5 mr-2" />Kontakte - Personen</CardTitle>
            <CardDescription>Verwaltung von Kontaktpersonen mit Firmenzuordnung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/contacts/persons', name: 'Personenliste', desc: 'Uebersicht aller Personen mit Suche, Filter nach Firma und Paginierung.' },
                { url: '/intern/contacts/persons/new', name: 'Neue Person', desc: 'Formular zum Anlegen einer Person mit Firmenzuordnung.' },
                { url: '/intern/contacts/persons/[id]', name: 'Personendetail', desc: 'Detailansicht mit Kontaktdaten, zugehoeriger Firma und Aktivitaeten.' },
                { url: '/intern/contacts/persons/[id]/edit', name: 'Person bearbeiten', desc: 'Bearbeitungsformular fuer Personendaten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell">
              <FieldTable fields={[
                { name: 'salutation', type: 'string', required: false, desc: 'Anrede (Herr/Frau)' },
                { name: 'firstName', type: 'string', required: true, desc: 'Vorname' },
                { name: 'lastName', type: 'string', required: true, desc: 'Nachname' },
                { name: 'email', type: 'string', required: false, desc: 'E-Mail-Adresse' },
                { name: 'phone', type: 'string', required: false, desc: 'Telefon' },
                { name: 'mobile', type: 'string', required: false, desc: 'Mobilnummer' },
                { name: 'jobTitle', type: 'string', required: false, desc: 'Position/Jobtitel' },
                { name: 'department', type: 'string', required: false, desc: 'Abteilung' },
                { name: 'companyId', type: 'uuid', required: false, desc: 'Zugeordnete Firma' },
                { name: 'notes', type: 'text', required: false, desc: 'Notizen' },
                { name: 'tags', type: 'string[]', required: false, desc: 'Tags' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/persons" description="Alle Personen abrufen." queryParams={['page=1', 'limit=20', 'search=Name', 'companyId=uuid']} responseExample={{ data: [{ id: 'uuid', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com' }], pagination: { page: 1, limit: 20, total: 15 } }} />
              <EndpointDoc method="POST" path="/api/v1/persons" description="Neue Person erstellen." requestBody={{ companyId: 'uuid', salutation: 'Herr', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', jobTitle: 'CEO' }} responseExample={{ id: 'uuid', firstName: 'Max', lastName: 'Mustermann' }} />
              <EndpointDoc method="GET" path="/api/v1/persons/:id" description="Person abrufen." responseExample={{ id: 'uuid', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', company: { name: 'Musterfirma GmbH' } }} />
              <EndpointDoc method="PUT" path="/api/v1/persons/:id" description="Person aktualisieren." requestBody={{ jobTitle: 'CTO', mobile: '+49 170 9876543' }} responseExample={{ id: 'uuid', jobTitle: 'CTO' }} />
              <EndpointDoc method="DELETE" path="/api/v1/persons/:id" description="Person loeschen." responseExample={{ message: 'Person geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/persons/:id/research" description="KI-Recherche zur Person starten." responseExample={{ message: 'Recherche gestartet' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== KATALOG ===== */}
      <TabsContent value="catalog" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Package className="inline h-5 w-5 mr-2" />Katalog</CardTitle>
            <CardDescription>Produkte, Dienstleistungen und Kategorien verwalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten - Produkte">
              <PageTable pages={[
                { url: '/intern/catalog/products', name: 'Produktliste', desc: 'Uebersicht aller Produkte mit Preis, Kategorie und Status.' },
                { url: '/intern/catalog/products/new', name: 'Neues Produkt', desc: 'Formular zum Anlegen eines Produkts.' },
                { url: '/intern/catalog/products/[id]', name: 'Produktdetail', desc: 'Detailansicht mit Preis, Einheit, Kategorie.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Seiten - Dienstleistungen">
              <PageTable pages={[
                { url: '/intern/catalog/services', name: 'Dienstleistungsliste', desc: 'Uebersicht aller Dienstleistungen (Stundensaetze etc.).' },
                { url: '/intern/catalog/services/new', name: 'Neue Dienstleistung', desc: 'Formular zum Anlegen einer Dienstleistung.' },
                { url: '/intern/catalog/services/[id]', name: 'Dienstleistungsdetail', desc: 'Detailansicht mit Preis und Einheit.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Seiten - Kategorien">
              <PageTable pages={[
                { url: '/intern/catalog/categories', name: 'Kategorien', desc: 'Verwaltung der Produktkategorien mit Erstellen, Bearbeiten, Loeschen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell - Produkt">
              <FieldTable fields={[
                { name: 'name', type: 'string', required: true, desc: 'Produktname' },
                { name: 'description', type: 'text', required: false, desc: 'Beschreibung' },
                { name: 'sku', type: 'string', required: false, desc: 'Artikelnummer (SKU)' },
                { name: 'price', type: 'decimal', required: true, desc: 'Nettopreis in EUR' },
                { name: 'taxRate', type: 'decimal', required: false, desc: 'Steuersatz in % (Standard: 19)' },
                { name: 'unit', type: 'string', required: false, desc: 'Einheit (Stueck, Stunde, Monat, etc.)' },
                { name: 'type', type: 'enum', required: true, desc: 'product | service' },
                { name: 'categoryId', type: 'uuid', required: false, desc: 'Zugeordnete Kategorie' },
                { name: 'status', type: 'enum', required: false, desc: 'active | inactive' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/products" description="Alle Produkte/Dienstleistungen abrufen." queryParams={['page=1', 'limit=20', 'search=Name', 'type=product', 'categoryId=uuid']} responseExample={{ data: [{ id: 'uuid', name: 'Webentwicklung', price: 120, unit: 'Stunde', type: 'service' }], pagination: { page: 1, limit: 20, total: 10 } }} />
              <EndpointDoc method="POST" path="/api/v1/products" description="Produkt/Dienstleistung erstellen." requestBody={{ name: 'IT-Beratung', price: 150, unit: 'Stunde', type: 'service', taxRate: 19 }} responseExample={{ id: 'uuid', name: 'IT-Beratung' }} />
              <EndpointDoc method="GET" path="/api/v1/products/:id" description="Einzelnes Produkt abrufen." responseExample={{ id: 'uuid', name: 'IT-Beratung', price: 150, unit: 'Stunde' }} />
              <EndpointDoc method="PUT" path="/api/v1/products/:id" description="Produkt aktualisieren." requestBody={{ price: 160 }} responseExample={{ id: 'uuid', price: 160 }} />
              <EndpointDoc method="DELETE" path="/api/v1/products/:id" description="Produkt loeschen." responseExample={{ message: 'Produkt geloescht' }} />
              <EndpointDoc method="GET" path="/api/v1/product-categories" description="Kategorien auflisten." responseExample={{ data: [{ id: 'uuid', name: 'IT-Services' }] }} />
              <EndpointDoc method="POST" path="/api/v1/product-categories" description="Kategorie anlegen." requestBody={{ name: 'Cloud-Services' }} responseExample={{ id: 'uuid', name: 'Cloud-Services' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== FINANZEN ===== */}
      <TabsContent value="finance" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><FileText className="inline h-5 w-5 mr-2" />Finanzen - Angebote & Rechnungen</CardTitle>
            <CardDescription>Dokumentenmanagement mit Status-Workflows und Positionen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten - Angebote">
              <PageTable pages={[
                { url: '/intern/finance/offers', name: 'Angebotsliste', desc: 'Uebersicht mit Status-Filter (Entwurf, Gesendet, Angenommen, Abgelehnt). Gesamtwert pro Angebot sichtbar.' },
                { url: '/intern/finance/offers/new', name: 'Neues Angebot', desc: 'Angebotsformular mit Kundenauswahl, Positionen (Produkte/Dienstleistungen), automatischer Berechnung.' },
                { url: '/intern/finance/offers/[id]', name: 'Angebotsdetail', desc: 'Detailansicht mit Positionen, Summen, Status-Aktionen und Konvertierung zu Rechnung.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Seiten - Rechnungen">
              <PageTable pages={[
                { url: '/intern/finance/invoices', name: 'Rechnungsliste', desc: 'Uebersicht mit Status-Filter (Entwurf, Gesendet, Bezahlt, Ueberfaellig, Storniert).' },
                { url: '/intern/finance/invoices/new', name: 'Neue Rechnung', desc: 'Rechnungsformular mit Positionen und automatischer Nummernvergabe.' },
                { url: '/intern/finance/invoices/[id]', name: 'Rechnungsdetail', desc: 'Detailansicht mit Positionen, Summen und Status-Aktionen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Status-Workflows">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Angebot</h4>
                  <FlowDiagram steps={['draft (Entwurf)', 'sent (Gesendet)', 'accepted (Angenommen) / rejected (Abgelehnt)', 'converted (In Rechnung konvertiert)']} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Rechnung</h4>
                  <FlowDiagram steps={['draft (Entwurf)', 'sent (Gesendet)', 'paid (Bezahlt) / overdue (Ueberfaellig)', 'cancelled (Storniert)']} />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title="Datenmodell - Dokument">
              <FieldTable fields={[
                { name: 'number', type: 'string', required: false, desc: 'Auto-generierte Dokumentnummer (z.B. RE-2026-0001)' },
                { name: 'type', type: 'enum', required: true, desc: 'offer | invoice' },
                { name: 'companyId', type: 'uuid', required: true, desc: 'Kunde (Firma)' },
                { name: 'personId', type: 'uuid', required: false, desc: 'Ansprechpartner' },
                { name: 'date', type: 'date', required: true, desc: 'Dokumentdatum' },
                { name: 'dueDate', type: 'date', required: false, desc: 'Faelligkeitsdatum' },
                { name: 'status', type: 'enum', required: false, desc: 'Status (abhaengig vom Typ)' },
                { name: 'notes', type: 'text', required: false, desc: 'Anmerkungen/Bemerkungen' },
                { name: 'subtotal', type: 'decimal', required: false, desc: 'Zwischensumme netto (berechnet)' },
                { name: 'taxAmount', type: 'decimal', required: false, desc: 'Steuerbetrag (berechnet)' },
                { name: 'total', type: 'decimal', required: false, desc: 'Gesamtbetrag brutto (berechnet)' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell - Position (Item)">
              <FieldTable fields={[
                { name: 'productId', type: 'uuid', required: false, desc: 'Verknuepftes Produkt/Dienstleistung' },
                { name: 'description', type: 'string', required: true, desc: 'Beschreibung der Position' },
                { name: 'quantity', type: 'decimal', required: true, desc: 'Menge' },
                { name: 'unitPrice', type: 'decimal', required: true, desc: 'Einzelpreis (netto)' },
                { name: 'taxRate', type: 'decimal', required: false, desc: 'Steuersatz in %' },
                { name: 'total', type: 'decimal', required: false, desc: 'Positionssumme (berechnet)' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/documents" description="Dokumente auflisten." queryParams={['type=offer', 'status=sent', 'companyId=uuid', 'page=1', 'limit=20']} responseExample={{ data: [{ id: 'uuid', number: 'AN-2026-0001', type: 'offer', status: 'sent', total: 15000 }], pagination: { page: 1, limit: 20, total: 30 } }} />
              <EndpointDoc method="POST" path="/api/v1/documents" description="Neues Dokument anlegen." requestBody={{ type: 'invoice', companyId: 'uuid', date: '2026-02-24', dueDate: '2026-03-24' }} responseExample={{ id: 'uuid', number: 'RE-2026-0042', type: 'invoice', status: 'draft' }} />
              <EndpointDoc method="GET" path="/api/v1/documents/:id" description="Dokument mit allen Positionen abrufen." responseExample={{ id: 'uuid', number: 'RE-2026-0042', total: 15000, items: [{ description: 'IT-Beratung', quantity: 10, unitPrice: 150 }] }} />
              <EndpointDoc method="PUT" path="/api/v1/documents/:id" description="Dokument aktualisieren." requestBody={{ notes: 'Zahlungsziel 14 Tage' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/documents/:id" description="Dokument loeschen." responseExample={{ message: 'Dokument geloescht' }} />
              <EndpointDoc method="GET" path="/api/v1/documents/next-number" description="Naechste Dokumentnummer generieren." queryParams={['type=invoice']} responseExample={{ number: 'RE-2026-0043' }} />
              <EndpointDoc method="PUT" path="/api/v1/documents/:id/status" description="Dokumentstatus aendern." requestBody={{ status: 'sent' }} responseExample={{ id: 'uuid', status: 'sent' }} />
              <EndpointDoc method="POST" path="/api/v1/documents/:id/convert" description="Angebot in Rechnung konvertieren." responseExample={{ id: 'new-uuid', type: 'invoice', number: 'RE-2026-0043' }} />
              <EndpointDoc method="POST" path="/api/v1/documents/:id/items" description="Position hinzufuegen." requestBody={{ productId: 'uuid', description: 'IT-Beratung', quantity: 10, unitPrice: 150, taxRate: 19 }} responseExample={{ id: 'uuid', total: 1500 }} />
              <EndpointDoc method="PUT" path="/api/v1/documents/:id/items/:itemId" description="Position aktualisieren." requestBody={{ quantity: 20 }} responseExample={{ id: 'uuid', total: 3000 }} />
              <EndpointDoc method="DELETE" path="/api/v1/documents/:id/items/:itemId" description="Position entfernen." responseExample={{ message: 'Position entfernt' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== LEADS ===== */}
      <TabsContent value="leads" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><TrendingUp className="inline h-5 w-5 mr-2" />Leads</CardTitle>
            <CardDescription>Sales Pipeline und Lead-Management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/leads', name: 'Lead-Uebersicht', desc: 'Lead-Pipeline als Liste mit Statusfilter. Zeigt Quelle, Wert, Wahrscheinlichkeit und zugeordneten Kontakt.' },
                { url: '/intern/leads/new', name: 'Neuer Lead', desc: 'Formular zum Erfassen eines neuen Leads mit Firmenzuordnung.' },
                { url: '/intern/leads/[id]', name: 'Lead-Detail', desc: 'Detailansicht mit Aktivitaeten, Research-Ergebnissen und Outreach-Optionen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Status-Workflow">
              <FlowDiagram steps={['new (Neu)', 'contacted (Kontaktiert)', 'qualified (Qualifiziert)', 'proposal (Angebot)', 'won (Gewonnen) / lost (Verloren)']} />
            </SectionBlock>

            <SectionBlock title="Datenmodell">
              <FieldTable fields={[
                { name: 'title', type: 'string', required: true, desc: 'Lead-Titel/Bezeichnung' },
                { name: 'companyId', type: 'uuid', required: false, desc: 'Zugeordnete Firma' },
                { name: 'personId', type: 'uuid', required: false, desc: 'Ansprechpartner' },
                { name: 'value', type: 'decimal', required: false, desc: 'Geschaetzter Auftragswert in EUR' },
                { name: 'status', type: 'enum', required: false, desc: 'new | contacted | qualified | proposal | won | lost' },
                { name: 'source', type: 'string', required: false, desc: 'Lead-Quelle (website, referral, cold, etc.)' },
                { name: 'probability', type: 'integer', required: false, desc: 'Abschlusswahrscheinlichkeit (0-100%)' },
                { name: 'notes', type: 'text', required: false, desc: 'Notizen' },
                { name: 'assignedTo', type: 'uuid', required: false, desc: 'Zugewiesener Benutzer' },
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen">
              <FeatureList features={[
                { name: 'Lead-Research', desc: 'KI-gestuetzte Recherche zum Lead und zugehoeriger Firma.' },
                { name: 'Outreach-Generierung', desc: 'KI generiert personalisierte Kontaktaufnahme-Texte (E-Mail, LinkedIn, Telefon-Skript).' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/leads" description="Leads abrufen." queryParams={['page=1', 'limit=20', 'status=new', 'source=website', 'assignedTo=uuid', 'search=Begriff']} responseExample={{ data: [{ id: 'uuid', title: 'Anfrage Website', status: 'new', value: 5000, probability: 60 }], pagination: { page: 1, limit: 20, total: 30 } }} />
              <EndpointDoc method="POST" path="/api/v1/leads" description="Neuen Lead erstellen." requestBody={{ title: 'Anfrage IT-Beratung', companyId: 'uuid', value: 10000, source: 'website', status: 'new' }} responseExample={{ id: 'uuid', title: 'Anfrage IT-Beratung' }} />
              <EndpointDoc method="GET" path="/api/v1/leads/:id" description="Lead abrufen." responseExample={{ id: 'uuid', title: 'Anfrage IT-Beratung', status: 'new', value: 10000, company: { name: 'Musterfirma GmbH' } }} />
              <EndpointDoc method="PUT" path="/api/v1/leads/:id" description="Lead aktualisieren." requestBody={{ status: 'contacted', probability: 40 }} responseExample={{ id: 'uuid', status: 'contacted' }} />
              <EndpointDoc method="DELETE" path="/api/v1/leads/:id" description="Lead loeschen." responseExample={{ message: 'Lead geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/leads/:id/research" description="KI-Research zum Lead starten." responseExample={{ message: 'Recherche gestartet' }} />
              <EndpointDoc method="POST" path="/api/v1/leads/:id/outreach" description="KI-Outreach-Text generieren." requestBody={{ channel: 'email', tone: 'professional' }} responseExample={{ text: 'Sehr geehrte/r ..., bezugnehmend auf...' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== IDEEN ===== */}
      <TabsContent value="ideas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Lightbulb className="inline h-5 w-5 mr-2" />Ideen</CardTitle>
            <CardDescription>Geschaeftsideen erfassen und in Leads oder Projekte konvertieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/ideas', name: 'Ideenliste', desc: 'Uebersicht aller erfassten Ideen mit Status und Beschreibung.' },
                { url: '/intern/ideas/[id]', name: 'Ideendetail', desc: 'Detailansicht mit Moeglichkeit zur Konvertierung in Lead.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Funktionen">
              <FeatureList features={[
                { name: 'Idee erfassen', desc: 'Schnelles Erfassen von Geschaeftsideen mit Titel und Beschreibung.' },
                { name: 'Konvertierung', desc: 'Idee kann in einen Lead konvertiert werden, wobei die Daten uebernommen werden.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/ideas" description="Ideen auflisten." queryParams={['page=1', 'limit=20', 'search=Begriff']} responseExample={{ data: [{ id: 'uuid', title: 'Neues SaaS-Produkt', status: 'open' }] }} />
              <EndpointDoc method="POST" path="/api/v1/ideas" description="Neue Idee anlegen." requestBody={{ title: 'Cloud-Migration Service', description: 'Managed Cloud Migration fuer KMU anbieten' }} responseExample={{ id: 'uuid', title: 'Cloud-Migration Service' }} />
              <EndpointDoc method="GET" path="/api/v1/ideas/:id" description="Idee abrufen." responseExample={{ id: 'uuid', title: 'Cloud-Migration Service', description: '...' }} />
              <EndpointDoc method="PUT" path="/api/v1/ideas/:id" description="Idee aktualisieren." requestBody={{ title: 'Cloud-Migration Premium' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/ideas/:id" description="Idee loeschen." responseExample={{ message: 'Idee geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/ideas/:id/convert" description="Idee in Lead konvertieren." requestBody={{ targetType: 'lead' }} responseExample={{ leadId: 'uuid', message: 'Idee konvertiert' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== CMS ===== */}
      <TabsContent value="cms" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Globe className="inline h-5 w-5 mr-2" />Content Management System</CardTitle>
            <CardDescription>Block-basiertes CMS fuer Website-Seiten und Navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/cms', name: 'CMS-Seitenuebersicht', desc: 'Liste aller CMS-Seiten mit Status (Entwurf/Veroeffentlicht), Slug und letzter Aenderung.' },
                { url: '/intern/cms/[id]', name: 'Seiteneditor', desc: 'Block-basierter Editor. Bloecke koennen hinzugefuegt, bearbeitet, sortiert und geloescht werden.' },
                { url: '/intern/cms/[id]/blocks/[blockId]', name: 'Block-Editor', desc: 'Detaileditor fuer einzelne Content-Bloecke mit typenspezifischem Formular.' },
                { url: '/intern/cms/navigation', name: 'Navigation', desc: 'Verwaltung der Website-Navigation. Hierarchische Struktur mit Drag & Drop Sortierung.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Block-Architektur">
              <p className="text-sm text-muted-foreground mb-3">
                Seiten bestehen aus sortierbaren Bloecken. Jeder Block hat einen Typ (z.B. Hero, Text, Features-Grid)
                und speichert seinen Inhalt als JSON.
              </p>
              <CodeBlock code={`Seite (Page)
├── Block 1: Hero
│   └── { title, subtitle, buttonText, buttonUrl, image }
├── Block 2: Features-Grid
│   └── { features: [{ icon, title, description }] }
├── Block 3: Text
│   └── { content: "<p>HTML-Inhalt</p>" }
└── Block N: ...`} />
            </SectionBlock>

            <SectionBlock title="Funktionen">
              <FeatureList features={[
                { name: 'Block-basierter Editor', desc: 'Seiten werden aus verschiebbaren Content-Bloecken zusammengesetzt.' },
                { name: 'Block-Typen', desc: 'Vordefinierte Typen (Hero, Text, Bild, Features, CTA, etc.) mit JSON-Schema.' },
                { name: 'Block duplizieren', desc: 'Bestehende Bloecke koennen kopiert werden.' },
                { name: 'Drag & Drop Sortierung', desc: 'Bloecke koennen per Drag & Drop umsortiert werden.' },
                { name: 'Vorlagen (Templates)', desc: 'Seitenlayouts als Vorlage speichern und wiederverwenden.' },
                { name: 'SEO-Generierung', desc: 'KI generiert automatisch SEO-Titel, -Beschreibung und -Keywords.' },
                { name: 'Veroeffentlichung', desc: 'Seiten koennen als Entwurf oder veroeffentlicht gespeichert werden.' },
                { name: 'Navigation', desc: 'Hierarchische Navigationsstruktur mit internen/externen Links.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Seiten">
              <EndpointDoc method="GET" path="/api/v1/cms/pages" description="CMS-Seiten auflisten." queryParams={['page=1', 'limit=20', 'status=published']} responseExample={{ data: [{ id: 'uuid', title: 'Startseite', slug: '/', status: 'published' }] }} />
              <EndpointDoc method="POST" path="/api/v1/cms/pages" description="Neue Seite anlegen." requestBody={{ title: 'Ueber uns', slug: '/ueber-uns', status: 'draft' }} responseExample={{ id: 'uuid', slug: '/ueber-uns' }} />
              <EndpointDoc method="GET" path="/api/v1/cms/pages/:id" description="Seite mit Bloecken abrufen." responseExample={{ id: 'uuid', title: 'Startseite', blocks: [{ id: 'uuid', type: 'hero', content: {} }] }} />
              <EndpointDoc method="PUT" path="/api/v1/cms/pages/:id" description="Seite aktualisieren." requestBody={{ title: 'Ueber uns - Neu' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/cms/pages/:id" description="Seite loeschen." responseExample={{ message: 'Seite geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/cms/pages/:id/publish" description="Seite veroeffentlichen." responseExample={{ status: 'published' }} />
              <EndpointDoc method="POST" path="/api/v1/cms/pages/:id/seo/generate" description="SEO-Metadaten per KI generieren." responseExample={{ seoTitle: 'Ueber uns | xKMU', seoDescription: '...', seoKeywords: 'firma, team, ...' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Bloecke">
              <EndpointDoc method="GET" path="/api/v1/cms/pages/:id/blocks" description="Bloecke einer Seite auflisten." responseExample={{ data: [{ id: 'uuid', type: 'hero', sortOrder: 0, content: {} }] }} />
              <EndpointDoc method="POST" path="/api/v1/cms/pages/:id/blocks" description="Block zu Seite hinzufuegen." requestBody={{ blockTypeId: 'uuid', content: { title: 'Willkommen' }, sortOrder: 0 }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="PUT" path="/api/v1/cms/pages/:id/blocks/reorder" description="Block-Reihenfolge aendern." requestBody={{ blockIds: ['uuid-1', 'uuid-2', 'uuid-3'] }} responseExample={{ message: 'Reihenfolge aktualisiert' }} />
              <EndpointDoc method="GET" path="/api/v1/cms/blocks/:id" description="Block abrufen." responseExample={{ id: 'uuid', type: 'hero', content: { title: 'Willkommen' } }} />
              <EndpointDoc method="PUT" path="/api/v1/cms/blocks/:id" description="Block aktualisieren." requestBody={{ content: { title: 'Neuer Titel' } }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/cms/blocks/:id" description="Block loeschen." responseExample={{ message: 'Block geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/cms/blocks/:id/duplicate" description="Block duplizieren." responseExample={{ id: 'new-uuid' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Navigation">
              <EndpointDoc method="GET" path="/api/v1/cms/navigation" description="Navigationseintraege auflisten." responseExample={{ data: [{ id: 'uuid', label: 'Startseite', url: '/', parentId: null, sortOrder: 0 }] }} />
              <EndpointDoc method="POST" path="/api/v1/cms/navigation" description="Navigationseintrag anlegen." requestBody={{ label: 'Kontakt', url: '/kontakt', sortOrder: 5 }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="PUT" path="/api/v1/cms/navigation/reorder" description="Navigation umsortieren." requestBody={{ items: [{ id: 'uuid', sortOrder: 0 }] }} responseExample={{ message: 'Sortierung aktualisiert' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== BLOG ===== */}
      <TabsContent value="blog" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><FileText className="inline h-5 w-5 mr-2" />Blog</CardTitle>
            <CardDescription>Blog-Beitraege erstellen, veroeffentlichen und per KI generieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/blog', name: 'Blog-Uebersicht', desc: 'Liste aller Blog-Beitraege mit Status, Titel, Erstelldatum und Veroeffentlichungsdatum.' },
                { url: '/intern/blog/new', name: 'Neuer Beitrag', desc: 'Editor zum Erstellen eines Blog-Beitrags mit Rich-Text-Editor.' },
                { url: '/intern/blog/[id]', name: 'Beitrag bearbeiten', desc: 'Beitrag bearbeiten, SEO konfigurieren und veroeffentlichen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Oeffentliche Seiten">
              <PageTable pages={[
                { url: '/it-news', name: 'IT-News (oeffentlich)', desc: 'Oeffentliche Auflistung aller veroeffentlichten Blog-Beitraege.' },
                { url: '/it-news/[slug]', name: 'Beitrag (oeffentlich)', desc: 'Oeffentliche Einzelansicht eines Blog-Beitrags.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell">
              <FieldTable fields={[
                { name: 'title', type: 'string', required: true, desc: 'Beitragstitel' },
                { name: 'slug', type: 'string', required: true, desc: 'URL-Slug (auto-generiert aus Titel)' },
                { name: 'content', type: 'richtext', required: true, desc: 'Beitragsinhalt (HTML/Markdown)' },
                { name: 'excerpt', type: 'text', required: false, desc: 'Kurzauszug fuer Vorschau' },
                { name: 'coverImage', type: 'string', required: false, desc: 'Titelbild-URL' },
                { name: 'status', type: 'enum', required: false, desc: 'draft | published' },
                { name: 'publishedAt', type: 'datetime', required: false, desc: 'Veroeffentlichungsdatum' },
                { name: 'seoTitle', type: 'string', required: false, desc: 'SEO-Titel' },
                { name: 'seoDescription', type: 'string', required: false, desc: 'SEO-Meta-Description' },
                { name: 'seoKeywords', type: 'string', required: false, desc: 'SEO-Keywords' },
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen">
              <FeatureList features={[
                { name: 'Beitrag generieren', desc: 'Kompletten Blog-Beitrag per KI aus Thema, Keywords und Tonalitaet erstellen.' },
                { name: 'SEO generieren', desc: 'SEO-Titel, -Beschreibung und -Keywords automatisch aus dem Beitragsinhalt ableiten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/blog/posts" description="Blog-Beitraege auflisten." queryParams={['page=1', 'limit=20', 'status=published', 'search=Titel']} responseExample={{ data: [{ id: 'uuid', title: 'IT-Trends 2026', slug: 'it-trends-2026', status: 'published' }] }} />
              <EndpointDoc method="POST" path="/api/v1/blog/posts" description="Blog-Beitrag anlegen." requestBody={{ title: 'Neuer Beitrag', content: '<p>Inhalt...</p>', status: 'draft' }} responseExample={{ id: 'uuid', slug: 'neuer-beitrag' }} />
              <EndpointDoc method="GET" path="/api/v1/blog/posts/:id" description="Beitrag abrufen." responseExample={{ id: 'uuid', title: 'IT-Trends 2026', content: '<p>...</p>', status: 'published' }} />
              <EndpointDoc method="PUT" path="/api/v1/blog/posts/:id" description="Beitrag aktualisieren." requestBody={{ title: 'IT-Trends 2026 - Update' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/blog/posts/:id" description="Beitrag loeschen." responseExample={{ message: 'Beitrag geloescht' }} />
              <EndpointDoc method="POST" path="/api/v1/blog/posts/:id/publish" description="Beitrag veroeffentlichen." responseExample={{ status: 'published', publishedAt: '2026-02-24T10:00:00Z' }} />
              <EndpointDoc method="POST" path="/api/v1/blog/posts/:id/seo/generate" description="SEO-Metadaten per KI generieren." responseExample={{ seoTitle: 'IT-Trends 2026 | xKMU Blog', seoDescription: '...', seoKeywords: 'IT, Trends, 2026' }} />
              <EndpointDoc method="POST" path="/api/v1/blog/posts/generate" description="Kompletten Blog-Beitrag per KI generieren." requestBody={{ topic: 'Cybersecurity fuer KMU', keywords: ['IT-Sicherheit', 'KMU'], tone: 'professionell', length: 'mittel' }} responseExample={{ id: 'uuid', title: 'Cybersecurity fuer KMU...', content: '<p>...</p>' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== MARKETING ===== */}
      <TabsContent value="marketing" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Megaphone className="inline h-5 w-5 mr-2" />Marketing</CardTitle>
            <CardDescription>Marketing-Kampagnen planen und durchfuehren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/marketing', name: 'Kampagnen-Uebersicht', desc: 'Liste aller Kampagnen mit Status, Zeitraum und Budget.' },
                { url: '/intern/marketing/new', name: 'Neue Kampagne', desc: 'Kampagne mit Zielgruppe, Budget und Zeitraum erstellen.' },
                { url: '/intern/marketing/[id]', name: 'Kampagnendetail', desc: 'Detailansicht mit Aufgaben, Fortschritt und Status.' },
                { url: '/intern/marketing/templates', name: 'Vorlagen', desc: 'Kampagnenvorlagen fuer wiederkehrende Marketing-Aktionen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell - Kampagne">
              <FieldTable fields={[
                { name: 'name', type: 'string', required: true, desc: 'Kampagnenname' },
                { name: 'description', type: 'text', required: false, desc: 'Beschreibung' },
                { name: 'type', type: 'string', required: false, desc: 'Kampagnentyp (Email, Social, Event, etc.)' },
                { name: 'status', type: 'enum', required: false, desc: 'draft | active | paused | completed' },
                { name: 'startDate', type: 'date', required: false, desc: 'Startdatum' },
                { name: 'endDate', type: 'date', required: false, desc: 'Enddatum' },
                { name: 'budget', type: 'decimal', required: false, desc: 'Budget in EUR' },
                { name: 'targetAudience', type: 'text', required: false, desc: 'Zielgruppenbeschreibung' },
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen">
              <FeatureList features={[
                { name: 'Aufgaben generieren', desc: 'KI erstellt automatisch eine Aufgabenliste basierend auf Kampagnentyp und Zielgruppe.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/marketing/campaigns" description="Kampagnen auflisten." queryParams={['page=1', 'limit=20', 'status=active']} responseExample={{ data: [{ id: 'uuid', name: 'Fruehjahrs-Kampagne', status: 'active', budget: 5000 }] }} />
              <EndpointDoc method="POST" path="/api/v1/marketing/campaigns" description="Kampagne erstellen." requestBody={{ name: 'Newsletter Q1', type: 'email', budget: 1000 }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="GET" path="/api/v1/marketing/campaigns/:id/tasks" description="Aufgaben einer Kampagne." responseExample={{ data: [{ id: 'uuid', title: 'Landing Page erstellen', status: 'pending' }] }} />
              <EndpointDoc method="POST" path="/api/v1/marketing/tasks/generate" description="Aufgaben per KI generieren." requestBody={{ campaignId: 'uuid' }} responseExample={{ tasks: [{ title: 'Zielgruppen-Analyse', priority: 'high' }] }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== SOCIAL MEDIA ===== */}
      <TabsContent value="social" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Share2 className="inline h-5 w-5 mr-2" />Social Media</CardTitle>
            <CardDescription>Posts erstellen, planen und per KI optimieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/social-media', name: 'Beitragsliste', desc: 'Uebersicht aller Social-Media-Posts mit Plattform, Status und geplantem Datum.' },
                { url: '/intern/social-media/new', name: 'Neuer Beitrag', desc: 'Post erstellen mit Plattform-Auswahl, Hashtags und Medien.' },
                { url: '/intern/social-media/[id]', name: 'Beitragsdetail', desc: 'Post bearbeiten und KI-Optimierung anwenden.' },
                { url: '/intern/social-media/content-plan', name: 'Content-Plan', desc: 'Redaktionsplanung mit Kalender-Ansicht und KI-Generierung.' },
                { url: '/intern/social-media/topics', name: 'Themen', desc: 'Themen fuer Content-Kategorisierung verwalten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Datenmodell">
              <FieldTable fields={[
                { name: 'content', type: 'text', required: true, desc: 'Beitragstext' },
                { name: 'platform', type: 'enum', required: true, desc: 'linkedin | facebook | instagram | twitter | xing' },
                { name: 'status', type: 'enum', required: false, desc: 'draft | scheduled | published' },
                { name: 'scheduledAt', type: 'datetime', required: false, desc: 'Geplanter Veroeffentlichungszeitpunkt' },
                { name: 'topicId', type: 'uuid', required: false, desc: 'Zugehoeriges Thema' },
                { name: 'hashtags', type: 'string[]', required: false, desc: 'Hashtags' },
                { name: 'mediaUrl', type: 'string', required: false, desc: 'Bild/Video-URL' },
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen">
              <FeatureList features={[
                { name: 'Post generieren', desc: 'KI erstellt plattformspezifischen Post basierend auf Thema und Zielgruppe.' },
                { name: 'Post verbessern', desc: 'Bestehenden Post per KI optimieren (Tonalitaet, Hashtags, Struktur).' },
                { name: 'Content-Plan generieren', desc: 'KI erstellt automatisch einen Redaktionsplan fuer einen Zeitraum.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/social-media/posts" description="Posts auflisten." queryParams={['page=1', 'limit=20', 'platform=linkedin', 'status=scheduled']} responseExample={{ data: [{ id: 'uuid', content: 'Neuer Post...', platform: 'linkedin', status: 'scheduled' }] }} />
              <EndpointDoc method="POST" path="/api/v1/social-media/posts" description="Post erstellen." requestBody={{ content: 'Spannende Einblicke...', platform: 'linkedin', hashtags: ['IT', 'KMU'], status: 'draft' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="POST" path="/api/v1/social-media/posts/generate" description="Post per KI generieren." requestBody={{ topic: 'IT-Sicherheit', platform: 'linkedin', tone: 'professionell' }} responseExample={{ content: 'KI-generierter Text...', hashtags: ['ITSicherheit', 'KMU'] }} />
              <EndpointDoc method="POST" path="/api/v1/social-media/posts/:id/improve" description="Post per KI optimieren." responseExample={{ content: 'Verbesserter Text...' }} />
              <EndpointDoc method="POST" path="/api/v1/social-media/posts/generate-plan" description="Content-Plan per KI erstellen." requestBody={{ startDate: '2026-03-01', endDate: '2026-03-31', postsPerWeek: 3, topics: ['IT', 'Security'] }} responseExample={{ posts: [{ date: '2026-03-03', topic: 'IT-Sicherheit', platform: 'linkedin' }] }} />
              <EndpointDoc method="GET" path="/api/v1/social-media/topics" description="Themen auflisten." responseExample={{ data: [{ id: 'uuid', name: 'IT-Security' }] }} />
              <EndpointDoc method="POST" path="/api/v1/social-media/topics" description="Thema anlegen." requestBody={{ name: 'Cloud Computing' }} responseExample={{ id: 'uuid', name: 'Cloud Computing' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== DIN AUDIT ===== */}
      <TabsContent value="din" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Shield className="inline h-5 w-5 mr-2" />DIN SPEC 27076 Audits</CardTitle>
            <CardDescription>Digitalisierungs-Check fuer KMU nach DIN SPEC 27076</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/din-audit', name: 'Audit-Uebersicht', desc: 'Liste aller durchgefuehrten Audits mit Firma, Datum und Score.' },
                { url: '/intern/din-audit/new', name: 'Neues Audit', desc: 'Audit anlegen und Firma zuordnen.' },
                { url: '/intern/din-audit/[id]', name: 'Audit-Detail', desc: 'Uebersicht des Audits mit aktuellem Stand und Score.' },
                { url: '/intern/din-audit/[id]/interview', name: 'Interview', desc: 'Strukturierter Fragebogen nach DIN SPEC 27076. Fragen in 6 Themenfeldern.' },
                { url: '/intern/din-audit/[id]/report', name: 'Report', desc: 'Auswertungsbericht mit Scoring, Radar-Chart und Handlungsempfehlungen.' },
                { url: '/intern/din-audit/grants', name: 'Foerdermittel', desc: 'Uebersicht der verfuegbaren Foerderprogramme fuer Digitalisierung.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Audit-Ablauf">
              <FlowDiagram steps={[
                'Audit anlegen und Firma zuordnen',
                'Interview durchfuehren (6 Themenfelder, ~40 Fragen)',
                'Antworten bewerten (0-4 Punkte pro Frage)',
                'Scoring automatisch berechnen',
                'Report mit Handlungsempfehlungen generieren',
                'Passende Foerdermittel vorschlagen',
              ]} />
            </SectionBlock>

            <SectionBlock title="Themenfelder DIN SPEC 27076">
              <FeatureList features={[
                { name: '1. IT-Sicherheit', desc: 'Firewall, Backup, Passwoerter, Zugriffsrechte' },
                { name: '2. Digitale Geschaeftsprozesse', desc: 'ERP, CRM, Dokumentenmanagement' },
                { name: '3. Digitale Markterschliessung', desc: 'Website, Online-Marketing, E-Commerce' },
                { name: '4. Digitale Geschaeftsmodelle', desc: 'Digitale Produkte, Plattformen' },
                { name: '5. Digitale Kompetenz', desc: 'Schulungen, IT-Know-how der Mitarbeiter' },
                { name: '6. IT-Infrastruktur', desc: 'Hardware, Software, Cloud, Netzwerk' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/din/audits" description="Audits auflisten." responseExample={{ data: [{ id: 'uuid', companyName: 'Musterfirma GmbH', score: 72, status: 'completed' }] }} />
              <EndpointDoc method="POST" path="/api/v1/din/audits" description="Neues Audit anlegen." requestBody={{ companyId: 'uuid' }} responseExample={{ id: 'uuid', status: 'created' }} />
              <EndpointDoc method="GET" path="/api/v1/din/audits/:id" description="Audit abrufen." responseExample={{ id: 'uuid', company: { name: 'Musterfirma GmbH' }, score: 72, answers: ['...'] }} />
              <EndpointDoc method="POST" path="/api/v1/din/audits/:id/answers" description="Audit-Antworten speichern." requestBody={{ answers: [{ requirementId: 'uuid', score: 3, notes: 'Gut umgesetzt' }] }} responseExample={{ message: 'Antworten gespeichert' }} />
              <EndpointDoc method="GET" path="/api/v1/din/audits/:id/scoring" description="Scoring berechnen." responseExample={{ totalScore: 72, maxScore: 100, categories: [{ name: 'IT-Sicherheit', score: 80 }] }} />
              <EndpointDoc method="GET" path="/api/v1/din/requirements" description="DIN-Anforderungen auflisten." responseExample={{ data: [{ id: 'uuid', category: 'IT-Sicherheit', question: 'Ist eine Firewall vorhanden?' }] }} />
              <EndpointDoc method="GET" path="/api/v1/din/grants" description="Foerderprogramme auflisten." responseExample={{ data: [{ id: 'uuid', name: 'Digital Jetzt', maxAmount: 50000, region: 'Bundesweit' }] }} />
              <EndpointDoc method="POST" path="/api/v1/din/grants" description="Foerderprogramm anlegen." requestBody={{ name: 'go-digital', maxAmount: 16500, region: 'Bundesweit' }} responseExample={{ id: 'uuid' }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== CYBERSECURITY ===== */}
      <TabsContent value="cyber" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Shield className="inline h-5 w-5 mr-2" />Cybersecurity - Basisabsicherung</CardTitle>
            <CardDescription>IT-Grundschutz Basisabsicherung nach BSI-Prinzipien</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/cybersecurity/basisabsicherung', name: 'Basisabsicherung', desc: 'Selbstbewertung der IT-Sicherheit. Checklisten-basierte Erfassung des Sicherheitsstatus nach BSI-Grundschutz.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Funktionen">
              <FeatureList features={[
                { name: 'Sicherheits-Checkliste', desc: 'Strukturierte Fragen zu IT-Sicherheitsmassnahmen (Firewall, Backup, Passwoerter, etc.).' },
                { name: 'Status-Bewertung', desc: 'Bewertung des aktuellen Sicherheitsniveaus mit Farbcodierung (Rot/Gelb/Gruen).' },
                { name: 'Handlungsempfehlungen', desc: 'Konkrete Massnahmen zur Verbesserung der IT-Sicherheit.' },
              ]} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== BUSINESS INTELLIGENCE ===== */}
      <TabsContent value="bi" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Brain className="inline h-5 w-5 mr-2" />Business Intelligence</CardTitle>
            <CardDescription>Geschaeftsanalysen, KPIs und Datenvisualisierung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/business-intelligence', name: 'BI-Dashboard', desc: 'Zentrale Geschaeftsanalyse mit Umsatzentwicklung, Kundenanalyse, Leistungskennzahlen und Prognosen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Funktionen">
              <FeatureList features={[
                { name: 'Unternehmensprofil', desc: 'Aggregierte Daten ueber Kunden, Umsatz und Geschaeftsentwicklung.' },
                { name: 'Dokumentenanalyse', desc: 'KI-gestuetzte Analyse einzelner Geschaeftsdokumente.' },
                { name: 'Trend-Visualisierung', desc: 'Charts und Diagramme fuer Umsatz- und Lead-Trends.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="GET" path="/api/v1/business-intelligence/profile" description="Unternehmensprofil-Daten abrufen." responseExample={{ revenue: { total: 250000, trend: '+15%' }, customers: { total: 42, new: 8 }, leads: { conversion: '32%' } }} />
              <EndpointDoc method="GET" path="/api/v1/business-intelligence/documents/:id" description="Einzelne Dokumentenanalyse." responseExample={{ analysis: { category: 'Rechnung', totalAmount: 15000, insights: '...' } }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== KI-INTEGRATION ===== */}
      <TabsContent value="ai" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Brain className="inline h-5 w-5 mr-2" />KI-Integration</CardTitle>
            <CardDescription>Kuenstliche Intelligenz - Provider, Prompts und Logging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Unterstuetzte KI-Anbieter">
              <InfoTable rows={[
                ['Gemini', 'Google Gemini 2.5 Flash/Pro - Thinking-Parts-Handling fuer korrekte Antwort-Extraktion'],
                ['OpenAI', 'GPT-4o, GPT-4, GPT-3.5 - Vielseitig einsetzbar'],
                ['OpenRouter', 'Zugang zu verschiedenen Open-Source und kommerziellen Modellen'],
                ['Deepseek', 'Deepseek-Modelle fuer kosteneffiziente KI-Aufgaben'],
                ['Kimi', 'Moonshot AI - Spezialisiert auf lange Kontexte'],
                ['Ollama', 'Lokale Modelle - Datenschutzkonform, keine Cloud-Anbindung'],
              ]} />
            </SectionBlock>

            <SectionBlock title="KI-Funktionen in der Anwendung">
              <FeatureList features={[
                { name: 'Firmen-Research', desc: 'KI recherchiert Firmendaten aus dem Web (Branche, Groesse, Umsatz).' },
                { name: 'Personen-Research', desc: 'KI recherchiert Informationen zu Kontaktpersonen.' },
                { name: 'Website-Crawling', desc: 'Automatisches Auslesen von Firmendaten von Websites.' },
                { name: 'Dokumentenanalyse', desc: 'PDF-Analyse zur Extraktion von Geschaeftsdaten.' },
                { name: 'Lead-Outreach', desc: 'KI generiert personalisierte Kontaktaufnahme-Texte.' },
                { name: 'Blog-Generierung', desc: 'Komplette Blog-Beitraege per KI erstellen.' },
                { name: 'SEO-Generierung', desc: 'Automatische SEO-Metadaten fuer Seiten und Blog-Posts.' },
                { name: 'Social-Media-Posts', desc: 'Plattformspezifische Posts generieren und optimieren.' },
                { name: 'Content-Planung', desc: 'Automatische Redaktionsplaene erstellen.' },
                { name: 'Marketing-Aufgaben', desc: 'KI erstellt Aufgabenlisten fuer Kampagnen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Konfiguration">
              <PageTable pages={[
                { url: '/intern/settings/ai-providers', name: 'KI-Anbieter', desc: 'API-Keys und Modellkonfiguration fuer jeden Provider.' },
                { url: '/intern/settings/ai-prompts', name: 'Prompt-Vorlagen', desc: 'Anpassbare Prompt-Templates fuer alle KI-Funktionen. Jedes Template hat einen Slug zur Code-Referenzierung.' },
                { url: '/intern/settings/ai-logs', name: 'KI-Logs', desc: 'Nutzungsprotokolle mit Modell, Token-Verbrauch, Dauer und Kosten.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte">
              <EndpointDoc method="POST" path="/api/v1/ai/completion" description="KI-Textgenerierung mit konfigurierbarem Modell." requestBody={{ prompt: 'Erstelle eine Zusammenfassung...', model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 }} responseExample={{ text: 'Generierte Zusammenfassung...', usage: { inputTokens: 150, outputTokens: 500 } }} />
              <EndpointDoc method="POST" path="/api/v1/ai/research" description="KI-gestuetzte Recherche durchfuehren." requestBody={{ query: 'Firma XYZ Branche Mitarbeiter', sources: ['web'] }} responseExample={{ results: '...' }} />
              <EndpointDoc method="GET" path="/api/v1/ai/status" description="Status aller konfigurierten KI-Anbieter." responseExample={{ providers: [{ name: 'gemini', status: 'active', model: 'gemini-2.5-flash' }] }} />
              <EndpointDoc method="GET" path="/api/v1/ai-providers" description="KI-Provider auflisten." responseExample={{ data: [{ id: 'uuid', name: 'Gemini', type: 'gemini', model: 'gemini-2.5-flash', isActive: true }] }} />
              <EndpointDoc method="POST" path="/api/v1/ai-providers" description="KI-Provider hinzufuegen." requestBody={{ name: 'OpenAI', type: 'openai', apiKey: 'sk-...', model: 'gpt-4o' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="GET" path="/api/v1/ai-prompt-templates" description="Prompt-Vorlagen auflisten." responseExample={{ data: [{ id: 'uuid', slug: 'company-research', name: 'Firmen-Recherche', template: '...' }] }} />
              <EndpointDoc method="POST" path="/api/v1/ai-prompt-templates" description="Prompt-Vorlage anlegen." requestBody={{ slug: 'custom-prompt', name: 'Eigener Prompt', template: 'Analysiere {{input}}...' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="GET" path="/api/v1/ai-logs" description="KI-Nutzungslogs abrufen." queryParams={['page=1', 'limit=50']} responseExample={{ data: [{ id: 'uuid', model: 'gemini-2.5-flash', tokens: 1500, duration: 2300, cost: 0.003 }] }} />
              <EndpointDoc method="GET" path="/api/v1/ai-logs/stats" description="KI-Nutzungsstatistik." responseExample={{ totalRequests: 1250, totalTokens: 2500000, totalCost: 12.50, byModel: [{ model: 'gemini-2.5-flash', requests: 800 }] }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== EINSTELLUNGEN ===== */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Settings className="inline h-5 w-5 mr-2" />Einstellungen</CardTitle>
            <CardDescription>System-Konfiguration, Benutzerverwaltung und Integrationen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Seiten">
              <PageTable pages={[
                { url: '/intern/settings', name: 'Uebersicht', desc: 'Einstellungs-Dashboard mit Schnellzugriff auf alle Bereiche.' },
                { url: '/intern/settings/tenant', name: 'Organisation', desc: 'Firmenname, Adresse, Logo und Stammdaten des Mandanten bearbeiten.' },
                { url: '/intern/settings/users', name: 'Benutzer', desc: 'Benutzerliste mit Rolle, E-Mail und Status. Benutzer anlegen/bearbeiten/deaktivieren.' },
                { url: '/intern/settings/users/[id]', name: 'Benutzerdetail', desc: 'Benutzerprofil bearbeiten, Rolle zuweisen, Passwort zuruecksetzen.' },
                { url: '/intern/settings/roles', name: 'Rollen', desc: 'Rollenverwaltung mit detaillierten Modul-Berechtigungen.' },
                { url: '/intern/settings/roles/[id]', name: 'Rollendetail', desc: 'Rolle bearbeiten mit Berechtigungs-Matrix (Modul x Aktion).' },
                { url: '/intern/settings/api-keys', name: 'API-Schluessel', desc: 'API-Keys generieren und verwalten fuer externen API-Zugriff.' },
                { url: '/intern/settings/ai-providers', name: 'KI-Anbieter', desc: 'KI-Provider konfigurieren (API-Keys, Modelle, Aktivierung).' },
                { url: '/intern/settings/ai-prompts', name: 'KI-Prompts', desc: 'Prompt-Vorlagen fuer alle KI-Funktionen anpassen.' },
                { url: '/intern/settings/ai-logs', name: 'KI-Logging', desc: 'Protokolle aller KI-Aufrufe mit Token-Verbrauch und Kosten.' },
                { url: '/intern/settings/webhooks', name: 'Webhooks', desc: 'Webhook-Endpunkte konfigurieren fuer Event-Benachrichtigungen.' },
                { url: '/intern/settings/api-docs', name: 'API-Dokumentation', desc: 'Interaktive API-Referenz mit curl-Beispielen.' },
                { url: '/intern/settings/export', name: 'Datenexport', desc: 'Kompletten Datenbankexport als JSON/CSV herunterladen.' },
                { url: '/intern/settings/import', name: 'Datenimport', desc: 'Daten aus JSON/CSV importieren.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Benutzer">
              <EndpointDoc method="GET" path="/api/v1/users" description="Benutzer auflisten." responseExample={{ data: [{ id: 'uuid', email: 'admin@example.com', firstName: 'Admin', role: { name: 'Administrator' } }] }} />
              <EndpointDoc method="POST" path="/api/v1/users" description="Benutzer anlegen." requestBody={{ email: 'neu@example.com', firstName: 'Max', lastName: 'Mustermann', password: 'sicher123', roleId: 'uuid' }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="PUT" path="/api/v1/users/:id" description="Benutzer aktualisieren." requestBody={{ roleId: 'uuid', isActive: true }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="DELETE" path="/api/v1/users/:id" description="Benutzer loeschen." responseExample={{ message: 'Benutzer geloescht' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Rollen">
              <EndpointDoc method="GET" path="/api/v1/roles" description="Rollen auflisten." responseExample={{ data: [{ id: 'uuid', name: 'Administrator', usersCount: 2 }] }} />
              <EndpointDoc method="POST" path="/api/v1/roles" description="Rolle anlegen." requestBody={{ name: 'Vertrieb', permissions: { companies: { canRead: true, canCreate: true }, leads: { canRead: true, canCreate: true, canUpdate: true } } }} responseExample={{ id: 'uuid' }} />
              <EndpointDoc method="PUT" path="/api/v1/roles/:id" description="Rolle mit Berechtigungen aktualisieren." requestBody={{ permissions: { companies: { canDelete: true } } }} responseExample={{ id: 'uuid' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - API-Schluessel">
              <EndpointDoc method="GET" path="/api/v1/api-keys" description="API-Schluessel auflisten." responseExample={{ data: [{ id: 'uuid', name: 'Integration', prefix: 'xkmu_abc...', createdAt: '2026-01-15' }] }} />
              <EndpointDoc method="POST" path="/api/v1/api-keys" description="API-Schluessel generieren." requestBody={{ name: 'CRM-Integration' }} responseExample={{ id: 'uuid', key: 'xkmu_vollstaendiger_schluessel' }} />
              <EndpointDoc method="DELETE" path="/api/v1/api-keys/:id" description="API-Schluessel widerrufen." responseExample={{ message: 'Schluessel widerrufen' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Webhooks">
              <EndpointDoc method="GET" path="/api/v1/webhooks" description="Webhooks auflisten." responseExample={{ data: [{ id: 'uuid', url: 'https://example.com/webhook', events: ['company.created'], active: true }] }} />
              <EndpointDoc method="POST" path="/api/v1/webhooks" description="Webhook anlegen." requestBody={{ url: 'https://example.com/webhook', events: ['company.created', 'invoice.paid'], active: true }} responseExample={{ id: 'uuid' }} />
            </SectionBlock>

            <SectionBlock title="API-Endpunkte - Sonstiges">
              <EndpointDoc method="GET" path="/api/v1/tenant" description="Mandanten-Informationen abrufen." responseExample={{ id: 'uuid', name: 'Meine Firma GmbH', address: { street: 'Hauptstr. 1' } }} />
              <EndpointDoc method="POST" path="/api/v1/email/send" description="E-Mail versenden." requestBody={{ to: 'empfaenger@example.com', subject: 'Betreff', body: '<p>HTML-Inhalt</p>' }} responseExample={{ message: 'E-Mail gesendet' }} />
              <EndpointDoc method="POST" path="/api/v1/export/database" description="Datenbankexport starten." responseExample={{ downloadUrl: '/api/v1/export/download/uuid' }} />
              <EndpointDoc method="POST" path="/api/v1/import/database" description="Datenimport starten." requestBody={{ file: '(JSON/CSV als FormData)' }} responseExample={{ imported: { companies: 42, persons: 85 } }} />
            </SectionBlock>

            <SectionBlock title="Webhook-Events">
              <InfoTable rows={[
                ['company.created', 'Firma angelegt'],
                ['company.updated', 'Firma aktualisiert'],
                ['company.deleted', 'Firma geloescht'],
                ['person.created', 'Person angelegt'],
                ['person.updated', 'Person aktualisiert'],
                ['lead.created', 'Lead angelegt'],
                ['lead.updated', 'Lead aktualisiert'],
                ['document.created', 'Dokument angelegt'],
                ['document.status_changed', 'Dokumentstatus geaendert'],
                ['invoice.paid', 'Rechnung bezahlt'],
                ['blog.published', 'Blog-Beitrag veroeffentlicht'],
                ['cms.page.published', 'CMS-Seite veroeffentlicht'],
              ]} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== ÖFFENTLICHE SEITEN ===== */}
      <TabsContent value="public" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle><Globe className="inline h-5 w-5 mr-2" />Oeffentliche Seiten</CardTitle>
            <CardDescription>Oeffentlich zugaengliche Website-Seiten (ohne Login)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionBlock title="Statische Seiten">
              <PageTable pages={[
                { url: '/', name: 'Startseite', desc: 'CMS-gesteuerte Homepage mit Hero-Section, Features und CTA. Fallback auf Landing-Komponenten.' },
                { url: '/it-consulting', name: 'IT-Consulting', desc: 'Leistungsseite fuer IT-Beratungsdienstleistungen.' },
                { url: '/cyber-security', name: 'Cyber Security', desc: 'Leistungsseite fuer Cybersicherheits-Dienstleistungen.' },
                { url: '/ki-automation', name: 'KI-Automation', desc: 'Leistungsseite fuer KI-Automatisierungsloesungen.' },
                { url: '/kontakt', name: 'Kontakt', desc: 'Kontaktformular mit serverseitiger Validierung und E-Mail-Versand.' },
                { url: '/impressum', name: 'Impressum', desc: 'Rechtliche Pflichtangaben.' },
                { url: '/datenschutz', name: 'Datenschutz', desc: 'Datenschutzerklaerung.' },
                { url: '/agb', name: 'AGB', desc: 'Allgemeine Geschaeftsbedingungen.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Dynamische Seiten">
              <PageTable pages={[
                { url: '/it-news', name: 'IT-News', desc: 'Listing aller veroeffentlichten Blog-Beitraege mit Vorschaubild und Auszug.' },
                { url: '/it-news/[slug]', name: 'Blog-Beitrag', desc: 'Einzelansicht eines Blog-Beitrags mit vollem Inhalt und SEO-Metadaten.' },
                { url: '/[...slug]', name: 'CMS-Seite', desc: 'Catch-all Route fuer CMS-verwaltete Seiten. Slug wird dynamisch aufgeloest.' },
              ]} />
            </SectionBlock>

            <SectionBlock title="Oeffentliche API-Endpunkte">
              <EndpointDoc method="POST" path="/api/v1/contact" description="Kontaktformular absenden (keine Authentifizierung noetig)." requestBody={{ name: 'Max Mustermann', email: 'max@example.com', subject: 'Anfrage', message: 'Ich interessiere mich fuer...' }} responseExample={{ message: 'Nachricht gesendet' }} />
              <EndpointDoc method="GET" path="/api/v1/public/blog/posts" description="Veroeffentlichte Blog-Beitraege (oeffentlich)." queryParams={['page=1', 'limit=10']} responseExample={{ data: [{ title: 'IT-Trends', slug: 'it-trends', excerpt: '...' }] }} />
              <EndpointDoc method="GET" path="/api/v1/public/blog/posts/:slug" description="Blog-Beitrag nach Slug (oeffentlich)." responseExample={{ title: 'IT-Trends', content: '<p>...</p>', publishedAt: '2026-02-20' }} />
              <EndpointDoc method="GET" path="/api/v1/public/pages/:slug" description="CMS-Seite nach Slug (oeffentlich)." responseExample={{ title: 'Ueber uns', blocks: [{ type: 'hero', content: {} }] }} />
              <EndpointDoc method="GET" path="/api/v1/public/navigation" description="Website-Navigation (oeffentlich)." responseExample={{ data: [{ label: 'Startseite', url: '/', children: [] }] }} />
            </SectionBlock>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ============================================================================
// HELPER-KOMPONENTEN
// ============================================================================

interface EndpointDocProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
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

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-500 border-green-500/20',
    PUT: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    PATCH: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
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
              <code key={param} className="text-xs bg-muted px-2 py-1 rounded">{param}</code>
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
              <><Check className="h-3 w-3" /> Kopiert!</>
            ) : (
              <><Copy className="h-3 w-3" /> Kopieren</>
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

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold border-b pb-2">{title}</h3>
      {children}
    </div>
  )
}

function PageTable({ pages }: { pages: { url: string; name: string; desc: string }[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-3 font-medium w-1/4">Seite</th>
            <th className="text-left p-3 font-medium w-1/3">URL</th>
            <th className="text-left p-3 font-medium">Beschreibung</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.url} className="border-t">
              <td className="p-3 font-medium">{page.name}</td>
              <td className="p-3">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{page.url}</code>
              </td>
              <td className="p-3 text-muted-foreground">{page.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FieldTable({ fields }: { fields: { name: string; type: string; required: boolean; desc: string }[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-3 font-medium">Feld</th>
            <th className="text-left p-3 font-medium">Typ</th>
            <th className="text-left p-3 font-medium">Pflicht</th>
            <th className="text-left p-3 font-medium">Beschreibung</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className="border-t">
              <td className="p-3">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{field.name}</code>
              </td>
              <td className="p-3">
                <Badge variant="outline" className="text-xs">{field.type}</Badge>
              </td>
              <td className="p-3">
                {field.required ? (
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Ja</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Nein</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground">{field.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InfoTable({ rows }: { rows: string[][] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx > 0 ? 'border-t' : 'bg-muted/50 font-medium'}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className={`p-3 ${cellIdx === 0 ? 'font-medium w-1/3' : 'text-muted-foreground'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FeatureList({ features }: { features: { name: string; desc: string }[] }) {
  return (
    <div className="space-y-2">
      {features.map((feature) => (
        <div key={feature.name} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
          <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            <span className="font-medium text-sm">{feature.name}</span>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            idx === steps.length - 1 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            {idx + 1}
          </div>
          <div className="text-sm">{step}</div>
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono">
        {code}
      </pre>
    </div>
  )
}

function ModuleCard({ icon, name, desc, pages, apis }: { icon: React.ReactNode; name: string; desc: string; pages: number; apis: number }) {
  return (
    <div className="border rounded-lg p-4 space-y-2 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">{pages} Seiten</Badge>
        {apis > 0 && <Badge variant="outline" className="text-xs">{apis} APIs</Badge>}
      </div>
    </div>
  )
}

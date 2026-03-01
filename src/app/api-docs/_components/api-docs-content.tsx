'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function ApiDocsContent() {
  return (
    <Tabs defaultValue="auth" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-15">
        <TabsTrigger value="auth">Auth</TabsTrigger>
        <TabsTrigger value="companies">Firmen</TabsTrigger>
        <TabsTrigger value="persons">Personen</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="ideas">Ideen</TabsTrigger>
        <TabsTrigger value="documents">Dokumente</TabsTrigger>
        <TabsTrigger value="activities">Aktivitaeten</TabsTrigger>
        <TabsTrigger value="products">Produkte</TabsTrigger>
        <TabsTrigger value="din-audit">DIN Audit</TabsTrigger>
        <TabsTrigger value="ai">KI</TabsTrigger>
        <TabsTrigger value="media">Medien</TabsTrigger>
        <TabsTrigger value="public">Oeffentlich</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="email">E-Mail</TabsTrigger>
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
              queryParams={['page=1', 'limit=20', 'search=Begriff', 'status=customer', 'tags=tag1,tag2']}
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
              description="Firma loeschen"
              responseExample={{
                message: 'Firma geloescht',
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
                    jobTitle: 'Geschaeftsfuehrer',
                    email: 'max@musterfirma.de',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/companies/:id/research"
              description="KI-Recherche-Ergebnisse einer Firma abrufen"
              responseExample={{
                data: {
                  summary: 'Zusammenfassung der Recherche...',
                  employees: '50-100',
                  revenue: '10 Mio EUR',
                  researchedAt: '2026-01-15T10:00:00Z',
                },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/companies/:id/research"
              description="KI-Recherche fuer Firma durchfuehren (inkl. Website-Scraping)"
              responseExample={{
                message: 'Recherche gestartet',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/companies/:id/analyze-document"
              description="PDF-Dokument hochladen und per KI analysieren (extrahiert Finanz-KPIs)"
              requestBody={{
                file: '(PDF-Datei als FormData)',
              }}
              responseExample={{
                data: {
                  revenue: '5.200.000',
                  employees: 45,
                  profit: '320.000',
                  analyzedAt: '2026-01-15T10:00:00Z',
                },
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
              queryParams={['page=1', 'limit=20', 'search=Name', 'companyId=uuid', 'status=active', 'tags=tag1,tag2']}
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
                jobTitle: 'Geschaeftsfuehrer',
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
              description="Person loeschen"
              responseExample={{
                message: 'Person geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/persons/:id/research"
              description="KI-Recherche-Ergebnisse einer Person abrufen"
              responseExample={{
                data: {
                  summary: 'Zusammenfassung der Recherche...',
                  linkedIn: 'https://linkedin.com/in/...',
                  researchedAt: '2026-01-15T10:00:00Z',
                },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/persons/:id/research"
              description="KI-Recherche fuer Person durchfuehren"
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
              queryParams={['page=1', 'limit=20', 'status=new', 'source=website', 'assignedTo=uuid', 'search=Begriff']}
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
              description="Lead loeschen"
              responseExample={{
                message: 'Lead geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/leads/:id/research"
              description="KI-Recherche-Ergebnisse eines Leads abrufen"
              responseExample={{
                data: {
                  summary: 'Zusammenfassung der Recherche...',
                  companyInfo: '...',
                  researchedAt: '2026-01-15T10:00:00Z',
                },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/leads/:id/research"
              description="KI-Recherche fuer Lead durchfuehren (inkl. Website-Scraping und Firmendaten)"
              responseExample={{
                message: 'Recherche gestartet',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/leads/:id/outreach"
              description="KI-generierte Outreach-E-Mail fuer Lead erstellen"
              responseExample={{
                subject: 'Betreff der E-Mail',
                body: 'Generierter E-Mail-Text...',
                tone: 'professionell',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Ideas */}
      <TabsContent value="ideas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ideen</CardTitle>
            <CardDescription>Ideen-Management mit KI-Verarbeitung und Konvertierung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/ideas"
              description="Alle Ideen abrufen (optional gruppiert nach Status)"
              queryParams={['page=1', 'limit=20', 'grouped=true', 'status=new', 'type=lead']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    title: 'Neue Geschaeftsidee',
                    type: 'lead',
                    status: 'new',
                    source: 'manual',
                    createdAt: '2026-01-15T10:00:00Z',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 12 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ideas"
              description="Neue Idee erstellen (startet automatisch KI-Verarbeitung)"
              requestBody={{
                title: 'Potentieller Neukunde',
                rawInput: 'Firma XY aus Berlin sucht IT-Beratung. Ansprechpartner: Max Muster, max@xy.de',
                source: 'manual',
              }}
              responseExample={{
                id: 'uuid',
                title: 'Potentieller Neukunde',
                status: 'new',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ideas/:id"
              description="Einzelne Idee abrufen"
              responseExample={{
                id: 'uuid',
                title: 'Potentieller Neukunde',
                rawInput: 'Firma XY aus Berlin...',
                status: 'processed',
                aiResult: {
                  companyName: 'Firma XY',
                  contactName: 'Max Muster',
                  email: 'max@xy.de',
                },
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/ideas/:id"
              description="Idee aktualisieren"
              requestBody={{
                status: 'approved',
                title: 'Aktualisierter Titel',
              }}
              responseExample={{
                id: 'uuid',
                status: 'approved',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/ideas/:id"
              description="Idee loeschen"
              responseExample={{
                message: 'Idee geloescht',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ideas/:id/convert"
              description="Idee in Lead/Firma konvertieren (KI-basierte Entity-Extraktion)"
              responseExample={{
                message: 'Idee konvertiert',
                created: {
                  companyId: 'uuid',
                  leadId: 'uuid',
                },
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documents */}
      <TabsContent value="documents" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Rechnungen, Angebote und Dokumentenpositionen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/documents"
              description="Alle Dokumente abrufen"
              queryParams={['page=1', 'limit=20', 'type=invoice', 'status=draft', 'companyId=uuid', 'dateFrom=2026-01-01', 'dateTo=2026-12-31', 'search=Begriff']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    type: 'invoice',
                    number: 'RE-2026-0001',
                    status: 'draft',
                    totalNet: '1500.00',
                    totalGross: '1785.00',
                    customerName: 'Musterfirma GmbH',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 10 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/documents"
              description="Neues Dokument erstellen (Rechnung oder Angebot)"
              requestBody={{
                type: 'invoice',
                number: 'RE-2026-0002',
                companyId: 'uuid',
                contactPersonId: 'uuid',
                issueDate: '2026-01-15',
                dueDate: '2026-02-14',
                paymentTerms: 'Zahlbar innerhalb von 30 Tagen',
                customerName: 'Musterfirma GmbH',
                customerStreet: 'Hauptstr.',
                customerHouseNumber: '1',
                customerPostalCode: '10115',
                customerCity: 'Berlin',
                customerCountry: 'DE',
              }}
              responseExample={{
                id: 'uuid',
                type: 'invoice',
                number: 'RE-2026-0002',
                status: 'draft',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/documents/:id"
              description="Einzelnes Dokument mit Positionen abrufen"
              responseExample={{
                id: 'uuid',
                type: 'invoice',
                number: 'RE-2026-0001',
                status: 'draft',
                items: [
                  { id: 'uuid', description: 'Beratung', quantity: '10', unitPrice: '150.00', totalNet: '1500.00' },
                ],
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/documents/:id"
              description="Dokument aktualisieren"
              requestBody={{
                notes: 'Aktualisierte Notiz',
                dueDate: '2026-03-01',
              }}
              responseExample={{
                id: 'uuid',
                notes: 'Aktualisierte Notiz',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/documents/:id"
              description="Dokument loeschen (nur Entwuerfe)"
              responseExample={{
                message: 'Dokument geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/documents/next-number"
              description="Naechste Dokumentnummer generieren"
              queryParams={['type=invoice']}
              responseExample={{
                number: 'RE-2026-0003',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/documents/:id/items"
              description="Alle Positionen eines Dokuments abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    description: 'IT-Beratung',
                    quantity: '10',
                    unitPrice: '150.00',
                    vatRate: '19.00',
                    totalNet: '1500.00',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/documents/:id/items"
              description="Position zu Dokument hinzufuegen"
              requestBody={{
                productId: 'uuid',
                description: 'IT-Beratung',
                quantity: '10',
                unitPrice: '150.00',
                vatRate: '19.00',
              }}
              responseExample={{
                id: 'uuid',
                description: 'IT-Beratung',
                totalNet: '1500.00',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/documents/:id/items/:itemId"
              description="Dokumentposition aktualisieren"
              requestBody={{
                quantity: '20',
              }}
              responseExample={{
                id: 'uuid',
                quantity: '20',
                totalNet: '3000.00',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/documents/:id/items/:itemId"
              description="Dokumentposition loeschen"
              responseExample={{
                message: 'Position geloescht',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/documents/:id/status"
              description="Dokumentstatus aendern (draft, sent, paid, cancelled, etc.)"
              requestBody={{
                status: 'sent',
              }}
              responseExample={{
                id: 'uuid',
                status: 'sent',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/documents/:id/convert"
              description="Angebot in Rechnung umwandeln"
              responseExample={{
                id: 'new-uuid',
                type: 'invoice',
                number: 'RE-2026-0003',
                status: 'draft',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Activities */}
      <TabsContent value="activities" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitaeten</CardTitle>
            <CardDescription>Notizen, E-Mails, Anrufe und Termine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/activities"
              description="Aktivitaeten abrufen"
              queryParams={['leadId=uuid', 'companyId=uuid', 'personId=uuid', 'type=note', 'page=1', 'limit=20']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    type: 'note',
                    subject: 'Telefonat',
                    content: 'Kunde ist interessiert an...',
                    createdAt: '2026-01-15T10:30:00Z',
                    user: { id: 'uuid', firstName: 'Max', lastName: 'Mustermann' },
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/activities"
              description="Neue Aktivitaet erstellen"
              requestBody={{
                leadId: 'uuid',
                companyId: 'uuid',
                type: 'note',
                subject: 'Erstgespraech',
                content: 'Kunde zeigt Interesse an IT-Sicherheit',
              }}
              responseExample={{
                id: 'uuid',
                type: 'note',
                subject: 'Erstgespraech',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/activities/:id"
              description="Einzelne Aktivitaet abrufen"
              responseExample={{
                id: 'uuid',
                type: 'note',
                subject: 'Telefonat',
                content: 'Kunde ist interessiert an...',
                createdAt: '2026-01-15T10:30:00Z',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/activities/:id"
              description="Aktivitaet loeschen"
              responseExample={{
                deleted: true,
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
            <CardDescription>Produktkatalog und Kategorien-Management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/products"
              description="Alle Produkte abrufen"
              queryParams={['page=1', 'limit=20', 'type=product', 'status=active', 'categoryId=uuid', 'tags=tag1,tag2', 'search=Begriff']}
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
                unit: 'Stueck',
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
              path="/api/v1/products/:id"
              description="Einzelnes Produkt abrufen"
              responseExample={{
                id: 'uuid',
                name: 'Premium Widget',
                type: 'product',
                description: 'Produktbeschreibung',
                sku: 'PROD-001',
                priceNet: '99.99',
                vatRate: '19.00',
                status: 'active',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/products/:id"
              description="Produkt aktualisieren"
              requestBody={{
                priceNet: '119.99',
                status: 'inactive',
              }}
              responseExample={{
                id: 'uuid',
                priceNet: '119.99',
                status: 'inactive',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/products/:id"
              description="Produkt loeschen"
              responseExample={{
                message: 'Produkt geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/product-categories"
              description="Alle Produktkategorien abrufen (optional als Baumstruktur)"
              queryParams={['tree=true']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Kategorie 1',
                    slug: 'kategorie-1',
                    children: [],
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

            <EndpointDoc
              method="GET"
              path="/api/v1/product-categories/:id"
              description="Einzelne Kategorie abrufen"
              responseExample={{
                id: 'uuid',
                name: 'Kategorie 1',
                slug: 'kategorie-1',
                description: 'Beschreibung',
                parentId: null,
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/product-categories/:id"
              description="Kategorie aktualisieren"
              requestBody={{
                name: 'Aktualisierte Kategorie',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Aktualisierte Kategorie',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/product-categories/:id"
              description="Kategorie loeschen (nur wenn keine Unterkategorien oder Produkte zugeordnet)"
              responseExample={{
                message: 'Kategorie geloescht',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* DIN SPEC 27076 */}
      <TabsContent value="din-audit" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>DIN SPEC 27076</CardTitle>
            <CardDescription>IT-Sicherheitsaudits und Foerdermittel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/din/audits"
              description="Alle DIN-Audits abrufen"
              queryParams={['page=1', 'limit=20', 'status=in_progress']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    companyName: 'Musterfirma GmbH',
                    status: 'in_progress',
                    totalScore: 42,
                    maxScore: 100,
                    createdAt: '2026-01-15T10:00:00Z',
                  },
                ],
                pagination: { page: 1, limit: 20, total: 5 },
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/din/audits"
              description="Neues DIN-Audit erstellen"
              requestBody={{
                companyId: 'uuid',
                companyName: 'Musterfirma GmbH',
                auditorName: 'Max Mustermann',
              }}
              responseExample={{
                id: 'uuid',
                companyName: 'Musterfirma GmbH',
                status: 'draft',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/audits/:id"
              description="Einzelnes DIN-Audit abrufen"
              responseExample={{
                id: 'uuid',
                companyName: 'Musterfirma GmbH',
                status: 'in_progress',
                answers: [],
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/din/audits/:id"
              description="DIN-Audit aktualisieren"
              requestBody={{
                status: 'completed',
              }}
              responseExample={{
                id: 'uuid',
                status: 'completed',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/din/audits/:id"
              description="DIN-Audit loeschen"
              responseExample={{
                message: 'Audit geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/audits/:id/answers"
              description="Antworten eines Audits abrufen"
              responseExample={{
                data: [
                  { requirementId: 'uuid', value: 2, comment: 'Teilweise umgesetzt' },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/din/audits/:id/answers"
              description="Antworten fuer ein Audit speichern (einzeln oder als Bulk)"
              requestBody={{
                answers: [
                  { requirementId: 'uuid', value: 2, comment: 'Teilweise umgesetzt' },
                ],
              }}
              responseExample={{
                message: 'Antworten gespeichert',
                totalScore: 42,
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/audits/:id/scoring"
              description="Scoring/Ergebnis eines Audits abrufen"
              responseExample={{
                totalScore: 42,
                maxScore: 100,
                percentage: 42,
                categoryScores: [
                  { category: 'Organisation & Sensibilisierung', score: 8, maxScore: 20 },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/requirements"
              description="Alle DIN-Anforderungen (Fragenkatalog) abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    category: 'Organisation & Sensibilisierung',
                    question: 'Gibt es einen IT-Sicherheitsbeauftragten?',
                    maxPoints: 4,
                  },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/grants"
              description="Verfuegbare Foerdermittel abrufen"
              queryParams={['region=bundesweit', 'employeeCount=50']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'go-digital',
                    description: 'Foerderprogramm des BMWi',
                    maxAmount: 16500,
                    region: 'bundesweit',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/din/grants"
              description="Neues Foerdermittel anlegen"
              requestBody={{
                name: 'Neues Foerderprogramm',
                description: 'Beschreibung des Programms',
                maxAmount: 20000,
                region: 'bundesweit',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Neues Foerderprogramm',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/din/grants/:id"
              description="Einzelnes Foerdermittel abrufen"
              responseExample={{
                id: 'uuid',
                name: 'go-digital',
                description: 'Foerderprogramm des BMWi',
                maxAmount: 16500,
                region: 'bundesweit',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/din/grants/:id"
              description="Foerdermittel aktualisieren"
              requestBody={{
                maxAmount: 18000,
              }}
              responseExample={{
                id: 'uuid',
                maxAmount: 18000,
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/din/grants/:id"
              description="Foerdermittel loeschen"
              responseExample={{
                message: 'Foerdermittel geloescht',
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
            <CardDescription>AI Provider, Prompt-Templates, Logs und KI-Operationen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/ai/status"
              description="Verfuegbare KI-Provider und deren Status pruefen"
              responseExample={{
                available: true,
                providers: [
                  { type: 'openrouter', isActive: true, model: 'openai/gpt-4o-mini' },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai/completion"
              description="Text-Vervollstaendigung via KI"
              requestBody={{
                prompt: 'Schreibe einen Text ueber...',
                systemPrompt: 'Du bist ein hilfreicher Assistent',
              }}
              responseExample={{
                response: 'Generierte Antwort...',
                model: 'gpt-4o-mini',
                tokensUsed: 150,
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai/research"
              description="Firma per KI anhand des Namens recherchieren"
              requestBody={{
                companyName: 'Musterfirma GmbH',
              }}
              responseExample={{
                data: {
                  summary: 'Zusammenfassung...',
                  website: 'https://musterfirma.de',
                  employees: '50-100',
                  industry: 'IT-Dienstleistungen',
                },
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-providers"
              description="Alle KI-Provider abrufen (API-Keys maskiert)"
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
              method="GET"
              path="/api/v1/ai-providers/:id"
              description="Einzelnen KI-Provider abrufen (API-Key maskiert)"
              responseExample={{
                id: 'uuid',
                providerType: 'openrouter',
                name: 'OpenRouter GPT-4',
                model: 'openai/gpt-4o-mini',
                apiKey: 'sk-...****',
                isActive: true,
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/ai-providers/:id"
              description="KI-Provider aktualisieren"
              requestBody={{
                model: 'openai/gpt-4o',
                maxTokens: 4000,
              }}
              responseExample={{
                id: 'uuid',
                model: 'openai/gpt-4o',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/ai-providers/:id"
              description="KI-Provider loeschen"
              responseExample={{
                message: 'Provider geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-logs"
              description="KI-Logs abrufen"
              queryParams={['page=1', 'limit=20', 'providerType=openrouter', 'status=success', 'feature=research', 'search=Begriff', 'dateFrom=2026-01-01', 'dateTo=2026-12-31']}
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    model: 'gpt-4o-mini',
                    feature: 'research',
                    status: 'success',
                    totalTokens: 350,
                    createdAt: '2026-01-01T12:00:00Z',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-logs/:id"
              description="Einzelnes KI-Log mit vollstaendigem Prompt und Response abrufen"
              responseExample={{
                id: 'uuid',
                model: 'gpt-4o-mini',
                feature: 'research',
                status: 'success',
                prompt: 'Vollstaendiger Prompt...',
                response: 'Vollstaendige Antwort...',
                totalTokens: 350,
                durationMs: 1200,
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-logs/stats"
              description="Aggregierte KI-Nutzungsstatistiken abrufen"
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
                    isActive: true,
                    isDefault: true,
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai-prompt-templates"
              description="Neues Prompt-Template erstellen"
              requestBody={{
                slug: 'custom_template',
                name: 'Benutzerdefiniertes Template',
                description: 'Beschreibung',
                systemPrompt: 'Du bist ein Experte fuer...',
                userPrompt: 'Analysiere {{input}}',
                outputFormat: 'Antworte mit JSON...',
              }}
              responseExample={{
                id: 'uuid',
                slug: 'custom_template',
                name: 'Benutzerdefiniertes Template',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/ai-prompt-templates/:id"
              description="Einzelnes Prompt-Template abrufen"
              responseExample={{
                id: 'uuid',
                slug: 'lead_research',
                name: 'Lead-Recherche',
                systemPrompt: 'Du bist...',
                userPrompt: 'Recherchiere...',
                outputFormat: 'Antworte NUR mit JSON...',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/ai-prompt-templates/:id"
              description="Prompt-Template aktualisieren"
              requestBody={{
                systemPrompt: 'Aktualisierter System-Prompt...',
              }}
              responseExample={{
                id: 'uuid',
                systemPrompt: 'Aktualisierter System-Prompt...',
              }}
            />

            <EndpointDoc
              method="PATCH"
              path="/api/v1/ai-prompt-templates/:id"
              description="Prompt-Template auf Standard zuruecksetzen"
              responseExample={{
                id: 'uuid',
                message: 'Template auf Standard zurueckgesetzt',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/ai-prompt-templates/:id"
              description="Prompt-Template loeschen (nur benutzerdefinierte)"
              responseExample={{
                message: 'Template geloescht',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/ai-prompt-templates/seed"
              description="Standard-Templates initialisieren"
              responseExample={{
                message: 'Standard-Templates erstellt',
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
            <CardDescription>HTTP-Callbacks fuer Automatisierungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/webhooks"
              description="Alle Webhooks abrufen"
              queryParams={['page=1', 'limit=20']}
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
              method="GET"
              path="/api/v1/webhooks/:id"
              description="Einzelnen Webhook abrufen"
              responseExample={{
                id: 'uuid',
                name: 'Lead Created',
                url: 'https://example.com/webhook',
                events: ['lead.created', 'lead.status_changed'],
                isActive: true,
                createdAt: '2026-01-15T10:00:00Z',
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
              description="Webhook loeschen"
              responseExample={{
                message: 'Webhook geloescht',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Email */}
      <TabsContent value="email" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>E-Mail & Kontakt</CardTitle>
            <CardDescription>E-Mail-Versand und oeffentliches Kontaktformular</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/email/send"
              description="E-Mail-Konfigurationsstatus pruefen"
              responseExample={{
                configured: true,
                provider: 'smtp',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/email/send"
              description="E-Mail senden (erfordert konfiguriertes E-Mail-System)"
              requestBody={{
                to: 'empfaenger@example.com',
                subject: 'Betreff der E-Mail',
                body: 'Klartext-Inhalt der E-Mail',
                html: '<p>Optionaler HTML-Inhalt</p>',
                leadId: 'uuid (optional)',
                companyId: 'uuid (optional)',
                personId: 'uuid (optional)',
              }}
              responseExample={{
                message: 'E-Mail gesendet',
                messageId: 'msg-uuid',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/contact"
              description="Kontaktformular absenden (oeffentlicher Endpunkt, erstellt automatisch einen Lead)"
              requestBody={{
                name: 'Max Mustermann',
                email: 'max@example.com',
                company: 'Musterfirma GmbH',
                phone: '+49 30 12345678',
                message: 'Ich interessiere mich fuer Ihre Dienstleistungen...',
              }}
              responseExample={{
                message: 'Nachricht erfolgreich gesendet',
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
            <CardDescription>Benutzer, Rollen, API-Keys, Tenant und Export/Import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/users"
              description="Alle Benutzer abrufen (Admin)"
              queryParams={['page=1', 'limit=20', 'role=admin', 'status=active', 'search=Name']}
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
              method="POST"
              path="/api/v1/users"
              description="Neuen Benutzer erstellen (nur Admin)"
              requestBody={{
                email: 'neuer@example.com',
                password: 'sicheres-passwort',
                firstName: 'Erika',
                lastName: 'Musterfrau',
                role: 'member',
              }}
              responseExample={{
                id: 'uuid',
                email: 'neuer@example.com',
                firstName: 'Erika',
                lastName: 'Musterfrau',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/users/:id"
              description="Einzelnen Benutzer abrufen"
              responseExample={{
                id: 'uuid',
                email: 'user@example.com',
                firstName: 'Max',
                lastName: 'Mustermann',
                role: 'admin',
                status: 'active',
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/users/:id"
              description="Benutzer aktualisieren (eigenes Profil oder Admin)"
              requestBody={{
                firstName: 'Maximilian',
                role: 'admin',
              }}
              responseExample={{
                id: 'uuid',
                firstName: 'Maximilian',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/users/:id"
              description="Benutzer loeschen (nicht den eigenen Account)"
              responseExample={{
                message: 'Benutzer geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/roles"
              description="Alle Rollen mit Benutzeranzahl abrufen"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'sales',
                    displayName: 'Vertrieb',
                    isSystem: false,
                    userCount: 3,
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
              path="/api/v1/roles/:id"
              description="Einzelne Rolle mit Berechtigungen abrufen"
              responseExample={{
                id: 'uuid',
                name: 'sales',
                displayName: 'Vertrieb',
                permissions: {
                  companies: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
                },
              }}
            />

            <EndpointDoc
              method="PUT"
              path="/api/v1/roles/:id"
              description="Rolle aktualisieren"
              requestBody={{
                displayName: 'Vertriebsteam',
                permissions: {
                  leads: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
                },
              }}
              responseExample={{
                id: 'uuid',
                displayName: 'Vertriebsteam',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/roles/:id"
              description="Rolle loeschen (keine System-Rollen)"
              responseExample={{
                message: 'Rolle geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/api-keys"
              description="Alle API-Keys abrufen (ohne Key-Hash)"
              responseExample={{
                data: [
                  {
                    id: 'uuid',
                    name: 'Production Key',
                    keyPrefix: 'xk_live_',
                    permissions: ['read', 'write'],
                    lastUsedAt: '2026-01-01T12:00:00Z',
                  },
                ],
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/api-keys"
              description="Neuen API-Key erstellen (Key wird nur einmal angezeigt)"
              requestBody={{
                name: 'Mein API Key',
                permissions: ['read', 'write'],
                expiresAt: '2026-12-31T23:59:59Z',
              }}
              responseExample={{
                id: 'uuid',
                name: 'Mein API Key',
                key: 'xk_live_...',
              }}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/api-keys/:id"
              description="API-Key loeschen"
              responseExample={{
                message: 'API-Key geloescht',
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
              description="Dashboard-Statistiken und Trends"
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
              method="GET"
              path="/api/v1/export/database"
              description="Kompletten Datenbank-Export als SQL-Datei herunterladen (nur Admin)"
              responseExample={{
                '(SQL-Datei-Download)': true,
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/import/database"
              description="SQL-Datei importieren (nur Admin, Merge- oder Replace-Modus)"
              requestBody={{
                file: '(SQL-Datei als FormData)',
                mode: 'merge',
              }}
              responseExample={{
                message: 'Import erfolgreich',
                imported: { companies: 10, persons: 25, leads: 15 },
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
      {/* Media */}
      <TabsContent value="media" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Medien-API</CardTitle>
            <CardDescription>Dateien hochladen, verwalten und ausliefern. Erlaubte Typen: JPEG, PNG, WebP, GIF (max. 5 MB). In Produktion werden Dateien in einem persistierten Docker-Volume gespeichert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="POST"
              path="/api/v1/media/upload"
              description="Datei hochladen (multipart/form-data, Feld: file)"
              requestBody={{
                file: '(Binaerdatei als FormData)',
              }}
              responseExample={{
                id: 'uuid',
                filename: 'a1b2c3d4.png',
                originalName: 'logo.png',
                mimeType: 'image/png',
                sizeBytes: 45200,
                path: '/api/v1/media/serve/tenant-id/a1b2c3d4.png',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/media"
              description="Alle Mediendateien des Tenants auflisten"
              responseExample={[
                { id: 'uuid', filename: 'a1b2c3d4.png', originalName: 'logo.png', path: '/api/v1/media/serve/...' },
              ]}
            />

            <EndpointDoc
              method="DELETE"
              path="/api/v1/media/[id]"
              description="Mediendatei loeschen (DB-Eintrag + Datei auf Disk)"
              responseExample={{
                message: 'Datei geloescht',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/media/serve/[tenantId]/[filename]"
              description="Hochgeladene Datei ausliefern (oeffentlich, kein Auth). Cache: 1 Jahr, immutable."
              responseExample={{
                '(Bilddatei als Binary-Response)': true,
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Public */}
      <TabsContent value="public" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Oeffentliche API</CardTitle>
            <CardDescription>Endpoints ohne Authentifizierung. Fuer die oeffentliche Webseite (Landing, Blog, Navigation, Branding).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EndpointDoc
              method="GET"
              path="/api/v1/public/branding"
              description="Branding-Informationen (Logo, Alt-Text). Fallback auf Standard-Logo wenn keins konfiguriert."
              responseExample={{
                logoUrl: '/api/v1/media/serve/tenant-id/logo.png',
                logoAlt: 'Meine Firma',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/public/navigation?location=header"
              description="Website-Navigation fuer Header oder Footer. Parameter location: header|footer"
              responseExample={[
                { label: 'Startseite', href: '/', sortOrder: 0, openInNewTab: false },
                { label: 'IT-News', href: '/it-news', sortOrder: 4, openInNewTab: false },
              ]}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/public/blog/posts"
              description="Veroeffentlichte Blog-Beitraege auflisten"
              responseExample={[
                { slug: 'mein-beitrag', title: 'Mein Beitrag', excerpt: '...', publishedAt: '2026-01-15' },
              ]}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/public/blog/posts/[slug]"
              description="Einzelner Blog-Beitrag nach Slug"
              responseExample={{
                slug: 'mein-beitrag',
                title: 'Mein Beitrag',
                content: '<p>Inhalt...</p>',
                publishedAt: '2026-01-15',
              }}
            />

            <EndpointDoc
              method="GET"
              path="/api/v1/public/pages/[...slug]"
              description="CMS-Seite nach Slug abrufen"
              responseExample={{
                title: 'Ueber uns',
                slug: 'ueber-uns',
                content: '<p>Inhalt...</p>',
              }}
            />

            <EndpointDoc
              method="POST"
              path="/api/v1/contact"
              description="Kontaktformular absenden"
              requestBody={{
                name: 'Max Mustermann',
                email: 'max@example.com',
                message: 'Ich habe eine Frage...',
              }}
              responseExample={{
                message: 'Nachricht erfolgreich gesendet',
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

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

  const methodColors = {
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

import type { ApiService } from '../types'

export const companiesService: ApiService = {
  name: 'Firmen',
  slug: 'companies',
  description:
    'Firmenverwaltung mit CRUD-Operationen, KI-gestuetzter Recherche, Website-Crawling, Dokumentenanalyse, Gespraechsvorbereitung und Aktionsgenerierung. Alle Endpunkte erfordern Session-Authentifizierung und entsprechende Modul-Berechtigungen.',
  basePath: '/api/v1/companies',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/companies',
      summary: 'Firmen auflisten',
      description:
        'Gibt eine paginierte Liste aller Firmen des Mandanten zurueck. Unterstuetzt Filterung nach Status, Freitextsuche und Tags.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status (z.B. prospect, active, inactive)' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche ueber Firmennamen' },
        { name: 'tags', in: 'query', required: false, type: 'string', description: 'Komma-getrennte Tags zum Filtern', example: 'premium,partner' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Schneider & Partner GmbH',
            status: 'active',
            industry: 'IT-Beratung',
            website: 'https://schneider-partner.de',
            city: 'Muenchen',
          },
        ],
        meta: { page: 1, limit: 25, total: 42 },
      },
      curl: `curl "https://example.com/api/v1/companies?page=1&limit=25&status=active&search=Schneider" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies',
      summary: 'Firma erstellen',
      description:
        'Erstellt eine neue Firma. Fuehrt automatisch eine Dublettenprüfung auf Name und Website durch. Bei Duplikat wird 409 zurueckgegeben. Loest einen company.created Webhook aus.',
      requestBody: {
        name: 'Becker Maschinenbau AG',
        website: 'https://becker-maschinenbau.de',
        industry: 'Maschinenbau',
        status: 'prospect',
        street: 'Industriestrasse',
        houseNumber: '42',
        postalCode: '70173',
        city: 'Stuttgart',
        country: 'DE',
        phone: '+49 711 12345678',
        email: 'info@becker-maschinenbau.de',
      },
      response: {
        success: true,
        data: {
          id: 'c2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          name: 'Becker Maschinenbau AG',
          status: 'prospect',
          industry: 'Maschinenbau',
          website: 'https://becker-maschinenbau.de',
          city: 'Stuttgart',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Becker Maschinenbau AG","website":"https://becker-maschinenbau.de","industry":"Maschinenbau","status":"prospect","street":"Industriestrasse","houseNumber":"42","postalCode":"70173","city":"Stuttgart","country":"DE","phone":"+49 711 12345678","email":"info@becker-maschinenbau.de"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/companies/:id',
      summary: 'Firma abrufen',
      description: 'Gibt die vollstaendigen Daten einer einzelnen Firma zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Schneider & Partner GmbH',
          status: 'active',
          industry: 'IT-Beratung',
          website: 'https://schneider-partner.de',
          street: 'Leopoldstrasse',
          houseNumber: '10',
          postalCode: '80802',
          city: 'Muenchen',
          country: 'DE',
          phone: '+49 89 98765432',
          email: 'kontakt@schneider-partner.de',
          notes: 'Langjähriger Partner seit 2019',
        },
      },
      curl: `curl https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/companies/:id',
      summary: 'Firma aktualisieren',
      description:
        'Aktualisiert die Daten einer Firma. Nach dem Update wird im Hintergrund eine Anreicherung fehlender Activity-Summaries gestartet.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      requestBody: {
        industry: 'Software-Entwicklung',
        employeeCount: 85,
        status: 'active',
      },
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Schneider & Partner GmbH',
          status: 'active',
          industry: 'Software-Entwicklung',
          employeeCount: 85,
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"industry":"Software-Entwicklung","employeeCount":85,"status":"active"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/companies/:id',
      summary: 'Firma loeschen',
      description: 'Loescht eine Firma permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: { message: 'Company deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/companies/:id/persons',
      summary: 'Kontaktpersonen einer Firma abrufen',
      description: 'Gibt alle Personen zurueck, die mit dieser Firma verknuepft sind.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            firstName: 'Thomas',
            lastName: 'Schneider',
            jobTitle: 'Geschaeftsfuehrer',
            email: 'thomas@schneider-partner.de',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/persons \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/research',
      summary: 'KI-Recherche starten',
      description:
        'Startet eine KI-gestuetzte Recherche zur Firma. Nutzt vorhandene Firecrawl-Daten als Kontext falls verfuegbar. Speichert Ergebnisse in der DB, uebernimmt Aenderungen NICHT automatisch. Vorgeschlagene Aenderungen muessen ueber den Apply-Endpunkt bestaetigt werden. Nur fehlende Felder werden vorgeschlagen (kein Ueberschreiben).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          researchId: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          research: {
            description: 'Fuehrender IT-Dienstleister im Raum Muenchen',
            industry: 'IT-Beratung',
            employeeCount: '50-100',
            foundedYear: '2005',
            products: ['Cloud Migration', 'SAP Beratung'],
            services: ['IT-Consulting', 'Managed Services'],
          },
          proposedChanges: {
            industry: 'IT-Beratung',
            employeeCount: 75,
            notes: '=== FIRMENPROFIL: Schneider & Partner GmbH ===\n...',
          },
          updatedFields: ['industry', 'employeeCount'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/companies/:id/research',
      summary: 'Recherche-Ergebnisse abrufen',
      description: 'Gibt alle bisherigen KI-Recherchen fuer eine Firma zurueck, inklusive Backward-Compat-Daten aus customFields.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          company: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', name: 'Schneider & Partner GmbH' },
          researches: [],
          hasResearch: true,
          research: { lastResearchedAt: '2025-12-01T10:30:00Z', description: 'IT-Dienstleister' },
        },
      },
      curl: `curl https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/research/:researchId/apply',
      summary: 'Recherche-Ergebnisse uebernehmen',
      description:
        'Uebernimmt die vorgeschlagenen Aenderungen einer Recherche auf die Firma. Kann nur einmal ausgefuehrt werden (Status wechselt zu applied).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
        { name: 'researchId', in: 'path', required: true, type: 'string', description: 'UUID der Recherche' },
      ],
      response: {
        success: true,
        data: {
          research: { id: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', status: 'applied' },
          appliedFields: ['industry', 'employeeCount', 'notes'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research/r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/apply \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/research/:researchId/reject',
      summary: 'Recherche-Ergebnisse verwerfen',
      description:
        'Verwirft die vorgeschlagenen Aenderungen einer Recherche. Nur moeglich wenn der Status completed ist.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
        { name: 'researchId', in: 'path', required: true, type: 'string', description: 'UUID der Recherche' },
      ],
      response: {
        success: true,
        data: {
          research: { id: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', status: 'rejected' },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research/r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/reject \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/crawl',
      summary: 'Website-Crawl starten',
      description:
        'Startet einen vollstaendigen Website-Crawl ueber Firecrawl. Erfordert einen konfigurierten Firecrawl API-Key in den KI-Provider-Einstellungen. Die KI waehlt automatisch relevante Unterseiten aus (Smart Filter). Ergebnis wird als Crawl-Record gespeichert.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          crawl: {
            id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            status: 'completed',
            pageCount: 12,
          },
          pageCount: 12,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/crawl \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/companies/:id/crawl',
      summary: 'Crawl-Ergebnisse abrufen',
      description: 'Gibt alle bisherigen Website-Crawls fuer eine Firma zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          crawls: [],
          hasCrawls: false,
        },
      },
      curl: `curl https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/crawl \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/actions/generate',
      summary: 'KI-Aktion generieren',
      description:
        'Generiert eine KI-gestuetzte Aktion fuer die Firma anhand eines Action-Slugs (z.B. Email-Entwurf, Zusammenfassung). Die verfuegbaren Aktionen sind per Tenant konfigurierbar.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      requestBody: {
        actionSlug: 'email_introduction',
      },
      response: {
        success: true,
        data: {
          subject: 'Vorstellung unserer Dienstleistungen',
          body: 'Sehr geehrte Damen und Herren...',
          tone: 'professional',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/actions/generate \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"actionSlug":"email_introduction"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/companies/:id/prep',
      summary: 'KI-Gespraechsvorbereitung',
      description:
        'Erstellt eine KI-gestuetzte Gespraechsvorbereitung fuer die Firma. Beruecksichtigt letzte Aktivitaeten, offene Leads und Opportunities. Nutzt konfigurierbare KI-Prompt-Templates.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      response: {
        success: true,
        data: {
          company: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', name: 'Schneider & Partner GmbH', industry: 'IT-Beratung' },
          preparation: 'Gespraechsleitfaden:\n1. Aktuelle Projekte ansprechen...\n2. Cross-Selling Potenzial...',
          recentActivities: 3,
          openLeads: 2,
          openOpportunities: 1,
        },
      },
      curl: `curl https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/prep \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/companies/:id/analyze-document',
      summary: 'Dokument analysieren (PDF)',
      description:
        'Analysiert ein hochgeladenes PDF-Dokument per KI und extrahiert KPIs und eine Zusammenfassung. Die Ergebnisse werden in den customFields der Firma gespeichert und eine Activity wird angelegt. Nur PDF-Dateien werden unterstuetzt (multipart/form-data).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Firma' },
      ],
      requestBody: {
        file: '(PDF-Datei als multipart/form-data)',
      },
      response: {
        success: true,
        data: {
          documentType: 'Jahresabschluss',
          summary: 'Der Jahresabschluss zeigt ein Umsatzwachstum von 12%...',
          financialKPIs: {
            revenue: '4.500.000 EUR',
            ebit: '320.000 EUR',
            employees: 45,
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/companies/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/analyze-document \\
  -b cookies.txt \\
  -F "file=@jahresabschluss-2024.pdf"`,
    },
  ],
}

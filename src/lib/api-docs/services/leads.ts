import type { ApiService } from '../types'

export const leadsService: ApiService = {
  name: 'Leads',
  slug: 'leads',
  description:
    'Lead-Management mit CRUD-Operationen, KI-gestuetzter Recherche, automatischer Lead-Bewertung, Outreach-Generierung und Inbound-Lead-Erfassung. Leads koennen mit Firmen und Personen verknuepft werden.',
  basePath: '/api/v1/leads',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/leads',
      summary: 'Leads auflisten',
      description:
        'Gibt eine paginierte Liste aller Leads zurueck. Unterstuetzt Filterung nach Status (auch komma-getrennt fuer mehrere), Quelle, Zustaendigem und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status. Mehrere Werte komma-getrennt moeglich (z.B. new,qualified)', example: 'new,qualified' },
        { name: 'source', in: 'query', required: false, type: 'string', description: 'Filtert nach Lead-Quelle (z.B. website, referral, inbound)' },
        { name: 'assignedTo', in: 'query', required: false, type: 'string', description: 'Filtert nach zustaendigem Benutzer (UUID)' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'Cloud Migration Projekt',
            status: 'qualified',
            source: 'website',
            score: 75,
            companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        ],
        meta: { page: 1, limit: 25, total: 56 },
      },
      curl: `curl "https://example.com/api/v1/leads?page=1&limit=25&status=new,qualified&search=Cloud" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/leads',
      summary: 'Lead erstellen',
      description: 'Erstellt einen neuen Lead. Kann mit Firma und/oder Person verknuepft werden.',
      requestBody: {
        title: 'SAP S/4HANA Migration',
        source: 'referral',
        sourceDetail: 'Empfehlung von Partner Weber Consulting',
        status: 'new',
        score: 50,
        companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        personId: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        notes: 'Interesse an SAP Migration, Budget vorhanden',
        tags: ['sap', 'enterprise'],
      },
      response: {
        success: true,
        data: {
          id: 'l2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          title: 'SAP S/4HANA Migration',
          status: 'new',
          source: 'referral',
          score: 50,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/leads \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"SAP S/4HANA Migration","source":"referral","sourceDetail":"Empfehlung von Partner Weber Consulting","status":"new","score":50,"companyId":"c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","notes":"Interesse an SAP Migration, Budget vorhanden","tags":["sap","enterprise"]}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/leads/:id',
      summary: 'Lead abrufen',
      description: 'Gibt die vollstaendigen Daten eines einzelnen Leads zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      response: {
        success: true,
        data: {
          id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Cloud Migration Projekt',
          status: 'qualified',
          source: 'website',
          score: 75,
          companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          personId: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          aiResearchStatus: 'completed',
          aiResearchResult: { score: 82, summary: 'Hochqualifizierter Lead...' },
        },
      },
      curl: `curl https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/leads/:id',
      summary: 'Lead aktualisieren',
      description: 'Aktualisiert die Daten eines Leads.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      requestBody: {
        status: 'qualified',
        score: 85,
        notes: 'Budget bestaetigt, Entscheider identifiziert',
      },
      response: {
        success: true,
        data: {
          id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'qualified',
          score: 85,
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"qualified","score":85,"notes":"Budget bestaetigt, Entscheider identifiziert"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/leads/:id',
      summary: 'Lead loeschen',
      description: 'Loescht einen Lead permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      response: {
        success: true,
        data: { message: 'Lead deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/leads/:id/research',
      summary: 'KI-Recherche starten',
      description:
        'Startet eine KI-gestuetzte Recherche fuer einen Lead. Nutzt verknuepfte Firmen- und Personendaten, vorhandene KI-Recherchen, Website-Inhalte und sourceDetail als Kontext. Der Lead-Status wird waehrend der Recherche auf processing gesetzt. Bei Erfolg wird der Score aktualisiert und ein research.completed Webhook gefeuert. Benoetigt mindestens eine verknuepfte Firma, Person oder E-Mail.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      response: {
        success: true,
        data: {
          lead: {
            id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            aiResearchStatus: 'completed',
          },
          research: {
            score: 82,
            summary: 'Schneider & Partner ist ein wachsender IT-Dienstleister...',
            opportunities: ['Cloud Migration', 'Managed Services'],
            risks: ['Budgetfreigabe steht noch aus'],
            nextSteps: ['Termin mit Geschaeftsfuehrung vereinbaren'],
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/leads/:id/research',
      summary: 'Recherche-Status abrufen',
      description: 'Gibt den aktuellen Status und das Ergebnis der KI-Recherche fuer einen Lead zurueck. Status: pending, processing, completed, failed.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      response: {
        success: true,
        data: {
          status: 'completed',
          result: {
            score: 82,
            summary: 'Hochqualifizierter Lead mit konkretem Bedarf',
          },
        },
      },
      curl: `curl https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/leads/:id/outreach',
      summary: 'KI-Outreach generieren',
      description:
        'Generiert einen personalisierten Outreach-Entwurf (E-Mail) fuer einen Lead per KI. Erfordert eine abgeschlossene KI-Recherche (aiResearchResult muss vorhanden sein). Erstellt automatisch eine Activity vom Typ ai_outreach.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Leads' },
      ],
      response: {
        success: true,
        data: {
          subject: 'Cloud-Strategie fuer Schneider & Partner',
          body: 'Sehr geehrter Herr Schneider,\n\nmit grossem Interesse habe ich die aktuelle Entwicklung...',
          tone: 'professional',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/leads/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/outreach \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/leads/inbound',
      summary: 'Inbound-Lead erfassen',
      description:
        'Erstellt einen Lead aus einem eingehenden Kontakt (Formular, E-Mail, Webhook). Benoetigt mindestens E-Mail, Name oder Firma. Der Lead wird automatisch mit Status new, Score 0 und Tag inbound erstellt.',
      requestBody: {
        email: 'interessent@firma-xyz.de',
        firstName: 'Klaus',
        lastName: 'Fischer',
        company: 'Fischer Elektronik GmbH',
        phone: '+49 221 9876543',
        message: 'Wir suchen einen Partner fuer unsere Digitalisierung.',
        source: 'website',
      },
      response: {
        success: true,
        data: {
          id: 'l3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8',
          source: 'website',
          sourceDetail: 'Inbound API',
          contactEmail: 'interessent@firma-xyz.de',
          contactFirstName: 'Klaus',
          contactLastName: 'Fischer',
          contactCompany: 'Fischer Elektronik GmbH',
          status: 'new',
          score: 0,
          tags: ['inbound'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/leads/inbound \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"email":"interessent@firma-xyz.de","firstName":"Klaus","lastName":"Fischer","company":"Fischer Elektronik GmbH","phone":"+49 221 9876543","message":"Wir suchen einen Partner fuer unsere Digitalisierung.","source":"website"}'`,
    },
  ],
}

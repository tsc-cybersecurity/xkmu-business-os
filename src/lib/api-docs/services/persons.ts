import type { ApiService } from '../types'

export const personsService: ApiService = {
  name: 'Personen',
  slug: 'persons',
  description:
    'Kontaktpersonen-Verwaltung mit CRUD-Operationen, KI-gestuetzter Recherche und Geburtstags-Erinnerungen. Personen koennen mit Firmen verknuepft werden.',
  basePath: '/api/v1/persons',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/persons',
      summary: 'Personen auflisten',
      description:
        'Gibt eine paginierte Liste aller Kontaktpersonen zurueck. Unterstuetzt Filterung nach Firma, Status, Freitextsuche und Tags.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'companyId', in: 'query', required: false, type: 'string', description: 'Filtert nach zugehoeriger Firma (UUID)' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche ueber Name und E-Mail' },
        { name: 'tags', in: 'query', required: false, type: 'string', description: 'Komma-getrennte Tags zum Filtern', example: 'entscheider,technik' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            firstName: 'Thomas',
            lastName: 'Schneider',
            email: 'thomas@schneider-partner.de',
            jobTitle: 'Geschaeftsfuehrer',
            companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        ],
        meta: { page: 1, limit: 25, total: 128 },
      },
      curl: `curl "https://example.com/api/v1/persons?page=1&limit=25&search=Schneider" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/persons',
      summary: 'Person erstellen',
      description: 'Erstellt eine neue Kontaktperson. Kann optional mit einer Firma verknuepft werden.',
      requestBody: {
        firstName: 'Anna',
        lastName: 'Mueller',
        email: 'anna.mueller@techfirma.de',
        jobTitle: 'CTO',
        phone: '+49 30 55667788',
        companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        city: 'Berlin',
        birthday: '1985-06-15',
        tags: ['entscheider', 'technik'],
      },
      response: {
        success: true,
        data: {
          id: 'p2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          firstName: 'Anna',
          lastName: 'Mueller',
          email: 'anna.mueller@techfirma.de',
          jobTitle: 'CTO',
          companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/persons \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"firstName":"Anna","lastName":"Mueller","email":"anna.mueller@techfirma.de","jobTitle":"CTO","phone":"+49 30 55667788","companyId":"c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","city":"Berlin","birthday":"1985-06-15","tags":["entscheider","technik"]}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/persons/:id',
      summary: 'Person abrufen',
      description: 'Gibt die vollstaendigen Daten einer einzelnen Person zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Person' },
      ],
      response: {
        success: true,
        data: {
          id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          firstName: 'Thomas',
          lastName: 'Schneider',
          email: 'thomas@schneider-partner.de',
          jobTitle: 'Geschaeftsfuehrer',
          phone: '+49 89 98765432',
          city: 'Muenchen',
          companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          birthday: '1978-03-22',
          notes: 'Bevorzugt Kommunikation per E-Mail',
        },
      },
      curl: `curl https://example.com/api/v1/persons/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/persons/:id',
      summary: 'Person aktualisieren',
      description: 'Aktualisiert die Daten einer Kontaktperson.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Person' },
      ],
      requestBody: {
        jobTitle: 'CEO',
        phone: '+49 89 11223344',
        notes: 'Befoerdert zum CEO im Januar 2026',
      },
      response: {
        success: true,
        data: {
          id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          firstName: 'Thomas',
          lastName: 'Schneider',
          jobTitle: 'CEO',
          phone: '+49 89 11223344',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/persons/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"jobTitle":"CEO","phone":"+49 89 11223344","notes":"Befoerdert zum CEO im Januar 2026"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/persons/:id',
      summary: 'Person loeschen',
      description: 'Loescht eine Kontaktperson permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Person' },
      ],
      response: {
        success: true,
        data: { message: 'Person deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/persons/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/persons/:id/research',
      summary: 'KI-Recherche starten',
      description:
        'Startet eine KI-gestuetzte Recherche zu einer Person. Nutzt Name, E-Mail, Firma, Jobtitel und Stadt als Kontext. Ergebnisse werden in den customFields der Person gespeichert.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Person' },
      ],
      response: {
        success: true,
        data: {
          person: { id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', firstName: 'Thomas', lastName: 'Schneider' },
          research: {
            researchedAt: '2025-12-01T10:30:00Z',
            linkedinProfile: 'https://linkedin.com/in/thomas-schneider',
            background: 'Erfahrener IT-Manager mit 15 Jahren Berufserfahrung',
            interests: ['Digitalisierung', 'KI', 'Nachhaltigkeit'],
          },
          hasResearch: true,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/persons/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/persons/:id/research',
      summary: 'Recherche-Ergebnisse abrufen',
      description: 'Gibt die gespeicherten KI-Recherche-Daten einer Person aus customFields zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Person' },
      ],
      response: {
        success: true,
        data: {
          person: { id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', firstName: 'Thomas', lastName: 'Schneider' },
          hasResearch: true,
          research: {
            lastResearchedAt: '2025-12-01T10:30:00Z',
            background: 'Erfahrener IT-Manager',
          },
        },
      },
      curl: `curl https://example.com/api/v1/persons/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/persons/birthdays',
      summary: 'Anstehende Geburtstage',
      description:
        'Gibt Personen zurueck, deren Geburtstag innerhalb der naechsten N Tage liegt. Standard: 7 Tage. Beruecksichtigt auch Geburtstage, die ins naechste Jahr fallen.',
      params: [
        { name: 'days', in: 'query', required: false, type: 'number', description: 'Anzahl Tage voraus (Standard: 7)', example: '14' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            firstName: 'Thomas',
            lastName: 'Schneider',
            email: 'thomas@schneider-partner.de',
            birthday: '1978-03-22',
            daysUntil: 3,
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/persons/birthdays?days=14" \\
  -b cookies.txt`,
    },
  ],
}

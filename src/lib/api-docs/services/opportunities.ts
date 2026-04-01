import type { ApiService } from '../types'

export const opportunitiesService: ApiService = {
  name: 'Opportunities',
  slug: 'opportunities',
  description:
    'Opportunity-Management fuer die Neukundengewinnung. Unterstuetzt automatisierte Google-Maps-Suche via SerpAPI, Adress-Reparatur und Konvertierung zu Firmen/Leads. Opportunities repraesentieren potenzielle Geschaeftskontakte aus lokaler Suche.',
  basePath: '/api/v1/opportunities',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/opportunities',
      summary: 'Opportunities auflisten',
      description:
        'Gibt eine paginierte Liste aller Opportunities zurueck. Unterstuetzt Filterung nach Status, Stadt und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status' },
        { name: 'city', in: 'query', required: false, type: 'string', description: 'Filtert nach Stadt', example: 'Berlin' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Autohaus Schmidt Berlin',
            status: 'new',
            city: 'Berlin',
            phone: '+49 30 12345678',
            website: 'https://autohaus-schmidt.de',
            rating: 4.5,
            reviewCount: 128,
          },
        ],
        meta: { page: 1, limit: 25, total: 150 },
      },
      curl: `curl "https://example.com/api/v1/opportunities?page=1&limit=25&city=Berlin" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/opportunities/:id',
      summary: 'Opportunity abrufen',
      description: 'Gibt die vollstaendigen Daten einer einzelnen Opportunity zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Opportunity' },
      ],
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Autohaus Schmidt Berlin',
          status: 'new',
          street: 'Kurfuerstendamm',
          houseNumber: '45',
          postalCode: '10719',
          city: 'Berlin',
          phone: '+49 30 12345678',
          website: 'https://autohaus-schmidt.de',
          rating: 4.5,
          reviewCount: 128,
          searchQuery: 'Autohaus',
          searchLocation: 'Berlin',
        },
      },
      curl: `curl https://example.com/api/v1/opportunities/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/opportunities/:id',
      summary: 'Opportunity aktualisieren',
      description: 'Aktualisiert die Daten einer Opportunity.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Opportunity' },
      ],
      requestBody: {
        status: 'contacted',
        notes: 'Erstgespraech am 15.01.2026 um 10:00 Uhr vereinbart',
      },
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Autohaus Schmidt Berlin',
          status: 'contacted',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/opportunities/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"contacted","notes":"Erstgespraech am 15.01.2026 um 10:00 Uhr vereinbart"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/opportunities/:id',
      summary: 'Opportunity loeschen',
      description: 'Loescht eine Opportunity permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Opportunity' },
      ],
      response: {
        success: true,
        data: { message: 'Opportunity deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/opportunities/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/opportunities/:id/convert',
      summary: 'Opportunity konvertieren',
      description:
        'Konvertiert eine Opportunity in eine Firma und/oder einen Lead. Erstellt die entsprechenden Datensaetze automatisch.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Opportunity' },
      ],
      response: {
        success: true,
        data: {
          companyId: 'c3d4e5f6-a7b8-c9d0-e1f2-a3b4c5d6e7f8',
          leadId: 'l3d4e5f6-a7b8-c9d0-e1f2-a3b4c5d6e7f8',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/opportunities/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/convert \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/opportunities/search',
      summary: 'Google-Maps-Suche starten',
      description:
        'Sucht via SerpAPI (Google Maps) nach lokalen Geschaeften anhand von Branchen und Standorten. Ergebnisse werden automatisch als Opportunities gespeichert, Duplikate uebersprungen. Nach dem Speichern werden Adressen repariert. Erfordert einen konfigurierten SerpAPI-Key.',
      requestBody: {
        queries: 'Zahnarzt, Steuerberater',
        locations: 'Hamburg, Muenchen',
        radius: 25,
        maxPerLocation: 20,
      },
      response: {
        success: true,
        data: {
          saved: 35,
          enriched: 30,
          duplicates: 5,
          errors: [],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/opportunities/search \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"queries":"Zahnarzt, Steuerberater","locations":"Hamburg, Muenchen","radius":25,"maxPerLocation":20}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/opportunities/debug',
      summary: 'Debug-Informationen',
      description:
        'Gibt Diagnose-Informationen zurueck: ob die opportunities-Tabelle existiert, SerpAPI konfiguriert ist, und fuehrt einen Test-Suchaufruf durch.',
      response: {
        success: true,
        data: {
          tableExists: true,
          serpApiProvider: { id: 'sp-uuid', name: 'SerpAPI', hasKey: true },
          serpApiEnvKey: false,
          rowCount: 150,
          serpApiTest: { success: true, resultCount: 1, firstResult: 'Restaurant Berlin Mitte' },
        },
      },
      curl: `curl https://example.com/api/v1/opportunities/debug \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/opportunities/debug',
      summary: 'Adressen reparieren',
      description: 'Repariert alle fehlerhaften Adressen in den Opportunities (z.B. fehlende PLZ, Stadtnamen-Korrektur).',
      response: {
        success: true,
        data: { repaired: 12 },
      },
      curl: `curl -X POST https://example.com/api/v1/opportunities/debug \\
  -b cookies.txt`,
    },
  ],
}

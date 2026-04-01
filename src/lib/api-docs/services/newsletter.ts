import type { ApiService } from '../types'

export const newsletterService: ApiService = {
  name: 'Newsletter',
  slug: 'newsletter',
  description:
    'Newsletter-Kampagnen erstellen und versenden sowie Abonnenten verwalten. Unterstuetzt Einzel- und Bulk-Import von Abonnenten.',
  basePath: '/api/v1/newsletter',
  auth: 'session',
  endpoints: [
    // --- Campaigns ---
    {
      method: 'GET',
      path: '/api/v1/newsletter/campaigns',
      summary: 'Newsletter-Kampagnen auflisten',
      description: 'Gibt alle Newsletter-Kampagnen des Mandanten zurueck.',
      response: { success: true, data: [] },
      curl: `curl -X GET https://example.com/api/v1/newsletter/campaigns \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/newsletter/campaigns',
      summary: 'Newsletter-Kampagne erstellen',
      requestBody: {
        name: 'Juni-Newsletter',
        subject: 'Neuigkeiten im Juni',
        htmlContent: '<h1>Hallo!</h1><p>Ihre monatlichen Neuigkeiten...</p>',
      },
      response: { success: true, data: { id: 'uuid', name: 'Juni-Newsletter' } },
      curl: `curl -X POST https://example.com/api/v1/newsletter/campaigns \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Juni-Newsletter","subject":"Neuigkeiten im Juni","htmlContent":"<h1>Hallo!</h1>"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/newsletter/campaigns/:id',
      summary: 'Newsletter-Kampagne abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: { id: 'uuid', name: 'Juni-Newsletter', status: 'draft' } },
      curl: `curl -X GET https://example.com/api/v1/newsletter/campaigns/CAMPAIGN_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/newsletter/campaigns/:id',
      summary: 'Newsletter-Kampagne aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      requestBody: { name: 'Juni-Newsletter (final)', subject: 'Ihre Juni-Neuigkeiten' },
      response: { success: true, data: { id: 'uuid', name: 'Juni-Newsletter (final)' } },
      curl: `curl -X PUT https://example.com/api/v1/newsletter/campaigns/CAMPAIGN_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Juni-Newsletter (final)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/newsletter/campaigns/:id',
      summary: 'Newsletter-Kampagne loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/newsletter/campaigns/CAMPAIGN_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/newsletter/campaigns/:id/send',
      summary: 'Newsletter-Kampagne versenden',
      description: 'Versendet eine Newsletter-Kampagne an alle aktiven Abonnenten.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: { sent: true, recipientCount: 150 } },
      curl: `curl -X POST https://example.com/api/v1/newsletter/campaigns/CAMPAIGN_ID/send \\
  -b cookies.txt`,
    },
    // --- Subscribers ---
    {
      method: 'GET',
      path: '/api/v1/newsletter/subscribers',
      summary: 'Newsletter-Abonnenten auflisten',
      description: 'Paginierte Liste aller Abonnenten. Filterbar nach Status und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status (active, unsubscribed)', example: 'active' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Suche nach E-Mail oder Name', example: 'mustermann' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/newsletter/subscribers?status=active&page=1" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/newsletter/subscribers',
      summary: 'Abonnent(en) erstellen oder importieren',
      description:
        'Erstellt einen einzelnen Abonnenten oder importiert mehrere per Bulk-Import. Fuer Bulk-Import ein Array unter "subscribers" senden.',
      requestBody: {
        email: 'max@example.com',
        firstName: 'Max',
        lastName: 'Mustermann',
      },
      response: { success: true, data: { id: 'uuid', email: 'max@example.com' } },
      curl: `curl -X POST https://example.com/api/v1/newsletter/subscribers \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"email":"max@example.com","firstName":"Max","lastName":"Mustermann"}'`,
    },
  ],
}

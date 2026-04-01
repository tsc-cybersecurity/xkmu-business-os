import type { ApiService } from '../types'

export const webhooksService: ApiService = {
  name: 'Webhooks',
  slug: 'webhooks',
  description:
    'Webhooks erstellen, verwalten und loeschen. Webhooks werden bei bestimmten Ereignissen im System ausgeloest und senden Daten an eine konfigurierte URL.',
  basePath: '/api/v1/webhooks',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/webhooks',
      summary: 'Webhooks auflisten',
      description: 'Paginierte Liste aller Webhooks des Mandanten.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/webhooks?page=1&limit=20" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/webhooks',
      summary: 'Webhook erstellen',
      description: 'Erstellt einen neuen Webhook mit URL, Ereignistyp und optionalem Secret.',
      requestBody: {
        name: 'Neuer Kontakt',
        url: 'https://n8n.example.com/webhook/abc123',
        events: ['contact.created', 'contact.updated'],
        secret: 'webhook-secret-123',
        isActive: true,
      },
      response: {
        success: true,
        data: { id: 'uuid', name: 'Neuer Kontakt', url: 'https://n8n.example.com/webhook/abc123', isActive: true },
      },
      curl: `curl -X POST https://example.com/api/v1/webhooks \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Neuer Kontakt","url":"https://n8n.example.com/webhook/abc123","events":["contact.created"],"isActive":true}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/webhooks/:id',
      summary: 'Webhook abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Webhooks' },
      ],
      response: {
        success: true,
        data: { id: 'uuid', name: 'Neuer Kontakt', url: 'https://n8n.example.com/webhook/abc123', events: ['contact.created'], isActive: true },
      },
      curl: `curl -X GET https://example.com/api/v1/webhooks/WEBHOOK_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/webhooks/:id',
      summary: 'Webhook aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Webhooks' },
      ],
      requestBody: {
        name: 'Kontakt-Webhook v2',
        url: 'https://n8n.example.com/webhook/new',
        isActive: false,
      },
      response: {
        success: true,
        data: { id: 'uuid', name: 'Kontakt-Webhook v2', isActive: false },
      },
      curl: `curl -X PUT https://example.com/api/v1/webhooks/WEBHOOK_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Kontakt-Webhook v2","isActive":false}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/webhooks/:id',
      summary: 'Webhook loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Webhooks' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/webhooks/WEBHOOK_ID \\
  -b cookies.txt`,
    },
  ],
}

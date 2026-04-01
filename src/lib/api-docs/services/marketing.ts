import type { ApiService } from '../types'

export const marketingService: ApiService = {
  name: 'Marketing',
  slug: 'marketing',
  description:
    'Marketing-Kampagnen, Aufgaben und Vorlagen verwalten. Unterstuetzt KI-Content-Generierung und einen Marketing-Agenten zur URL-Analyse.',
  basePath: '/api/v1/marketing',
  auth: 'session',
  endpoints: [
    // --- Campaigns ---
    {
      method: 'GET',
      path: '/api/v1/marketing/campaigns',
      summary: 'Marketing-Kampagnen auflisten',
      description: 'Paginierte Liste aller Kampagnen. Filterbar nach Status, Typ und Freitext.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status', example: 'active' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Filtern nach Kampagnen-Typ', example: 'email' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Volltextsuche', example: 'Sommer' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/marketing/campaigns?status=active" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/marketing/campaigns',
      summary: 'Marketing-Kampagne erstellen',
      requestBody: {
        name: 'Sommer-Aktion 2025',
        type: 'email',
        description: 'E-Mail-Kampagne fuer Sommerschlussverkauf',
        startDate: '2025-06-01',
        endDate: '2025-08-31',
      },
      response: { success: true, data: { id: 'uuid', name: 'Sommer-Aktion 2025' } },
      curl: `curl -X POST https://example.com/api/v1/marketing/campaigns \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sommer-Aktion 2025","type":"email"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/marketing/campaigns/:id',
      summary: 'Marketing-Kampagne abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: { id: 'uuid', name: 'Sommer-Aktion 2025' } },
      curl: `curl -X GET https://example.com/api/v1/marketing/campaigns/CAMPAIGN_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/marketing/campaigns/:id',
      summary: 'Marketing-Kampagne aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      requestBody: { name: 'Sommer-Aktion 2025 (erweitert)', status: 'active' },
      response: { success: true, data: { id: 'uuid', name: 'Sommer-Aktion 2025 (erweitert)' } },
      curl: `curl -X PUT https://example.com/api/v1/marketing/campaigns/CAMPAIGN_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sommer-Aktion 2025 (erweitert)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/marketing/campaigns/:id',
      summary: 'Marketing-Kampagne loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/marketing/campaigns/CAMPAIGN_ID \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/marketing/campaigns/:id/tasks',
      summary: 'Aufgaben einer Kampagne auflisten',
      description: 'Gibt alle Aufgaben zurueck, die einer bestimmten Kampagne zugeordnet sind.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kampagne' },
      ],
      response: { success: true, data: [] },
      curl: `curl -X GET https://example.com/api/v1/marketing/campaigns/CAMPAIGN_ID/tasks \\
  -b cookies.txt`,
    },
    // --- Tasks ---
    {
      method: 'GET',
      path: '/api/v1/marketing/tasks',
      summary: 'Marketing-Aufgaben auflisten',
      description: 'Paginierte Liste aller Marketing-Aufgaben. Filterbar nach Kampagne, Status und Typ.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'campaignId', in: 'query', required: false, type: 'string', description: 'Filtern nach Kampagnen-ID' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status', example: 'open' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Filtern nach Aufgabentyp', example: 'email' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/marketing/tasks?status=open" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/marketing/tasks',
      summary: 'Marketing-Aufgabe erstellen',
      requestBody: {
        campaignId: 'campaign-uuid',
        title: 'Newsletter-Entwurf',
        type: 'email',
        description: 'E-Mail-Text fuer Sommer-Aktion verfassen',
      },
      response: { success: true, data: { id: 'uuid', title: 'Newsletter-Entwurf' } },
      curl: `curl -X POST https://example.com/api/v1/marketing/tasks \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"campaignId":"campaign-uuid","title":"Newsletter-Entwurf","type":"email"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/marketing/tasks/:id',
      summary: 'Marketing-Aufgabe abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Aufgabe' },
      ],
      response: { success: true, data: { id: 'uuid', title: 'Newsletter-Entwurf' } },
      curl: `curl -X GET https://example.com/api/v1/marketing/tasks/TASK_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/marketing/tasks/:id',
      summary: 'Marketing-Aufgabe aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Aufgabe' },
      ],
      requestBody: { status: 'done', title: 'Newsletter fertig' },
      response: { success: true, data: { id: 'uuid', status: 'done' } },
      curl: `curl -X PUT https://example.com/api/v1/marketing/tasks/TASK_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"status":"done"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/marketing/tasks/:id',
      summary: 'Marketing-Aufgabe loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Aufgabe' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/marketing/tasks/TASK_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/marketing/tasks/generate',
      summary: 'Marketing-Content per KI generieren',
      description:
        'Generiert Marketing-Inhalte (E-Mail, Social Post, etc.) per KI. Unterstuetzt verschiedene Tonalitaeten und Sprachen.',
      requestBody: {
        type: 'email',
        tone: 'professional',
        language: 'de',
        context: 'Sommerschlussverkauf mit 30% Rabatt',
        recipientName: 'Max Mustermann',
        recipientCompany: 'Mustermann GmbH',
      },
      response: { success: true, data: { subject: '...', body: '...' } },
      curl: `curl -X POST https://example.com/api/v1/marketing/tasks/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"type":"email","tone":"professional","language":"de","context":"Sommer-Rabatt"}'`,
    },
    // --- Templates ---
    {
      method: 'GET',
      path: '/api/v1/marketing/templates',
      summary: 'Marketing-Vorlagen auflisten',
      description: 'Paginierte Liste aller Marketing-Vorlagen. Optional nach Typ filtern.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Filtern nach Vorlagentyp', example: 'email' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/marketing/templates?type=email" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/marketing/templates',
      summary: 'Marketing-Vorlage erstellen',
      requestBody: {
        name: 'Kaltakquise E-Mail',
        type: 'email',
        subject: 'Hallo {{name}}',
        body: 'Sehr geehrte/r {{name}}...',
      },
      response: { success: true, data: { id: 'uuid', name: 'Kaltakquise E-Mail' } },
      curl: `curl -X POST https://example.com/api/v1/marketing/templates \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Kaltakquise E-Mail","type":"email","subject":"Hallo"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/marketing/templates/:id',
      summary: 'Marketing-Vorlage abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      response: { success: true, data: { id: 'uuid', name: 'Kaltakquise E-Mail' } },
      curl: `curl -X GET https://example.com/api/v1/marketing/templates/TEMPLATE_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/marketing/templates/:id',
      summary: 'Marketing-Vorlage aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      requestBody: { name: 'Kaltakquise E-Mail v2', body: 'Neuer Text...' },
      response: { success: true, data: { id: 'uuid', name: 'Kaltakquise E-Mail v2' } },
      curl: `curl -X PUT https://example.com/api/v1/marketing/templates/TEMPLATE_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Kaltakquise E-Mail v2"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/marketing/templates/:id',
      summary: 'Marketing-Vorlage loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/marketing/templates/TEMPLATE_ID \\
  -b cookies.txt`,
    },
    // --- Agent ---
    {
      method: 'POST',
      path: '/api/v1/marketing/agent/analyze',
      summary: 'URL per Marketing-Agent analysieren',
      description:
        'Analysiert eine URL und generiert Social-Media-Inhalte fuer ausgewaehlte Plattformen. Scraped den Inhalt und erstellt Beitraege in verschiedenen Tonalitaeten.',
      requestBody: {
        url: 'https://blog.example.com/neuer-artikel',
        language: 'de',
        platforms: ['linkedin', 'twitter'],
        tone: 'professional',
        additionalContext: 'Fokus auf B2B-Aspekte',
      },
      response: {
        success: true,
        data: {
          linkedin: { content: '...', hashtags: [] },
          twitter: { content: '...', hashtags: [] },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/marketing/agent/analyze \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://blog.example.com/artikel","language":"de","platforms":["linkedin"],"tone":"professional"}'`,
    },
  ],
}

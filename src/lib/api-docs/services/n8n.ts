import type { ApiService } from '../types'

export const n8nService: ApiService = {
  name: 'n8n Workflows',
  slug: 'n8n',
  description:
    'n8n-Verbindung verwalten und Workflows erstellen, auflisten, aktivieren, ausfuehren und per KI generieren.',
  basePath: '/api/v1/n8n',
  auth: 'session',
  endpoints: [
    // --- Connection ---
    {
      method: 'GET',
      path: '/api/v1/n8n/connection',
      summary: 'n8n-Verbindung anzeigen',
      description: 'Gibt die aktuelle n8n-Verbindungskonfiguration zurueck. API-Key wird maskiert.',
      response: {
        success: true,
        data: { id: 'uuid', name: 'n8n Cloud', apiUrl: 'https://n8n.example.com', apiKey: '****abcd' },
      },
      curl: `curl -X GET https://example.com/api/v1/n8n/connection \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/connection',
      summary: 'n8n-Verbindung erstellen oder aktualisieren',
      description: 'Erstellt oder aktualisiert die n8n-Verbindung. Erfordert apiUrl und apiKey.',
      requestBody: {
        name: 'n8n Cloud',
        apiUrl: 'https://n8n.example.com/api/v1',
        apiKey: 'n8n-api-key-here',
      },
      response: {
        success: true,
        data: { id: 'uuid', name: 'n8n Cloud', apiUrl: 'https://n8n.example.com/api/v1', apiKey: '****here' },
      },
      curl: `curl -X POST https://example.com/api/v1/n8n/connection \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"n8n Cloud","apiUrl":"https://n8n.example.com/api/v1","apiKey":"n8n-api-key"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/connection/test',
      summary: 'n8n-Verbindung testen',
      description: 'Testet die gespeicherte n8n-Verbindung und gibt den Verbindungsstatus zurueck.',
      response: { success: true, data: { connected: true } },
      curl: `curl -X POST https://example.com/api/v1/n8n/connection/test \\
  -b cookies.txt`,
    },
    // --- Workflows ---
    {
      method: 'GET',
      path: '/api/v1/n8n/workflows',
      summary: 'n8n-Workflows auflisten',
      description: 'Listet alle Workflows der verbundenen n8n-Instanz auf.',
      response: { success: true, data: [] },
      curl: `curl -X GET https://example.com/api/v1/n8n/workflows \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/workflows',
      summary: 'n8n-Workflow erstellen',
      description: 'Erstellt einen neuen Workflow auf der n8n-Instanz aus einem Workflow-JSON.',
      requestBody: {
        name: 'E-Mail Benachrichtigung',
        nodes: [],
        connections: {},
      },
      response: { success: true, data: { id: '42', name: 'E-Mail Benachrichtigung' } },
      curl: `curl -X POST https://example.com/api/v1/n8n/workflows \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"E-Mail Benachrichtigung","nodes":[],"connections":{}}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/n8n/workflows/:id',
      summary: 'n8n-Workflow abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'n8n-Workflow-ID' },
      ],
      response: { success: true, data: { id: '42', name: 'E-Mail Benachrichtigung', active: true } },
      curl: `curl -X GET https://example.com/api/v1/n8n/workflows/42 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/n8n/workflows/:id',
      summary: 'n8n-Workflow aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'n8n-Workflow-ID' },
      ],
      requestBody: { name: 'E-Mail Benachrichtigung v2', nodes: [], connections: {} },
      response: { success: true, data: { id: '42', name: 'E-Mail Benachrichtigung v2' } },
      curl: `curl -X PUT https://example.com/api/v1/n8n/workflows/42 \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"E-Mail Benachrichtigung v2"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/n8n/workflows/:id',
      summary: 'n8n-Workflow loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'n8n-Workflow-ID' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/n8n/workflows/42 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/workflows/:id/activate',
      summary: 'n8n-Workflow aktivieren oder deaktivieren',
      description: 'Aktiviert oder deaktiviert einen Workflow. Ohne Body wird aktiviert, mit active=false deaktiviert.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'n8n-Workflow-ID' },
      ],
      requestBody: { active: true },
      response: { success: true, data: { id: '42', active: true } },
      curl: `curl -X POST https://example.com/api/v1/n8n/workflows/42/activate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"active":true}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/workflows/:id/execute',
      summary: 'n8n-Workflow ausfuehren',
      description: 'Fuehrt einen Workflow einmalig aus. Optionale Daten koennen als Input uebergeben werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'n8n-Workflow-ID' },
      ],
      requestBody: { data: { key: 'value' } },
      response: { success: true, data: { executionId: '123', status: 'running' } },
      curl: `curl -X POST https://example.com/api/v1/n8n/workflows/42/execute \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"data":{"key":"value"}}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/n8n/workflows/generate',
      summary: 'Workflow per KI generieren',
      description:
        'Generiert ein n8n-Workflow-JSON aus einer natuerlichsprachlichen Beschreibung. Mit autoDeploy=true wird der Workflow direkt auf n8n deployed.',
      requestBody: {
        prompt: 'Erstelle einen Workflow der bei neuen Kontakten eine E-Mail sendet',
        autoDeploy: false,
      },
      response: {
        success: true,
        data: { workflowJson: {}, logId: 'uuid', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/n8n/workflows/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Workflow fuer E-Mail bei neuem Kontakt","autoDeploy":false}'`,
    },
  ],
}

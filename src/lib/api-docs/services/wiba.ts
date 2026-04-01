import type { ApiService } from '../types'

export const wibaService: ApiService = {
  name: 'WiBA Audit',
  slug: 'wiba',
  description: 'Wirtschaftsbezogene Basisabsicherung (WiBA) Audits durchfuehren, Anforderungen bewerten und Scoring berechnen.',
  basePath: '/api/v1/wiba',
  auth: 'session',
  endpoints: [
    // --- Audits ---
    {
      method: 'GET',
      path: '/api/v1/wiba/audits',
      summary: 'Alle WiBA-Audit-Sessions auflisten',
      description: 'Gibt paginierte Audit-Sessions des Mandanten zurueck. Optional nach Status filterbar.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (ab 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Nach Status filtern', example: 'draft' },
      ],
      response: { items: [{ id: 'uuid', clientCompanyId: 'uuid', status: 'draft', createdAt: '2025-01-01T00:00:00Z' }], meta: { page: 1, limit: 20, total: 3, totalPages: 1 } },
      curl: `curl -s "https://example.com/api/v1/wiba/audits?page=1&limit=20" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/wiba/audits',
      summary: 'Neue WiBA-Audit-Session erstellen',
      requestBody: {
        clientCompanyId: '550e8400-e29b-41d4-a716-446655440000',
      },
      response: { id: 'uuid', clientCompanyId: 'uuid', status: 'draft', createdAt: '2025-01-01T00:00:00Z' },
      curl: `curl -s -X POST https://example.com/api/v1/wiba/audits -b cookies.txt -H "Content-Type: application/json" -d '{"clientCompanyId":"550e8400-e29b-41d4-a716-446655440000"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/wiba/audits/{id}',
      summary: 'Einzelne WiBA-Audit-Session abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { id: 'uuid', clientCompanyId: 'uuid', status: 'draft' },
      curl: `curl -s https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/wiba/audits/{id}',
      summary: 'WiBA-Audit-Session aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: { status: 'completed' },
      response: { id: 'uuid', status: 'completed' },
      curl: `curl -s -X PUT https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"status":"completed"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/wiba/audits/{id}',
      summary: 'WiBA-Audit-Session loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    // --- Answers ---
    {
      method: 'GET',
      path: '/api/v1/wiba/audits/{id}/answers',
      summary: 'Alle Antworten einer WiBA-Audit-Session abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { items: [{ requirementId: 1, status: 'ja', notes: 'Umgesetzt' }] },
      curl: `curl -s https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/wiba/audits/{id}/answers',
      summary: 'Antwort(en) speichern (einzeln oder Batch)',
      description: 'Speichert Antworten. Status-Werte: ja, nein, nicht_relevant. Fuer Batch: Body mit { answers: [...] }.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: {
        answers: [
          { requirementId: 1, status: 'ja', notes: 'Umgesetzt' },
          { requirementId: 2, status: 'nein' },
        ],
      },
      response: { items: [{ requirementId: 1, status: 'ja' }] },
      curl: `curl -s -X POST https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers -b cookies.txt -H "Content-Type: application/json" -d '{"answers":[{"requirementId":1,"status":"ja","notes":"Umgesetzt"}]}'`,
    },
    // --- Scoring ---
    {
      method: 'GET',
      path: '/api/v1/wiba/audits/{id}/scoring',
      summary: 'WiBA-Scoring berechnen',
      description: 'Berechnet den aktuellen Score, das Risiko-Level sowie Kategorie-Namen, -Reihenfolge und -Prioritaeten.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { currentScore: 12, maxScore: 20, riskLevel: 'low', categoryNames: {}, categoryOrder: [], categoryPriorities: {} },
      curl: `curl -s https://example.com/api/v1/wiba/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/scoring -b cookies.txt`,
    },
    // --- Requirements ---
    {
      method: 'GET',
      path: '/api/v1/wiba/requirements',
      summary: 'Alle WiBA-Anforderungen auflisten',
      description: 'Gibt die vollstaendige Liste der WiBA-Anforderungen mit Kategorie-Metadaten zurueck.',
      response: { requirements: [{ id: 1, category: 'A', questionText: '...' }], categoryNames: {}, categoryOrder: [], categoryPriorities: {} },
      curl: `curl -s https://example.com/api/v1/wiba/requirements -b cookies.txt`,
    },
  ],
}

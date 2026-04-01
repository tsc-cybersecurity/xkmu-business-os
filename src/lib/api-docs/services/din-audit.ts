import type { ApiService } from '../types'

export const dinAuditService: ApiService = {
  name: 'DIN SPEC 27076 Audit',
  slug: 'din-audit',
  description: 'Cybersecurity-Audits nach DIN SPEC 27076 durchfuehren, Anforderungen bewerten, Scoring berechnen und KI-gestuetzte Security-Roadmaps erstellen.',
  basePath: '/api/v1/din',
  auth: 'session',
  endpoints: [
    // --- Audits ---
    {
      method: 'GET',
      path: '/api/v1/din/audits',
      summary: 'Alle DIN-Audit-Sessions auflisten',
      description: 'Gibt paginierte Audit-Sessions des Mandanten zurueck. Optional nach Status filterbar.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (ab 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Nach Status filtern (z.B. draft, completed)', example: 'draft' },
      ],
      response: { items: [{ id: 'uuid', clientCompanyId: 'uuid', status: 'draft', createdAt: '2025-01-01T00:00:00Z' }], meta: { page: 1, limit: 20, total: 5, totalPages: 1 } },
      curl: `curl -s "https://example.com/api/v1/din/audits?page=1&limit=20&status=draft" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/audits',
      summary: 'Neue DIN-Audit-Session erstellen',
      description: 'Erstellt eine neue Audit-Session fuer ein Mandanten-Unternehmen.',
      requestBody: {
        clientCompanyId: '550e8400-e29b-41d4-a716-446655440000',
        reviewerId: '660e8400-e29b-41d4-a716-446655440001',
      },
      response: { id: 'uuid', clientCompanyId: 'uuid', status: 'draft', createdAt: '2025-01-01T00:00:00Z' },
      curl: `curl -s -X POST https://example.com/api/v1/din/audits -b cookies.txt -H "Content-Type: application/json" -d '{"clientCompanyId":"550e8400-e29b-41d4-a716-446655440000"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}',
      summary: 'Einzelne Audit-Session abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { id: 'uuid', clientCompanyId: 'uuid', status: 'draft', createdAt: '2025-01-01T00:00:00Z' },
      curl: `curl -s https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/din/audits/{id}',
      summary: 'Audit-Session aktualisieren',
      description: 'Aktualisiert eine bestehende Audit-Session (z.B. Status aendern).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: { status: 'completed' },
      response: { id: 'uuid', status: 'completed' },
      curl: `curl -s -X PUT https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"status":"completed"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/din/audits/{id}',
      summary: 'Audit-Session loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    // --- Answers ---
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}/answers',
      summary: 'Alle Antworten einer Audit-Session abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { items: [{ requirementId: 1, status: 'fulfilled', justification: 'Firewall aktiv' }] },
      curl: `curl -s https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/audits/{id}/answers',
      summary: 'Antwort(en) speichern (einzeln oder Batch)',
      description: 'Speichert eine einzelne Antwort oder mehrere Antworten im Batch-Modus. Fuer Batch: Body mit { answers: [...] }.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: {
        answers: [
          { requirementId: 1, status: 'fulfilled', justification: 'Firewall aktiv' },
          { requirementId: 2, status: 'not_fulfilled', justification: 'Kein Backup-Konzept' },
        ],
      },
      response: { items: [{ requirementId: 1, status: 'fulfilled' }] },
      curl: `curl -s -X POST https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers -b cookies.txt -H "Content-Type: application/json" -d '{"answers":[{"requirementId":1,"status":"fulfilled","justification":"Firewall aktiv"}]}'`,
    },
    // --- Scoring ---
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}/scoring',
      summary: 'Scoring einer Audit-Session berechnen',
      description: 'Berechnet den aktuellen Score, das Risiko-Level und die Themen-Aufschluesselung.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { currentScore: 18, maxScore: 30, riskLevel: 'medium', topicNames: {} },
      curl: `curl -s https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/scoring -b cookies.txt`,
    },
    // --- Roadmap ---
    {
      method: 'POST',
      path: '/api/v1/din/audits/{id}/roadmap',
      summary: 'KI-Security-Roadmap generieren',
      description: 'Erzeugt eine KI-gestuetzte Security-Roadmap basierend auf nicht erfuellten Anforderungen des Audits.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { roadmap: 'Markdown-Text der Roadmap', notFulfilled: 5, sessionId: 'uuid' },
      curl: `curl -s -X POST https://example.com/api/v1/din/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/roadmap -b cookies.txt`,
    },
    // --- Requirements ---
    {
      method: 'GET',
      path: '/api/v1/din/requirements',
      summary: 'Alle DIN-Anforderungen auflisten',
      description: 'Gibt die vollstaendige Liste der DIN SPEC 27076 Anforderungen inklusive Themen-Namen zurueck.',
      response: { requirements: [{ id: 1, number: '1.1', questionText: '...', points: 5, topic: 1 }], topicNames: {} },
      curl: `curl -s https://example.com/api/v1/din/requirements -b cookies.txt`,
    },
    // --- Grants ---
    {
      method: 'GET',
      path: '/api/v1/din/grants',
      summary: 'Foerdermittel auflisten',
      description: 'Gibt paginierte Foerdermittel zurueck. Optional nach Region und Mitarbeiterzahl filterbar.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'region', in: 'query', required: false, type: 'string', description: 'Nach Region filtern', example: 'Bayern' },
        { name: 'employeeCount', in: 'query', required: false, type: 'number', description: 'Nach Mitarbeiterzahl filtern', example: '50' },
      ],
      response: { grants: [{ id: 'uuid', name: 'go-digital', provider: 'BMWK', region: 'Bund' }], regions: ['Bund', 'Bayern'] },
      curl: `curl -s "https://example.com/api/v1/din/grants?region=Bayern&employeeCount=50" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/grants',
      summary: 'Neues Foerdermittel erstellen',
      requestBody: {
        name: 'go-digital',
        provider: 'BMWK',
        purpose: 'IT-Sicherheit fuer KMU',
        url: 'https://www.bmwk.de/go-digital',
        region: 'Bund',
        minEmployees: 1,
        maxEmployees: 100,
      },
      response: { id: 'uuid', name: 'go-digital', provider: 'BMWK', region: 'Bund' },
      curl: `curl -s -X POST https://example.com/api/v1/din/grants -b cookies.txt -H "Content-Type: application/json" -d '{"name":"go-digital","provider":"BMWK","region":"Bund","minEmployees":1,"maxEmployees":100}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/grants/{id}',
      summary: 'Einzelnes Foerdermittel abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Foerdermittel-ID (UUID)' },
      ],
      response: { id: 'uuid', name: 'go-digital', provider: 'BMWK', region: 'Bund' },
      curl: `curl -s https://example.com/api/v1/din/grants/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/din/grants/{id}',
      summary: 'Foerdermittel aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Foerdermittel-ID (UUID)' },
      ],
      requestBody: { name: 'go-digital (aktualisiert)', maxEmployees: 250 },
      response: { id: 'uuid', name: 'go-digital (aktualisiert)', maxEmployees: 250 },
      curl: `curl -s -X PUT https://example.com/api/v1/din/grants/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"go-digital (aktualisiert)","maxEmployees":250}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/din/grants/{id}',
      summary: 'Foerdermittel loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Foerdermittel-ID (UUID)' },
      ],
      response: { message: 'Foerdermittel geloescht' },
      curl: `curl -s -X DELETE https://example.com/api/v1/din/grants/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
  ],
}

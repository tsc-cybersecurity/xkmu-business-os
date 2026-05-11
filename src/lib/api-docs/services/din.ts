import type { ApiService } from '../types'

/**
 * HINWEIS zur Service-Abgrenzung:
 * Es gibt KEIN separates /api/v1/din-audit-Verzeichnis im Codebase — die ganze DIN-Funktionalitaet
 * liegt unter /api/v1/din/* und umfasst:
 *   - /audits (Sessions) inkl. answers, scoring, roadmap
 *   - /requirements (Katalog der DIN-Anforderungen, read-only Seed)
 *   - /grants (Foerdermittel)
 * Permission-Module: din_audits (fuer audits + requirements) und din_grants (fuer grants).
 * Die Service-Klasse heisst zwar "DinAuditService", aber das HTTP-API ist unter "din" gemounted —
 * dieser ApiService dokumentiert daher *alle* DIN-Endpunkte unter dem Slug "din".
 */
export const dinService: ApiService = {
  name: 'DIN-Compliance',
  slug: 'din',
  description:
    'DIN-Compliance-Modul (Norm-basierte Self-Assessments fuer KMU). Vollstaendiger Endpunkt-Baum unter /api/v1/din: Audit-Sessions mit Antworten, Scoring, KI-Roadmap, Anforderungskatalog und Foerdermittel-Verwaltung. Es gibt kein separates /api/v1/din-audit — der gesamte Audit-Workflow liegt unter /api/v1/din/audits. Permission-Module: din_audits (Audits + Requirements) und din_grants (Foerdermittel).',
  basePath: '/api/v1/din',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/din/audits',
      summary: 'DIN-Audit-Sessions auflisten',
      description: 'Listet DIN-Audit-Sessions mit Pagination und Status-Filter. Permission: din_audits.read.',
      params: [
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status-Filter (draft|in_progress|completed)' },
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            clientCompanyId: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            status: 'in_progress',
            createdAt: '2026-05-01T08:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
      },
      curl: `curl "https://example.com/api/v1/din/audits?status=in_progress" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/audits',
      summary: 'DIN-Audit-Session anlegen',
      description: 'Erstellt eine neue DIN-Audit-Session fuer eine Kundenfirma. Zod-validiert. Permission: din_audits.create.',
      requestBody: {
        clientCompanyId: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        reviewerId: 'u1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      },
      response: {
        success: true,
        data: { id: 'd2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/din/audits \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"clientCompanyId":"c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}',
      summary: 'DIN-Audit-Session Detail',
      description: 'Liefert eine DIN-Audit-Session. Permission: din_audits.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      response: { success: true, data: { id: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', status: 'in_progress' } },
      curl: `curl https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/din/audits/{id}',
      summary: 'DIN-Audit-Session aktualisieren',
      description: 'Aktualisiert eine DIN-Audit-Session (z.B. Status, Notes). Permission: din_audits.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      requestBody: { status: 'completed', notes: 'Alle Anforderungen geprueft.' },
      response: { success: true, data: { id: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', status: 'completed' } },
      curl: `curl -X PUT https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"completed"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/din/audits/{id}',
      summary: 'DIN-Audit-Session loeschen',
      description: 'Loescht eine DIN-Audit-Session. Permission: din_audits.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}/answers',
      summary: 'DIN-Audit-Antworten abrufen',
      description: 'Liefert alle Antworten einer DIN-Audit-Session. Permission: din_audits.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      response: {
        success: true,
        data: [
          { requirementId: 12, status: 'fulfilled', justification: 'Dokumentation vorhanden' },
          { requirementId: 13, status: 'not_fulfilled', justification: 'Schulung steht aus' },
        ],
      },
      curl: `curl https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/answers \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/audits/{id}/answers',
      summary: 'DIN-Audit-Antwort(en) speichern',
      description:
        'Speichert eine einzelne Antwort oder ein Bulk-Update (Property "answers"). status: fulfilled | not_fulfilled | irrelevant. Permission: din_audits.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      requestBody: {
        answers: [
          { requirementId: 12, status: 'fulfilled', justification: 'Policy ist dokumentiert' },
          { requirementId: 13, status: 'not_fulfilled', justification: 'Schulung in Q3 geplant' },
        ],
      },
      response: { success: true, data: [{ requirementId: 12, status: 'fulfilled' }] },
      curl: `curl -X POST https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/answers \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"requirementId":12,"status":"fulfilled"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/audits/{id}/scoring',
      summary: 'DIN-Audit-Scoring berechnen',
      description: 'Berechnet den aktuellen Punktestand der Audit-Session inkl. Risikostufe und Topic-Namen. Permission: din_audits.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      response: {
        success: true,
        data: {
          currentScore: 72,
          maxScore: 100,
          percentage: 72,
          riskLevel: 'medium',
          byTopic: { '1': 18, '2': 14, '3': 20, '4': 20 },
          topicNames: { '1': 'Organisation', '2': 'Daten', '3': 'Identitaet', '4': 'Vorfallserkennung' },
        },
      },
      curl: `curl https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/scoring \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/audits/{id}/roadmap',
      summary: 'KI-Security-Roadmap generieren',
      description:
        'Erstellt aus allen "not_fulfilled"-Antworten der Session eine KI-generierte Security-Roadmap (Prompt-Template "security_roadmap"). Wenn alle Anforderungen erfuellt sind, wird ein entsprechender Hinweis zurueckgegeben. Permission: din_audits.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Audit-Session-ID' }],
      response: {
        success: true,
        data: {
          roadmap: 'Phase 1 (0-30 Tage): Passwort-Policy einfuehren...\nPhase 2 (30-90 Tage): MFA fuer Admin-Accounts...',
          notFulfilled: 8,
          sessionId: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/din/audits/d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/roadmap \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/requirements',
      summary: 'DIN-Anforderungskatalog abrufen',
      description: 'Liefert den vollstaendigen Katalog der DIN-Anforderungen (Read-only Seed) inkl. Topic-Namen. Permission: din_audits.read.',
      response: {
        success: true,
        data: {
          requirements: [
            { id: 1, number: '1.1', topic: 1, questionText: 'Existiert eine schriftliche Informationssicherheits-Leitlinie?', points: 3 },
          ],
          topicNames: { '1': 'Organisation', '2': 'Daten', '3': 'Identitaet', '4': 'Vorfallserkennung' },
        },
      },
      curl: `curl https://example.com/api/v1/din/requirements \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/grants',
      summary: 'Foerdermittel auflisten',
      description: 'Listet DIN-Compliance-relevante Foerdermittel (Pagination, Filter nach Region und employeeCount). Liefert zusaetzlich alle vorkommenden Regionen. Permission: din_grants.read.',
      params: [
        { name: 'region', in: 'query', required: false, type: 'string', description: 'Region/Bundesland-Filter' },
        { name: 'employeeCount', in: 'query', required: false, type: 'number', description: 'Mitarbeiterzahl (filtert nach min/max)' },
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite' },
      ],
      response: {
        success: true,
        data: {
          grants: [
            {
              id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
              name: 'go-digital',
              provider: 'BMWK',
              region: 'Bundesweit',
              minEmployees: 0,
              maxEmployees: 100,
              url: 'https://www.bmwk.de/go-digital',
            },
          ],
          regions: ['Bundesweit', 'Bayern', 'NRW'],
        },
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      curl: `curl "https://example.com/api/v1/din/grants?region=Bayern&employeeCount=15" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/din/grants',
      summary: 'Foerdermittel anlegen',
      description: 'Erstellt einen neuen Foerdermittel-Eintrag (zod-validiert). Permission: din_grants.create.',
      requestBody: {
        name: 'Digital Jetzt',
        provider: 'BMWK',
        purpose: 'Investitionen in digitale Technologien',
        url: 'https://www.bmwk.de/digital-jetzt',
        region: 'Bundesweit',
        minEmployees: 3,
        maxEmployees: 499,
      },
      response: { success: true, data: { id: 'g2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', name: 'Digital Jetzt' } },
      curl: `curl -X POST https://example.com/api/v1/din/grants \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Digital Jetzt","provider":"BMWK","region":"Bundesweit"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/din/grants/{id}',
      summary: 'Foerdermittel-Detail',
      description: 'Liefert ein Foerdermittel. Permission: din_grants.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Grant-ID' }],
      response: { success: true, data: { id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'go-digital' } },
      curl: `curl https://example.com/api/v1/din/grants/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/din/grants/{id}',
      summary: 'Foerdermittel aktualisieren',
      description: 'Aktualisiert ein Foerdermittel (zod-validiert). Permission: din_grants.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Grant-ID' }],
      requestBody: { maxEmployees: 250, purpose: 'Aktualisierter Foerderzweck' },
      response: { success: true, data: { id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', maxEmployees: 250 } },
      curl: `curl -X PUT https://example.com/api/v1/din/grants/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"maxEmployees":250}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/din/grants/{id}',
      summary: 'Foerdermittel loeschen',
      description: 'Loescht ein Foerdermittel. Permission: din_grants.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Grant-ID' }],
      response: { success: true, data: { message: 'Foerdermittel geloescht' } },
      curl: `curl -X DELETE https://example.com/api/v1/din/grants/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
  ],
}

import type { ApiService } from '../types'

export const irPlaybookService: ApiService = {
  name: 'IR Playbook',
  slug: 'ir-playbook',
  description: 'Incident-Response-Szenarien verwalten, importieren und spezialisierte Views (Sofortmassnahmen, DSGVO-Checkliste, BSI-Mapping, Statistiken) abrufen.',
  basePath: '/api/v1/ir-playbook',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/ir-playbook',
      summary: 'Alle IR-Szenarien auflisten',
      description: 'Gibt alle Incident-Response-Szenarien zurueck. Filterbar nach Serie, Schweregrad, DSGVO-Relevanz und Freitext.',
      params: [
        { name: 'series', in: 'query', required: false, type: 'string', description: 'Nach Serie filtern', example: 'ransomware' },
        { name: 'severity', in: 'query', required: false, type: 'string', description: 'Nach Schweregrad filtern', example: 'critical' },
        { name: 'dsgvo', in: 'query', required: false, type: 'string', description: 'Nur DSGVO-relevante Szenarien (true)', example: 'true' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche', example: 'Ransomware' },
      ],
      response: { items: [{ id: 'ransomware-001', title: 'Ransomware-Angriff', series: 'ransomware', severity: 'critical' }] },
      curl: `curl -s "https://example.com/api/v1/ir-playbook?series=ransomware&severity=critical" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ir-playbook',
      summary: 'IR-Szenarien importieren',
      description: 'Importiert ein einzelnes Szenario (Body mit id-Feld) oder einen Batch (Body mit { scenarios: [...] }).',
      requestBody: {
        scenarios: [
          { id: 'ransomware-001', title: 'Ransomware-Angriff', series: 'ransomware', severity: 'critical' },
        ],
      },
      response: { imported: 1, ids: ['ransomware-001'] },
      curl: `curl -s -X POST https://example.com/api/v1/ir-playbook -b cookies.txt -H "Content-Type: application/json" -d '{"scenarios":[{"id":"ransomware-001","title":"Ransomware-Angriff","series":"ransomware","severity":"critical"}]}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/ir-playbook/{id}',
      summary: 'Einzelnes IR-Szenario abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Szenario-ID', example: 'ransomware-001' },
      ],
      response: { id: 'ransomware-001', title: 'Ransomware-Angriff', series: 'ransomware', severity: 'critical', steps: [] },
      curl: `curl -s https://example.com/api/v1/ir-playbook/ransomware-001 -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/ir-playbook/{id}',
      summary: 'IR-Szenario loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Szenario-ID', example: 'ransomware-001' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/ir-playbook/ransomware-001 -b cookies.txt`,
    },
    // --- Views ---
    {
      method: 'GET',
      path: '/api/v1/ir-playbook/views',
      summary: 'Sofortmassnahmen-View abrufen',
      description: 'Gibt alle Sofortmassnahmen aller Szenarien zurueck.',
      params: [
        { name: 'view', in: 'query', required: true, type: 'string', description: 'View-Typ: immediate-actions', example: 'immediate-actions' },
      ],
      response: { items: [{ scenarioId: 'ransomware-001', action: 'Systeme isolieren', priority: 1 }] },
      curl: `curl -s "https://example.com/api/v1/ir-playbook/views?view=immediate-actions" -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ir-playbook/views',
      summary: 'DSGVO-Checklisten-View abrufen',
      description: 'Gibt die DSGVO-Meldepflicht-Checkliste zurueck.',
      params: [
        { name: 'view', in: 'query', required: true, type: 'string', description: 'View-Typ: dsgvo-checklist', example: 'dsgvo-checklist' },
      ],
      response: { items: [{ scenarioId: 'ransomware-001', dsgvoRelevant: true, meldepflicht: '72h' }] },
      curl: `curl -s "https://example.com/api/v1/ir-playbook/views?view=dsgvo-checklist" -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ir-playbook/views',
      summary: 'BSI-Control-Mapping-View abrufen',
      description: 'Gibt das Mapping zwischen IR-Szenarien und BSI-Grundschutz-Controls zurueck.',
      params: [
        { name: 'view', in: 'query', required: true, type: 'string', description: 'View-Typ: bsi-mapping', example: 'bsi-mapping' },
      ],
      response: { items: [{ scenarioId: 'ransomware-001', controls: ['DER.2.1.A1'] }] },
      curl: `curl -s "https://example.com/api/v1/ir-playbook/views?view=bsi-mapping" -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ir-playbook/views',
      summary: 'Statistik-View abrufen',
      description: 'Gibt aggregierte Statistiken ueber alle IR-Szenarien zurueck.',
      params: [
        { name: 'view', in: 'query', required: true, type: 'string', description: 'View-Typ: stats', example: 'stats' },
      ],
      response: { totalScenarios: 12, bySeries: {}, bySeverity: {} },
      curl: `curl -s "https://example.com/api/v1/ir-playbook/views?view=stats" -b cookies.txt`,
    },
  ],
}

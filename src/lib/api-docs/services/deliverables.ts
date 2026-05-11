import type { ApiService } from '../types'

export const deliverablesService: ApiService = {
  name: 'Deliverables (Leistungspakete)',
  slug: 'deliverables',
  description:
    'Verwaltung der Leistungspakete A1-A4 (KI-Beratung), B1-B5 und C1-C6 aus den Website-Leistungspaketen. Deliverables sind die handelbaren Einheiten der xKMU-Beratung und Basis fuer SOPs und Projekte. Permission-Modul: processes.',
  basePath: '/api/v1/deliverables',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/deliverables',
      summary: 'Deliverables auflisten',
      description:
        'Listet Deliverables mit Pagination. Filterbar nach moduleId (UUID), module (Code wie "A1"), categoryCode/category und status. Default-Limit 200. Permission: processes.read.',
      params: [
        { name: 'moduleId', in: 'query', required: false, type: 'uuid', description: 'UUID des Moduls' },
        { name: 'module', in: 'query', required: false, type: 'string', description: 'Modul-Code (A1-A4, B1-B5, C1-C6)' },
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategorie-Code' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status-Filter' },
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (default 1)' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (default 200)' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
            code: 'A1',
            name: 'KI-Bestandsaufnahme',
            moduleCode: 'A',
            status: 'active',
          },
        ],
        meta: { page: 1, limit: 200, total: 24, totalPages: 1 },
      },
      curl: `curl "https://example.com/api/v1/deliverables?module=A1" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/deliverables',
      summary: 'Deliverable anlegen',
      description: 'Erstellt ein neues Leistungspaket. Permission: processes.create.',
      requestBody: {
        code: 'A2',
        name: 'KI-Strategie-Workshop',
        moduleId: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        description: 'Eintaegiger Workshop zur KI-Roadmap',
        status: 'active',
      },
      response: { success: true, data: { id: 'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a', code: 'A2' } },
      curl: `curl -X POST https://example.com/api/v1/deliverables \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"code":"A2","name":"KI-Strategie-Workshop"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/deliverables/{id}',
      summary: 'Deliverable-Detail',
      description: 'Liefert ein Deliverable anhand der ID. Permission: processes.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Deliverable-ID' }],
      response: {
        success: true,
        data: { id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a', code: 'A1', name: 'KI-Bestandsaufnahme' },
      },
      curl: `curl https://example.com/api/v1/deliverables/d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/deliverables/{id}',
      summary: 'Deliverable aktualisieren',
      description: 'Aktualisiert ein Deliverable (partial). Permission: processes.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Deliverable-ID' }],
      requestBody: { description: 'Aktualisierte Beschreibung', status: 'archived' },
      response: { success: true, data: { id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a', status: 'archived' } },
      curl: `curl -X PATCH https://example.com/api/v1/deliverables/d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"archived"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/deliverables/{id}',
      summary: 'Deliverable loeschen',
      description: 'Loescht ein Deliverable. Permission: processes.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Deliverable-ID' }],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/deliverables/d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/deliverables/modules',
      summary: 'Module mit Deliverable-Anzahl',
      description: 'Liefert alle Deliverable-Module (A, B, C) inkl. der Anzahl zugeordneter Deliverables. Permission: processes.read.',
      response: {
        success: true,
        data: [
          { id: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', code: 'A', name: 'KI-Beratung', deliverableCount: 4 },
          { id: 'm2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', code: 'B', name: 'Prozessoptimierung', deliverableCount: 5 },
          { id: 'm3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', code: 'C', name: 'Compliance & Sicherheit', deliverableCount: 6 },
        ],
      },
      curl: `curl https://example.com/api/v1/deliverables/modules \\
  -b cookies.txt`,
    },
  ],
}

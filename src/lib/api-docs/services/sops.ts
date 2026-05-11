import type { ApiService } from '../types'

export const sopsService: ApiService = {
  name: 'SOPs (Standard Operating Procedures)',
  slug: 'sops',
  description:
    'Verwaltung von Standard Operating Procedures (Prozessdokumentationen). CRUD auf SOP-Dokumenten, Verwaltung der Prozessschritte, PDF-Export, Publish-Workflow und Reife-Statistik. Permission-Modul: processes.',
  basePath: '/api/v1/sops',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/sops',
      summary: 'SOPs auflisten',
      description:
        'Listet alle SOPs auf. Optional gefiltert nach category, status oder Volltextsuche (q/search). Mit view=consolidated werden zusaetzlich Automatisierungs-Infos je Prozess geliefert (automation=all|automated|progress|gap, processKey). Permission: processes.read.',
      params: [
        { name: 'category', in: 'query', required: false, type: 'string', description: 'SOP-Kategorie' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status (draft, active, archived)' },
        { name: 'q', in: 'query', required: false, type: 'string', description: 'Volltextsuche' },
        { name: 'view', in: 'query', required: false, type: 'string', description: 'consolidated fuer Prozess-Sicht' },
        { name: 'automation', in: 'query', required: false, type: 'string', description: 'all|automated|progress|gap (nur bei view=consolidated)' },
        { name: 'processKey', in: 'query', required: false, type: 'string', description: 'Prozess-Key (nur bei view=consolidated)' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
            title: 'Onboarding neuer Mitarbeiter',
            category: 'HR',
            status: 'active',
            version: '1.2.0',
            maturityLevel: 3,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/sops?category=HR \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/sops',
      summary: 'Neue SOP anlegen',
      description: 'Erstellt eine neue SOP. Falls kein ownerId mitgegeben wird, wird automatisch die userId des Aufrufers verwendet. Permission: processes.create.',
      requestBody: {
        title: 'Rechnungspruefung Eingang',
        category: 'Finance',
        description: 'Pruefung von Eingangsrechnungen vor Buchung',
        deliverableId: null,
      },
      response: {
        success: true,
        data: {
          id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
          title: 'Rechnungspruefung Eingang',
          status: 'draft',
          version: '1.0.0',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/sops \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Rechnungspruefung Eingang","category":"Finance"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/sops/{id}',
      summary: 'SOP-Detail abrufen',
      description: 'Gibt eine SOP inkl. verknuepftem Deliverable zurueck. Permission: processes.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      response: {
        success: true,
        data: {
          id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          title: 'Onboarding neuer Mitarbeiter',
          version: '1.2.0',
          steps: [],
          deliverable: { id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a', code: 'A2' },
        },
      },
      curl: `curl https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/sops/{id}',
      summary: 'SOP aktualisieren',
      description: 'Aktualisiert eine SOP. Permission: processes.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      requestBody: { title: 'Onboarding neuer Mitarbeiter v2', status: 'active' },
      response: { success: true, data: { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', status: 'active' } },
      curl: `curl -X PUT https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"active"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/sops/{id}',
      summary: 'SOP loeschen',
      description: 'Loescht eine SOP (Soft-Delete). Permission: processes.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/sops/{id}/steps',
      summary: 'Schritte einer SOP setzen',
      description: 'Ersetzt alle Prozessschritte einer SOP durch das uebergebene Array. Permission: processes.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      requestBody: {
        steps: [
          { order: 1, title: 'Antrag pruefen', description: 'Vollstaendigkeit pruefen', responsible: 'HR' },
          { order: 2, title: 'Vertrag erstellen', description: 'Mustervertrag fuellen', responsible: 'HR' },
        ],
      },
      response: { success: true, data: [{ id: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', order: 1 }] },
      curl: `curl -X PUT https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/steps \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"steps":[{"order":1,"title":"Antrag pruefen"}]}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/sops/{id}/steps',
      summary: 'Schritt zu SOP hinzufuegen',
      description: 'Haengt einen einzelnen Prozessschritt an eine SOP an. Permission: processes.create.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      requestBody: { order: 3, title: 'Equipment bestellen', responsible: 'IT' },
      response: { success: true, data: { id: 's2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', order: 3 } },
      curl: `curl -X POST https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/steps \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"order":3,"title":"Equipment bestellen"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/sops/{id}/export',
      summary: 'SOP als PDF exportieren',
      description: 'Generiert ein PDF mit Titel, Schritten und Version. Liefert binary application/pdf mit Content-Disposition attachment. Permission: processes.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      response: { contentType: 'application/pdf', filename: 'SOP_onboarding-neuer-mitarbeiter_v1.2.0.pdf' },
      curl: `curl https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/export \\
  -b cookies.txt -o sop.pdf`,
    },
    {
      method: 'POST',
      path: '/api/v1/sops/{id}/publish',
      summary: 'SOP veroeffentlichen',
      description: 'Setzt eine SOP-Version produktiv (Publish-Workflow). Permission: processes.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'SOP-ID' }],
      response: {
        success: true,
        data: { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', status: 'active', version: '1.3.0', publishedAt: '2026-05-12T08:00:00.000Z' },
      },
      curl: `curl -X POST https://example.com/api/v1/sops/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/publish \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/sops/stats',
      summary: 'SOP-Reifegrad-Statistik',
      description: 'Aggregiert die Anzahl SOPs je Reifegrad (1=Anfaenger bis 5=Experte). Permission: processes.read.',
      response: {
        success: true,
        data: {
          maturityDistribution: [
            { level: 1, count: 3, label: 'Anfaenger' },
            { level: 2, count: 5, label: 'Grundkenntnisse' },
            { level: 3, count: 12, label: 'Kompetent' },
            { level: 4, count: 4, label: 'Fortgeschritten' },
            { level: 5, count: 1, label: 'Experte' },
          ],
          totalSops: 25,
        },
      },
      curl: `curl https://example.com/api/v1/sops/stats \\
  -b cookies.txt`,
    },
  ],
}

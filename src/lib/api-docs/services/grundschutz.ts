import type { ApiService } from '../types'

export const grundschutzService: ApiService = {
  name: 'BSI Grundschutz',
  slug: 'grundschutz',
  description: 'BSI IT-Grundschutz Basisabsicherung: Assets verwalten, Katalog importieren, Controls pruefen und Audits durchfuehren.',
  basePath: '/api/v1/grundschutz',
  auth: 'session',
  endpoints: [
    // --- Assets ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/assets',
      summary: 'Assets auflisten',
      description: 'Gibt alle Assets eines Unternehmens zurueck. companyId ist Pflicht. Optional filterbar nach Kategorie, Status oder Freitext.',
      params: [
        { name: 'companyId', in: 'query', required: true, type: 'string', description: 'Unternehmens-ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' },
        { name: 'categoryType', in: 'query', required: false, type: 'string', description: 'Kategorie-Typ filtern (z.B. IT-Systeme, Anwendungen)', example: 'IT-Systeme' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status filtern (active, planned, decommissioned)', example: 'active' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche', example: 'Server' },
      ],
      response: { items: [{ id: 'uuid', name: 'Mailserver', categoryType: 'Anwendungen', status: 'active' }] },
      curl: `curl -s "https://example.com/api/v1/grundschutz/assets?companyId=550e8400-e29b-41d4-a716-446655440000&status=active" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/grundschutz/assets',
      summary: 'Neues Asset erstellen',
      description: 'Erstellt ein Zielobjekt mit Schutzbedarf-Einstufung (Vertraulichkeit, Integritaet, Verfuegbarkeit).',
      requestBody: {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Mailserver',
        categoryType: 'Anwendungen',
        categoryName: 'E-Mail',
        vertraulichkeit: 'hoch',
        integritaet: 'hoch',
        verfuegbarkeit: 'sehr_hoch',
        status: 'active',
      },
      response: { id: 'uuid', name: 'Mailserver', categoryType: 'Anwendungen', status: 'active' },
      curl: `curl -s -X POST https://example.com/api/v1/grundschutz/assets -b cookies.txt -H "Content-Type: application/json" -d '{"companyId":"550e8400-e29b-41d4-a716-446655440000","name":"Mailserver","categoryType":"Anwendungen","categoryName":"E-Mail","vertraulichkeit":"hoch","integritaet":"hoch","verfuegbarkeit":"sehr_hoch"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/grundschutz/assets/{id}',
      summary: 'Einzelnes Asset abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Asset-ID (UUID)' },
      ],
      response: { id: 'uuid', name: 'Mailserver', categoryType: 'Anwendungen', vertraulichkeit: 'hoch' },
      curl: `curl -s https://example.com/api/v1/grundschutz/assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/grundschutz/assets/{id}',
      summary: 'Asset aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Asset-ID (UUID)' },
      ],
      requestBody: { name: 'Mailserver (aktualisiert)', verfuegbarkeit: 'hoch' },
      response: { id: 'uuid', name: 'Mailserver (aktualisiert)' },
      curl: `curl -s -X PUT https://example.com/api/v1/grundschutz/assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Mailserver (aktualisiert)","verfuegbarkeit":"hoch"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/grundschutz/assets/{id}',
      summary: 'Asset loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Asset-ID (UUID)' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -s -X DELETE https://example.com/api/v1/grundschutz/assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    // --- Asset Categories ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/assets/categories',
      summary: 'Zielobjekt-Kategorien abrufen',
      description: 'Gibt die hierarchischen BSI-Zielobjekt-Kategorien als flache Liste und Baumstruktur zurueck.',
      response: { flat: [{ uuid: 'uuid', name: 'IT-Systeme', type: 'IT-Systeme', category: 'Technisch', parentUuid: null }], tree: [] },
      curl: `curl -s https://example.com/api/v1/grundschutz/assets/categories -b cookies.txt`,
    },
    // --- Asset Control Mappings ---
    {
      method: 'POST',
      path: '/api/v1/grundschutz/assets/{id}/controls',
      summary: 'Control-Mapping fuer ein Asset erstellen/aktualisieren',
      description: 'Upsert eines Control-Mappings mit Anwendbarkeit und Umsetzungsstatus.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Asset-ID (UUID)' },
      ],
      requestBody: {
        controlId: 'SYS.1.1.A1',
        applicability: 'applicable',
        implementationStatus: 'umgesetzt',
        implementationNotes: 'Patch-Management aktiv',
      },
      response: { assetId: 'uuid', controlId: 'SYS.1.1.A1', applicability: 'applicable', implementationStatus: 'umgesetzt' },
      curl: `curl -s -X POST https://example.com/api/v1/grundschutz/assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890/controls -b cookies.txt -H "Content-Type: application/json" -d '{"controlId":"SYS.1.1.A1","applicability":"applicable","implementationStatus":"umgesetzt"}'`,
    },
    // --- Audits ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/audits',
      summary: 'Alle Grundschutz-Audit-Sessions auflisten',
      response: { items: [{ id: 'uuid', clientCompanyId: 'uuid', status: 'draft', title: 'Basis-Check 2025' }] },
      curl: `curl -s https://example.com/api/v1/grundschutz/audits -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/grundschutz/audits',
      summary: 'Neue Grundschutz-Audit-Session erstellen',
      requestBody: {
        clientCompanyId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Basis-Check 2025',
        filterGroups: ['SYS.1.1', 'APP.1.1'],
        filterSecLevel: 'basis',
      },
      response: { id: 'uuid', clientCompanyId: 'uuid', title: 'Basis-Check 2025', status: 'draft' },
      curl: `curl -s -X POST https://example.com/api/v1/grundschutz/audits -b cookies.txt -H "Content-Type: application/json" -d '{"clientCompanyId":"550e8400-e29b-41d4-a716-446655440000","title":"Basis-Check 2025"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/grundschutz/audits/{id}',
      summary: 'Einzelne Grundschutz-Audit-Session abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { id: 'uuid', clientCompanyId: 'uuid', status: 'draft' },
      curl: `curl -s https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/grundschutz/audits/{id}',
      summary: 'Grundschutz-Audit-Status aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: { status: 'completed' },
      response: { id: 'uuid', status: 'completed' },
      curl: `curl -s -X PUT https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"status":"completed"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/grundschutz/audits/{id}',
      summary: 'Grundschutz-Audit-Session loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    // --- Audit Answers ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/audits/{id}/answers',
      summary: 'Antworten einer Grundschutz-Audit-Session abrufen',
      description: 'Gibt alle Antworten zurueck. Optional nach Gruppen-ID filterbar.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
        { name: 'groupId', in: 'query', required: false, type: 'string', description: 'Nach Baustein-Gruppe filtern', example: 'SYS.1.1' },
      ],
      response: { items: [{ controlId: 'SYS.1.1.A1', status: 'umgesetzt' }] },
      curl: `curl -s "https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers?groupId=SYS.1.1" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/grundschutz/audits/{id}/answers',
      summary: 'Antwort(en) einer Grundschutz-Audit-Session speichern',
      description: 'Speichert einzelne oder Batch-Antworten. Fuer Batch: Body mit { answers: [...] }.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      requestBody: {
        answers: [
          { controlId: 'SYS.1.1.A1', status: 'umgesetzt', notes: 'Patch-Zyklus 30 Tage' },
        ],
      },
      response: { saved: 1 },
      curl: `curl -s -X POST https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/answers -b cookies.txt -H "Content-Type: application/json" -d '{"answers":[{"controlId":"SYS.1.1.A1","status":"umgesetzt","notes":"Patch-Zyklus 30 Tage"}]}'`,
    },
    // --- Audit Scoring ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/audits/{id}/scoring',
      summary: 'Grundschutz-Audit-Scoring abrufen',
      description: 'Berechnet den Umsetzungsgrad und die Bewertung des Audits.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Audit-Session-ID (UUID)' },
      ],
      response: { totalControls: 50, answered: 45, implemented: 38, implementationRate: 0.84 },
      curl: `curl -s https://example.com/api/v1/grundschutz/audits/a1b2c3d4-e5f6-7890-abcd-ef1234567890/scoring -b cookies.txt`,
    },
    // --- Catalog ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/catalog',
      summary: 'Katalog-Metadaten und Update-Info abrufen',
      description: 'Gibt Katalog-Metadaten und verfuegbare Update-Informationen zurueck.',
      response: { meta: { version: '2023', controlCount: 800, groupCount: 50 }, updateAvailable: false },
      curl: `curl -s https://example.com/api/v1/grundschutz/catalog -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/grundschutz/catalog',
      summary: 'Katalog von GitHub importieren/aktualisieren',
      description: 'Importiert den BSI IT-Grundschutz-Katalog aus der offiziellen GitHub-Quelle.',
      response: { imported: true, controlCount: 800 },
      curl: `curl -s -X POST https://example.com/api/v1/grundschutz/catalog -b cookies.txt`,
    },
    // --- Controls ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/controls',
      summary: 'Controls einer Gruppe auflisten',
      description: 'Gibt Controls einer Baustein-Gruppe zurueck. groupId ist Pflicht.',
      params: [
        { name: 'groupId', in: 'query', required: true, type: 'string', description: 'Baustein-Gruppen-ID', example: 'SYS.1.1' },
        { name: 'secLevel', in: 'query', required: false, type: 'string', description: 'Sicherheitsniveau filtern (basis, standard, erhoeht)', example: 'basis' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche', example: 'Patch' },
      ],
      response: { items: [{ id: 'SYS.1.1.A1', title: 'Geeignete Aufstellung', secLevel: 'basis' }] },
      curl: `curl -s "https://example.com/api/v1/grundschutz/controls?groupId=SYS.1.1&secLevel=basis" -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/grundschutz/controls/{id}',
      summary: 'Einzelnen Control abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Control-ID (z.B. SYS.1.1.A1)', example: 'SYS.1.1.A1' },
      ],
      response: { id: 'SYS.1.1.A1', title: 'Geeignete Aufstellung', description: '...', secLevel: 'basis', groupId: 'SYS.1.1' },
      curl: `curl -s https://example.com/api/v1/grundschutz/controls/SYS.1.1.A1 -b cookies.txt`,
    },
    // --- Groups ---
    {
      method: 'GET',
      path: '/api/v1/grundschutz/groups',
      summary: 'Alle Baustein-Gruppen mit Control-Counts auflisten',
      response: { items: [{ id: 'SYS.1.1', title: 'Allgemeiner Server', controlCount: 25 }] },
      curl: `curl -s https://example.com/api/v1/grundschutz/groups -b cookies.txt`,
    },
  ],
}

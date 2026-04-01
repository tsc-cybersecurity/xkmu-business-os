import type { ApiService } from '../types'

export const contractTemplatesService: ApiService = {
  name: 'Vertrags-Templates',
  slug: 'contract-templates',
  description: 'Vertragstemplates verwalten und KI-gestuetzt generieren.',
  basePath: '/api/v1/contract-templates',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/contract-templates',
      summary: 'Alle Vertrags-Templates auflisten',
      description: 'Gibt alle Templates des Mandanten zurueck. Optional nach Kategorie filterbar.',
      params: [
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategorie filtern (z.B. it_service, consulting, nda)', example: 'it_service' },
      ],
      response: { items: [{ id: 'uuid', name: 'IT-Dienstleistungsvertrag', category: 'it_service', description: '...', bodyHtml: '...' }] },
      curl: `curl -s https://example.com/api/v1/contract-templates?category=it_service -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/contract-templates',
      summary: 'Neues Vertrags-Template erstellen',
      description: 'Erstellt ein neues Template. Name und Kategorie sind Pflichtfelder.',
      requestBody: {
        name: 'Freelancer-Rahmenvertrag',
        category: 'consulting',
        description: 'Rahmenvertrag fuer freiberufliche IT-Berater',
        bodyHtml: '<h1>Rahmenvertrag</h1><p>Zwischen {{firmenname_auftraggeber}} und {{firmenname_auftragnehmer}}...</p>',
        placeholders: [
          { key: 'firmenname_auftraggeber', label: 'Firma Auftraggeber', type: 'text', required: true },
          { key: 'firmenname_auftragnehmer', label: 'Firma Auftragnehmer', type: 'text', required: true },
        ],
      },
      response: { id: 'uuid', name: 'Freelancer-Rahmenvertrag', category: 'consulting' },
      curl: `curl -s -X POST https://example.com/api/v1/contract-templates -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Freelancer-Rahmenvertrag","category":"consulting","description":"Rahmenvertrag fuer freiberufliche IT-Berater","bodyHtml":"<h1>Rahmenvertrag</h1><p>...</p>"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/contract-templates/{id}',
      summary: 'Einzelnes Template abrufen',
      description: 'Gibt ein bestimmtes Template anhand der ID zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { id: 'uuid', name: 'IT-Dienstleistungsvertrag', category: 'it_service', bodyHtml: '...', placeholders: [] },
      curl: `curl -s https://example.com/api/v1/contract-templates/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/contract-templates/{id}',
      summary: 'Template aktualisieren',
      description: 'Aktualisiert ein bestehendes Template. System-Templates koennen nicht geaendert werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)' },
      ],
      requestBody: {
        name: 'IT-Dienstleistungsvertrag (aktualisiert)',
        description: 'Aktualisierter Vertrag fuer Managed Services',
      },
      response: { id: 'uuid', name: 'IT-Dienstleistungsvertrag (aktualisiert)' },
      curl: `curl -s -X PUT https://example.com/api/v1/contract-templates/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"IT-Dienstleistungsvertrag (aktualisiert)","description":"Aktualisierter Vertrag fuer Managed Services"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/contract-templates/{id}',
      summary: 'Template loeschen',
      description: 'Loescht ein Template. System-Templates koennen nicht geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/contract-templates/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/contract-templates/generate',
      summary: 'Template per KI generieren',
      description: 'Generiert einen Vertragsentwurf per KI basierend auf deutschem Recht (BGB, HGB, DSGVO). Gibt strukturiertes JSON mit Name, Beschreibung, HTML-Body und Platzhaltern zurueck.',
      requestBody: {
        goal: 'Vertrag fuer laufende IT-Betreuung eines Autohauses mit 50 Arbeitsplaetzen, inklusive SLA und Datenschutz',
        category: 'it_service',
      },
      response: {
        name: 'IT-Betreuungsvertrag Autohaus',
        description: 'Managed-Services-Vertrag fuer KFZ-Handel mit SLA',
        category: 'it_service',
        bodyHtml: '<h2>1. Praeambel</h2><p>...</p>',
        placeholders: [
          { key: 'firmenname_auftraggeber', label: 'Firma Auftraggeber', type: 'text', required: true },
        ],
      },
      curl: `curl -s -X POST https://example.com/api/v1/contract-templates/generate -b cookies.txt -H "Content-Type: application/json" -d '{"goal":"Vertrag fuer laufende IT-Betreuung eines Autohauses mit 50 Arbeitsplaetzen","category":"it_service"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/contract-templates/seed',
      summary: 'System-Templates und Standard-Klauseln importieren',
      description: 'Importiert vordefinierte System-Templates (IT-Dienstleistungsvertrag, Beratungsvertrag, NDA, Werkvertrag, AV-Vertrag) und Standard-Klauseln in die Datenbank.',
      response: { templatesCreated: 5, clausesCreated: 12 },
      curl: `curl -s -X POST https://example.com/api/v1/contract-templates/seed -b cookies.txt`,
    },
  ],
}

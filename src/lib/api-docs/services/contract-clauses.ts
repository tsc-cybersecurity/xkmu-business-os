import type { ApiService } from '../types'

export const contractClausesService: ApiService = {
  name: 'Vertrags-Klauseln',
  slug: 'contract-clauses',
  description: 'Wiederverwendbare Vertragsklauseln (Bausteine) verwalten.',
  basePath: '/api/v1/contract-clauses',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/contract-clauses',
      summary: 'Alle Klauseln auflisten',
      description: 'Gibt alle Vertragsklauseln des Mandanten zurueck. Optional nach Kategorie filterbar.',
      params: [
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategorie filtern (z.B. haftung, datenschutz, kuendigung)', example: 'datenschutz' },
      ],
      response: { items: [{ id: 'uuid', name: 'DSGVO-Standardklausel', category: 'datenschutz', bodyHtml: '...' }] },
      curl: `curl -s https://example.com/api/v1/contract-clauses?category=datenschutz -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/contract-clauses',
      summary: 'Neue Klausel erstellen',
      description: 'Erstellt eine neue Vertragsklausel. Name und Kategorie sind Pflichtfelder.',
      requestBody: {
        name: 'Haftungsbeschraenkung IT-Dienstleistungen',
        category: 'haftung',
        description: 'Standardklausel zur Haftungsbeschraenkung bei IT-Projekten',
        bodyHtml: '<p>Die Haftung des Auftragnehmers ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt. Bei leichter Fahrlaessigkeit haftet der Auftragnehmer nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vertragstypisch vorhersehbaren Schaden.</p>',
      },
      response: { id: 'uuid', name: 'Haftungsbeschraenkung IT-Dienstleistungen', category: 'haftung' },
      curl: `curl -s -X POST https://example.com/api/v1/contract-clauses -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Haftungsbeschraenkung IT-Dienstleistungen","category":"haftung","bodyHtml":"<p>Die Haftung des Auftragnehmers ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt...</p>"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/contract-clauses/{id}',
      summary: 'Einzelne Klausel abrufen',
      description: 'Gibt eine bestimmte Klausel anhand der ID zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Klausel-ID (UUID)', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' },
      ],
      response: { id: 'uuid', name: 'DSGVO-Standardklausel', category: 'datenschutz', bodyHtml: '...' },
      curl: `curl -s https://example.com/api/v1/contract-clauses/b2c3d4e5-f6a7-8901-bcde-f12345678901 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/contract-clauses/{id}',
      summary: 'Klausel aktualisieren',
      description: 'Aktualisiert eine bestehende Klausel. System-Klauseln koennen nicht geaendert werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Klausel-ID (UUID)' },
      ],
      requestBody: {
        name: 'Haftungsbeschraenkung (erweitert)',
        bodyHtml: '<p>Aktualisierter Klauseltext...</p>',
      },
      response: { id: 'uuid', name: 'Haftungsbeschraenkung (erweitert)' },
      curl: `curl -s -X PUT https://example.com/api/v1/contract-clauses/b2c3d4e5-f6a7-8901-bcde-f12345678901 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Haftungsbeschraenkung (erweitert)","bodyHtml":"<p>Aktualisierter Klauseltext...</p>"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/contract-clauses/{id}',
      summary: 'Klausel loeschen',
      description: 'Loescht eine Klausel. System-Klauseln koennen nicht geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Klausel-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/contract-clauses/b2c3d4e5-f6a7-8901-bcde-f12345678901 -b cookies.txt`,
    },
  ],
}

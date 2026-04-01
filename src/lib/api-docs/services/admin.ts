import type { ApiService } from '../types'

export const adminService: ApiService = {
  name: 'Admin / Datenbank',
  slug: 'admin',
  description: 'Administrativer Zugriff auf Datenbanktabellen: Tabellen auflisten, Daten lesen (paginiert), Zeilen aktualisieren und loeschen. Mandanten-Isolation wird automatisch erzwungen.',
  basePath: '/api/v1/admin',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/admin/database/tables',
      summary: 'Alle Datenbanktabellen mit Zeilenanzahl auflisten',
      description: 'Gibt alle oeffentlichen Tabellen mit exakter Zeilenanzahl zurueck.',
      response: { items: [{ name: 'users', estimatedRows: 42 }, { name: 'din_audit_sessions', estimatedRows: 15 }] },
      curl: `curl -s https://example.com/api/v1/admin/database/tables -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/admin/database/tables/{tableName}',
      summary: 'Tabellendaten paginiert lesen',
      description: 'Gibt Spalten-Metadaten und paginierte Zeilen einer Tabelle zurueck. Mandanten-gefilterte Tabellen werden automatisch nach tenant_id eingeschraenkt.',
      params: [
        { name: 'tableName', in: 'path', required: true, type: 'string', description: 'Tabellenname', example: 'users' },
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (ab 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
      ],
      response: {
        columns: [{ name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' }],
        rows: [{ id: 'uuid', name: 'Max' }],
        hasTenantId: true,
        meta: { page: 1, limit: 20, total: 42, totalPages: 3 },
      },
      curl: `curl -s "https://example.com/api/v1/admin/database/tables/users?page=1&limit=20" -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/admin/database/tables/{tableName}',
      summary: 'Zeile in einer Tabelle aktualisieren',
      description: 'Aktualisiert eine Zeile anhand der ID. tenant_id kann nicht geaendert werden. Globale Tabellen erfordern Owner-Rolle. Nur gueltige Spaltennamen werden akzeptiert.',
      params: [
        { name: 'tableName', in: 'path', required: true, type: 'string', description: 'Tabellenname', example: 'users' },
      ],
      requestBody: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Max Mustermann (aktualisiert)',
        status: 'inactive',
      },
      response: { id: 'uuid', name: 'Max Mustermann (aktualisiert)', status: 'inactive' },
      curl: `curl -s -X PUT https://example.com/api/v1/admin/database/tables/users -b cookies.txt -H "Content-Type: application/json" -d '{"id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","name":"Max Mustermann (aktualisiert)","status":"inactive"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/admin/database/tables/{tableName}',
      summary: 'Zeile aus einer Tabelle loeschen',
      description: 'Loescht eine Zeile anhand der ID (als Query-Parameter). Mandanten-Zugehoerigkeit wird geprueft. Globale Tabellen erfordern Owner-Rolle.',
      params: [
        { name: 'tableName', in: 'path', required: true, type: 'string', description: 'Tabellenname', example: 'users' },
        { name: 'id', in: 'query', required: true, type: 'string', description: 'Datensatz-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { deleted: true, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      curl: `curl -s -X DELETE "https://example.com/api/v1/admin/database/tables/users?id=a1b2c3d4-e5f6-7890-abcd-ef1234567890" -b cookies.txt`,
    },
  ],
}

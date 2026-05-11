import type { ApiService } from '../types'

export const importService: ApiService = {
  name: 'Daten-Import',
  slug: 'import',
  description:
    'Endpunkte zum Import von Backup-/Migrationsdaten. Aktuell vorhanden: Datenbank-Import via SQL-Dump (.sql), unterstuetzt merge und replace mit definierter Tabellen-Reihenfolge (Parents vor Children), Whitelist und legacy-tenant_id-Stripping. Permission-Modul: database.',
  basePath: '/api/v1/import',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/import/database',
      summary: 'SQL-Datenbank-Import',
      description:
        'Importiert einen SQL-Dump (multipart/form-data, Feld "file") in die Datenbank. mode=merge (default, ON CONFLICT DO NOTHING) oder mode=replace (loescht zuvor alle nicht-singleton-Tabellen in DELETE_ORDER). Max. 50MB, nur .sql, nur INSERT-Statements. Strippt legacy tenant_id-Spalten. Tabellen-Whitelist via ALLOWED_TABLES. Permission: database.create.',
      params: [
        { name: 'file', in: 'body', required: true, type: 'file', description: 'SQL-Dump (multipart/form-data field "file"), max 50MB, Endung .sql' },
        { name: 'mode', in: 'body', required: false, type: 'string', description: 'merge (default) oder replace' },
      ],
      requestBody: {
        contentType: 'multipart/form-data',
        fields: {
          file: '@xkmu-backup-2026-05-12.sql',
          mode: 'merge',
        },
      },
      response: {
        success: true,
        message: 'Import erfolgreich abgeschlossen',
        stats: {
          totalStatements: 1247,
          totalInserted: 1240,
          tablesAffected: 32,
          perTable: { companies: 85, leads: 142, products: 28, sop_documents: 25 },
          errors: ['leads: duplicate key value violates unique constraint'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/import/database \\
  -b cookies.txt \\
  -F "file=@xkmu-backup-2026-05-12.sql" \\
  -F "mode=merge"`,
    },
  ],
}

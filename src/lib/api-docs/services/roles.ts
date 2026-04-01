import type { ApiService } from '../types'

export const rolesService: ApiService = {
  name: 'Rollenverwaltung',
  slug: 'roles',
  description: 'Rollen erstellen, auflisten, aktualisieren und loeschen. Jede Rolle enthaelt Berechtigungen. System-Rollen koennen nicht geloescht werden.',
  basePath: '/api/v1/roles',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/roles',
      summary: 'Alle Rollen mit Benutzer-Counts auflisten',
      description: 'Gibt alle Rollen des Mandanten zurueck, jeweils mit der Anzahl zugeordneter Benutzer.',
      response: { items: [{ id: 'uuid', name: 'Admin', isSystem: true, userCount: 3, permissions: {} }] },
      curl: `curl -s https://example.com/api/v1/roles -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/roles',
      summary: 'Neue Rolle erstellen',
      description: 'Erstellt eine neue benutzerdefinierte Rolle. Der Name muss pro Mandant eindeutig sein.',
      requestBody: {
        name: 'Auditor',
        description: 'Darf Audits lesen und durchfuehren',
        permissions: {
          din_audits: { read: true, create: true, update: true, delete: false },
          users: { read: true, create: false, update: false, delete: false },
        },
      },
      response: { id: 'uuid', name: 'Auditor', isSystem: false, permissions: {} },
      curl: `curl -s -X POST https://example.com/api/v1/roles -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Auditor","description":"Darf Audits lesen und durchfuehren","permissions":{"din_audits":{"read":true,"create":true,"update":true,"delete":false}}}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/roles/{id}',
      summary: 'Einzelne Rolle mit Berechtigungen abrufen',
      description: 'Gibt eine Rolle mit ihren vollstaendigen Berechtigungen zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rollen-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { id: 'uuid', name: 'Auditor', isSystem: false, permissions: { din_audits: { read: true, create: true } } },
      curl: `curl -s https://example.com/api/v1/roles/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/roles/{id}',
      summary: 'Rolle aktualisieren',
      description: 'Aktualisiert Name, Beschreibung und/oder Berechtigungen einer Rolle.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rollen-ID (UUID)' },
      ],
      requestBody: {
        name: 'Auditor (erweitert)',
        permissions: {
          din_audits: { read: true, create: true, update: true, delete: true },
        },
      },
      response: { id: 'uuid', name: 'Auditor (erweitert)', permissions: {} },
      curl: `curl -s -X PUT https://example.com/api/v1/roles/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Auditor (erweitert)","permissions":{"din_audits":{"read":true,"create":true,"update":true,"delete":true}}}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/roles/{id}',
      summary: 'Rolle loeschen',
      description: 'Loescht eine benutzerdefinierte Rolle. System-Rollen koennen nicht geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rollen-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/roles/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
  ],
}

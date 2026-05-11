import type { ApiService } from '../types'

export const userGroupsService: ApiService = {
  name: 'Benutzergruppen',
  slug: 'user-groups',
  description:
    'Verwaltung von Benutzergruppen und deren Mitgliedern. Benutzergruppen dienen z.B. der Sichtbarkeitssteuerung von Inhalten. Permission-Modul: users.',
  basePath: '/api/v1/user-groups',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/user-groups',
      summary: 'Benutzergruppen auflisten',
      description: 'Listet alle Benutzergruppen. Permission: users.read.',
      response: {
        success: true,
        data: [
          { id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'Vertrieb', description: 'Sales-Team', memberCount: 4 },
          { id: 'g2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', name: 'Geschaeftsfuehrung', description: 'Leitungskreis', memberCount: 2 },
        ],
      },
      curl: `curl https://example.com/api/v1/user-groups \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/user-groups',
      summary: 'Benutzergruppe anlegen',
      description: 'Erstellt eine neue Benutzergruppe (zod-validiert via createUserGroupSchema). Permission: users.create.',
      requestBody: { name: 'Marketing', description: 'Marketing-Team' },
      response: { success: true, data: { id: 'g3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', name: 'Marketing' } },
      curl: `curl -X POST https://example.com/api/v1/user-groups \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Marketing","description":"Marketing-Team"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/user-groups/{id}',
      summary: 'Benutzergruppe + Mitglieder abrufen',
      description: 'Liefert eine Benutzergruppe inkl. ihrer Mitgliederliste. Permission: users.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' }],
      response: {
        success: true,
        data: {
          id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          name: 'Vertrieb',
          members: [
            { userId: 'u1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', email: 'max@xkmu.de' },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/user-groups/{id}',
      summary: 'Benutzergruppe aktualisieren',
      description: 'Aktualisiert eine Benutzergruppe (zod-validiert via updateUserGroupSchema). Permission: users.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' }],
      requestBody: { description: 'Sales & Account Management' },
      response: { success: true, data: { id: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', description: 'Sales & Account Management' } },
      curl: `curl -X PATCH https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"description":"Sales & Account Management"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/user-groups/{id}',
      summary: 'Benutzergruppe loeschen',
      description: 'Loescht eine Benutzergruppe. Permission: users.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' }],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/user-groups/{id}/members',
      summary: 'Mitglieder einer Gruppe auflisten',
      description: 'Listet alle Mitglieder einer Benutzergruppe. Permission: users.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' }],
      response: {
        success: true,
        data: [
          { userId: 'u1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', email: 'max@xkmu.de', firstName: 'Max', lastName: 'Mustermann' },
        ],
      },
      curl: `curl https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/members \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/user-groups/{id}/members',
      summary: 'Mitglied zu Gruppe hinzufuegen',
      description: 'Fuegt einen Benutzer einer Gruppe hinzu (zod-validiert via addUserGroupMemberSchema). Permission: users.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' }],
      requestBody: { userId: 'u2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d' },
      response: { success: true, data: { added: true } },
      curl: `curl -X POST https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/members \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"userId":"u2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/user-groups/{id}/members/{userId}',
      summary: 'Mitglied aus Gruppe entfernen',
      description: 'Entfernt einen Benutzer aus einer Gruppe. Permission: users.update.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'uuid', description: 'Gruppen-ID' },
        { name: 'userId', in: 'path', required: true, type: 'uuid', description: 'User-ID' },
      ],
      response: { success: true, data: { removed: true } },
      curl: `curl -X DELETE https://example.com/api/v1/user-groups/g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/members/u2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d \\
  -b cookies.txt`,
    },
  ],
}

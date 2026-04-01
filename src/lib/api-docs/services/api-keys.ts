import type { ApiService } from '../types'

export const apiKeysService: ApiService = {
  name: 'API-Schluessel',
  slug: 'api-keys',
  description: 'API-Schluessel erstellen, auflisten und loeschen. Der Klartext-Schluessel wird nur bei der Erstellung einmalig zurueckgegeben.',
  basePath: '/api/v1/api-keys',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/api-keys',
      summary: 'Alle API-Schluessel auflisten',
      description: 'Gibt alle API-Schluessel des Mandanten zurueck. Der Key-Hash wird nie zurueckgegeben.',
      response: { items: [{ id: 'uuid', name: 'CI/CD Pipeline', permissions: ['din_audits:read'], createdAt: '2025-01-01T00:00:00Z', expiresAt: null }] },
      curl: `curl -s https://example.com/api/v1/api-keys -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/api-keys',
      summary: 'Neuen API-Schluessel erstellen',
      description: 'Erstellt einen neuen API-Schluessel. Der Klartext-Schluessel (rawKey) wird nur in dieser Antwort zurueckgegeben und kann danach nicht mehr abgerufen werden.',
      requestBody: {
        name: 'CI/CD Pipeline',
        permissions: ['din_audits:read', 'users:read'],
        expiresAt: '2026-12-31T23:59:59Z',
      },
      response: { id: 'uuid', name: 'CI/CD Pipeline', rawKey: 'xkmu_ak_...', permissions: ['din_audits:read', 'users:read'], expiresAt: '2026-12-31T23:59:59Z' },
      curl: `curl -s -X POST https://example.com/api/v1/api-keys -b cookies.txt -H "Content-Type: application/json" -d '{"name":"CI/CD Pipeline","permissions":["din_audits:read","users:read"],"expiresAt":"2026-12-31T23:59:59Z"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/api-keys/{id}',
      summary: 'API-Schluessel loeschen',
      description: 'Widerruft einen API-Schluessel unwiderruflich.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'API-Schluessel-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { message: 'API key deleted successfully' },
      curl: `curl -s -X DELETE https://example.com/api/v1/api-keys/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
  ],
}

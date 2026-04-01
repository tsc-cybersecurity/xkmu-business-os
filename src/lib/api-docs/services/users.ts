import type { ApiService } from '../types'

export const usersService: ApiService = {
  name: 'Benutzerverwaltung',
  slug: 'users',
  description: 'Benutzer erstellen, auflisten, aktualisieren und loeschen. Unterstuetzt Filterung nach Rolle, Status und Freitext.',
  basePath: '/api/v1/users',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/users',
      summary: 'Alle Benutzer auflisten',
      description: 'Gibt paginierte Benutzer des Mandanten zurueck. Filterbar nach Rolle, Status und Freitext.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (ab 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'role', in: 'query', required: false, type: 'string', description: 'Nach Rolle filtern', example: 'admin' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Nach Status filtern (active, inactive)', example: 'active' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche (Name, E-Mail)', example: 'max' },
      ],
      response: { items: [{ id: 'uuid', name: 'Max Mustermann', email: 'max@example.com', role: 'admin', status: 'active' }], meta: { page: 1, limit: 20, total: 5, totalPages: 1 } },
      curl: `curl -s "https://example.com/api/v1/users?page=1&limit=20&role=admin" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/users',
      summary: 'Neuen Benutzer erstellen',
      description: 'Erstellt einen neuen Benutzer. E-Mail muss eindeutig sein. Passwort-Hash wird in der Antwort nicht zurueckgegeben.',
      requestBody: {
        name: 'Max Mustermann',
        email: 'max@example.com',
        password: 'sicheres-passwort-123',
        role: 'editor',
      },
      response: { id: 'uuid', name: 'Max Mustermann', email: 'max@example.com', role: 'editor', status: 'active' },
      curl: `curl -s -X POST https://example.com/api/v1/users -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Max Mustermann","email":"max@example.com","password":"sicheres-passwort-123","role":"editor"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/users/{id}',
      summary: 'Einzelnen Benutzer abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Benutzer-ID (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      response: { id: 'uuid', name: 'Max Mustermann', email: 'max@example.com', role: 'admin' },
      curl: `curl -s https://example.com/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/users/{id}',
      summary: 'Benutzer aktualisieren',
      description: 'Aktualisiert einen Benutzer. Benutzer koennen sich selbst aktualisieren, aber nur Admins/Owner duerfen Rollen aendern.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Benutzer-ID (UUID)' },
      ],
      requestBody: { name: 'Max Mustermann (aktualisiert)', role: 'admin' },
      response: { id: 'uuid', name: 'Max Mustermann (aktualisiert)', role: 'admin' },
      curl: `curl -s -X PUT https://example.com/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt -H "Content-Type: application/json" -d '{"name":"Max Mustermann (aktualisiert)","role":"admin"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/users/{id}',
      summary: 'Benutzer loeschen',
      description: 'Loescht einen Benutzer. Das eigene Konto kann nicht geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Benutzer-ID (UUID)' },
      ],
      response: { message: 'User deleted successfully' },
      curl: `curl -s -X DELETE https://example.com/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 -b cookies.txt`,
    },
  ],
}

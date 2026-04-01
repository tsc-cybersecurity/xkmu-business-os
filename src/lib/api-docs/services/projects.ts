import type { ApiService } from '../types'

export const projectsService: ApiService = {
  name: 'Projekte',
  slug: 'projects',
  description: 'Projekte und Projektaufgaben verwalten.',
  basePath: '/api/v1/projects',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/projects',
      summary: 'Alle Projekte auflisten',
      description: 'Gibt alle Projekte des Mandanten zurueck. Optional nach Status filterbar.',
      params: [
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status filtern (z.B. active, completed, on_hold)', example: 'active' },
      ],
      response: { items: [{ id: 'uuid', name: 'Website-Relaunch Musterhaus GmbH', status: 'active', description: '...' }] },
      curl: `curl -s "https://example.com/api/v1/projects?status=active" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/projects',
      summary: 'Neues Projekt erstellen',
      requestBody: {
        name: 'ERP-Migration Schmitt Metallbau',
        description: 'Migration von Legacy-ERP auf cloud-basierte Loesung',
        status: 'active',
        startDate: '2026-04-01',
        dueDate: '2026-09-30',
      },
      response: { id: 'uuid', name: 'ERP-Migration Schmitt Metallbau', status: 'active' },
      curl: `curl -s -X POST https://example.com/api/v1/projects -b cookies.txt -H "Content-Type: application/json" -d '{"name":"ERP-Migration Schmitt Metallbau","description":"Migration von Legacy-ERP auf cloud-basierte Loesung","status":"active","startDate":"2026-04-01","dueDate":"2026-09-30"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/projects/{id}',
      summary: 'Projekt mit Aufgaben abrufen',
      description: 'Gibt ein Projekt inklusive aller zugehoerigen Aufgaben zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)', example: 'f6a7b8c9-d0e1-2345-fghi-678901abcdef' },
      ],
      response: { id: 'uuid', name: 'ERP-Migration Schmitt Metallbau', status: 'active', tasks: [{ id: 'uuid', title: 'Anforderungsanalyse', status: 'done' }] },
      curl: `curl -s https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/projects/{id}',
      summary: 'Projekt aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
      ],
      requestBody: {
        name: 'ERP-Migration Schmitt Metallbau (Phase 2)',
        status: 'active',
        dueDate: '2026-12-31',
      },
      response: { id: 'uuid', name: 'ERP-Migration Schmitt Metallbau (Phase 2)', status: 'active' },
      curl: `curl -s -X PUT https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef -b cookies.txt -H "Content-Type: application/json" -d '{"name":"ERP-Migration Schmitt Metallbau (Phase 2)","dueDate":"2026-12-31"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/projects/{id}',
      summary: 'Projekt loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/projects/{id}/tasks',
      summary: 'Aufgaben eines Projekts auflisten',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
      ],
      response: { items: [{ id: 'uuid', title: 'Anforderungsanalyse', status: 'done', dueDate: '2026-04-15' }] },
      curl: `curl -s https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef/tasks -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/projects/{id}/tasks',
      summary: 'Neue Aufgabe im Projekt erstellen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
      ],
      requestBody: {
        title: 'Datenmigration vorbereiten',
        description: 'Bestandsdaten aus Legacy-System exportieren und Mapping erstellen',
        status: 'todo',
        startDate: '2026-05-01',
        dueDate: '2026-05-15',
      },
      response: { id: 'uuid', title: 'Datenmigration vorbereiten', status: 'todo' },
      curl: `curl -s -X POST https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef/tasks -b cookies.txt -H "Content-Type: application/json" -d '{"title":"Datenmigration vorbereiten","description":"Bestandsdaten aus Legacy-System exportieren und Mapping erstellen","status":"todo","startDate":"2026-05-01","dueDate":"2026-05-15"}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/projects/{id}/tasks/{taskId}',
      summary: 'Aufgabe aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
        { name: 'taskId', in: 'path', required: true, type: 'string', description: 'Aufgaben-ID (UUID)', example: 'a7b8c9d0-e1f2-3456-ghij-789012abcdef' },
      ],
      requestBody: {
        title: 'Datenmigration vorbereiten',
        status: 'in_progress',
        dueDate: '2026-05-20',
      },
      response: { id: 'uuid', title: 'Datenmigration vorbereiten', status: 'in_progress' },
      curl: `curl -s -X PUT https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef/tasks/a7b8c9d0-e1f2-3456-ghij-789012abcdef -b cookies.txt -H "Content-Type: application/json" -d '{"status":"in_progress","dueDate":"2026-05-20"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/projects/{id}/tasks/{taskId}',
      summary: 'Aufgabe loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Projekt-ID (UUID)' },
        { name: 'taskId', in: 'path', required: true, type: 'string', description: 'Aufgaben-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/projects/f6a7b8c9-d0e1-2345-fghi-678901abcdef/tasks/a7b8c9d0-e1f2-3456-ghij-789012abcdef -b cookies.txt`,
    },
  ],
}

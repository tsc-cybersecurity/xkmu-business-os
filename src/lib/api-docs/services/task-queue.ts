import type { ApiService } from '../types'

export const taskQueueService: ApiService = {
  name: 'Task-Queue',
  slug: 'task-queue',
  description:
    'Asynchrone Job-Queue fuer Hintergrundaufgaben (E-Mail-Versand, Webhook-Calls, Workflow-Steps usw.). Tasks werden mit Status, Prioritaet und Scheduling-Zeitpunkt verwaltet und koennen gezielt oder als Batch ausgefuehrt werden. Alle Endpunkte erfordern eine aktive Session und settings-Berechtigung.',
  basePath: '/api/v1/task-queue',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/task-queue',
      summary: 'Tasks auflisten',
      description:
        'Listet Tasks paginiert mit optionalen Filtern (status, type, excludePending=1). Eigene Pagination — Limit bis 500 statt globaler 100, da die Queue als History-View genutzt wird. Erfordert die Berechtigung settings.read.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitenzahl (default 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite, max. 500', example: '100' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filter auf Task-Status', example: 'failed' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Filter auf Task-Typ', example: 'send_email' },
        { name: 'excludePending', in: 'query', required: false, type: 'string', description: 'Pending-Tasks ausblenden (1)', example: '1' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
            type: 'send_email',
            status: 'completed',
            priority: 5,
            payload: { to: 'kunde@example.de', template: 'welcome' },
            scheduledFor: '2026-05-12T10:00:00.000Z',
            referenceType: 'contact',
            referenceId: 'c1-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          },
        ],
        meta: {
          page: 1,
          limit: 100,
          total: 1,
          stats: { pending: 0, processing: 0, completed: 12, failed: 1 },
        },
      },
      curl: `curl 'https://example.com/api/v1/task-queue?status=failed&limit=50' \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/task-queue',
      summary: 'Task erstellen',
      description:
        'Erstellt einen neuen Task in der Queue. Optional mit Prioritaet, Scheduling und Referenz auf eine Entitaet. Erfordert die Berechtigung settings.create.',
      requestBody: {
        type: 'send_email',
        priority: 5,
        payload: { to: 'lisa@weber-consulting.de', template: 'welcome' },
        scheduledFor: '2026-05-12T14:00:00.000Z',
        referenceType: 'contact',
        referenceId: 'c1-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
      response: {
        success: true,
        data: {
          id: 'tq-4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f90',
          type: 'send_email',
          status: 'pending',
          scheduledFor: '2026-05-12T14:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/task-queue \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"type":"send_email","priority":5,"payload":{"to":"lisa@weber-consulting.de"}}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/task-queue',
      summary: 'Tasks bulk-loeschen',
      description:
        'Loescht mehrere Tasks anhand eines scope-Filters. Mögliche scope-Werte: all (alle), older-than (aelter als maxAgeHours, default 24), without-error (alle nicht-failed). Erfordert die Berechtigung settings.delete.',
      params: [
        { name: 'scope', in: 'query', required: true, type: 'string', description: 'all | older-than | without-error', example: 'older-than' },
        { name: 'maxAgeHours', in: 'query', required: false, type: 'number', description: 'Maximales Alter in Stunden (nur scope=older-than)', example: '48' },
      ],
      response: {
        success: true,
        data: { deleted: 17 },
      },
      curl: `curl -X DELETE 'https://example.com/api/v1/task-queue?scope=older-than&maxAgeHours=48' \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/task-queue/{id}',
      summary: 'Task-Details abrufen',
      description:
        'Liefert die Detail-Daten zu einem einzelnen Task. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 'tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
          type: 'send_email',
          status: 'failed',
          attempts: 3,
          lastError: 'SMTP timeout',
          payload: { to: 'kunde@example.de' },
        },
      },
      curl: `curl https://example.com/api/v1/task-queue/tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/task-queue/{id}',
      summary: 'Task stornieren',
      description:
        'Storniert einen ausstehenden Task. Erwartet im Body action="cancel". Erfordert die Berechtigung settings.update.',
      requestBody: { action: 'cancel' },
      response: {
        success: true,
        data: { cancelled: true },
      },
      curl: `curl -X PUT https://example.com/api/v1/task-queue/tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"action":"cancel"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/task-queue/{id}',
      summary: 'Task loeschen',
      description:
        'Loescht einen einzelnen Task. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/task-queue/tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/task-queue/{id}/retry',
      summary: 'Fehlerhaften Task erneut versuchen',
      description:
        'Setzt einen fehlgeschlagenen Task auf pending zurueck, damit er beim naechsten Execute-Lauf wieder beruecksichtigt wird. Erfordert die Berechtigung settings.update.',
      response: {
        success: true,
        data: { id: 'tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', status: 'pending' },
      },
      curl: `curl -X POST https://example.com/api/v1/task-queue/tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f/retry \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/task-queue/execute',
      summary: 'Tasks ausfuehren',
      description:
        'Triggert die Ausfuehrung von Tasks. Erwartet entweder eine ids-Liste, all=true (alle pending) oder eine einzelne id. Erfordert die Berechtigung settings.update.',
      requestBody: {
        ids: ['tq-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'tq-4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f90'],
      },
      response: {
        success: true,
        data: { completed: 1, failed: 1, errors: [{ id: 'tq-4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f90', error: 'SMTP timeout' }] },
      },
      curl: `curl -X POST https://example.com/api/v1/task-queue/execute \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"all":true}'`,
    },
  ],
}

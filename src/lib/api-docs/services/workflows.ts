import type { ApiService } from '../types'

export const workflowsService: ApiService = {
  name: 'Workflows',
  slug: 'workflows',
  description:
    'Workflow-Engine zur Definition und Ausfuehrung von Automatisierungen. Workflows bestehen aus Trigger, Steps und optionalem Zeitplan (Schedule). Alle Endpunkte erfordern eine aktive Session und settings-Berechtigung.',
  basePath: '/api/v1/workflows',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/workflows',
      summary: 'Workflows auflisten',
      description:
        'Listet alle definierten Workflows chronologisch nach Erstellungsdatum auf. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            id: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            name: 'Lead Follow-Up nach 24h',
            description: 'Sendet automatisch eine Erinnerungs-E-Mail an neue Leads.',
            trigger: 'contact.submitted',
            steps: [
              { type: 'wait', config: { hours: 24 } },
              { type: 'send_email', config: { template: 'lead_followup' } },
            ],
            schedule: null,
            isActive: true,
            createdAt: '2026-05-10T08:15:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/workflows \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/workflows',
      summary: 'Workflow erstellen',
      description:
        'Erstellt einen neuen Workflow. Bei vorhandenem schedule wird das Intervall validiert (5min, 15min, 30min, 60min, daily). Nach dem Erstellen wird der Scheduler automatisch synchronisiert. Erfordert die Berechtigung settings.create.',
      requestBody: {
        name: 'Tageszusammenfassung 18:00',
        description: 'Sendet jeden Werktag um 18 Uhr eine KPI-Zusammenfassung.',
        trigger: 'schedule',
        steps: [
          { type: 'collect_metrics', config: {} },
          { type: 'send_email', config: { template: 'daily_summary' } },
        ],
        schedule: { interval: 'daily', dailyAt: '18:00' },
        isActive: true,
      },
      response: {
        success: true,
        data: {
          id: 'wf-2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
          name: 'Tageszusammenfassung 18:00',
          trigger: 'schedule',
          schedule: { interval: 'daily', dailyAt: '18:00' },
          isActive: true,
          createdAt: '2026-05-12T07:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/workflows \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Tageszusammenfassung 18:00","trigger":"schedule","steps":[],"schedule":{"interval":"daily","dailyAt":"18:00"},"isActive":true}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/workflows/{id}',
      summary: 'Workflow-Details abrufen',
      description:
        'Gibt die Detail-Konfiguration eines einzelnen Workflows zurueck. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          name: 'Lead Follow-Up nach 24h',
          trigger: 'contact.submitted',
          steps: [
            { type: 'wait', config: { hours: 24 } },
            { type: 'send_email', config: { template: 'lead_followup' } },
          ],
          schedule: null,
          isActive: true,
        },
      },
      curl: `curl https://example.com/api/v1/workflows/wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/workflows/{id}',
      summary: 'Workflow aktualisieren',
      description:
        'Aktualisiert einzelne Felder eines Workflows (partial update). Validiert schedule wenn mitgesendet. Synchronisiert anschliessend den Scheduler. Erfordert die Berechtigung settings.update.',
      requestBody: {
        name: 'Lead Follow-Up nach 48h',
        steps: [
          { type: 'wait', config: { hours: 48 } },
          { type: 'send_email', config: { template: 'lead_followup_v2' } },
        ],
        isActive: false,
      },
      response: {
        success: true,
        data: {
          id: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          name: 'Lead Follow-Up nach 48h',
          isActive: false,
          updatedAt: '2026-05-12T08:30:00.000Z',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/workflows/wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Lead Follow-Up nach 48h","isActive":false}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/workflows/{id}',
      summary: 'Workflow loeschen',
      description:
        'Loescht einen Workflow dauerhaft und entfernt zugehoerige Schedules. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/workflows/wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/workflows/{id}/runs',
      summary: 'Workflow-Runs auflisten',
      description:
        'Listet die letzten 50 Ausfuehrungen (Runs) eines Workflows in absteigender Reihenfolge nach Startzeit. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            id: 'run-9f8e7d6c-5b4a-3c2d-1e0f-9a8b7c6d5e4f',
            workflowId: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            status: 'completed',
            startedAt: '2026-05-12T06:00:00.000Z',
            finishedAt: '2026-05-12T06:00:12.000Z',
            stepResults: [{ step: 'send_email', status: 'ok' }],
          },
        ],
      },
      curl: `curl https://example.com/api/v1/workflows/wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/runs \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/workflows/actions',
      summary: 'Verfuegbare Workflow-Actions',
      description:
        'Listet alle im System registrierten Workflow-Action-Typen mit Label, Beschreibung, Kategorie, Icon und Konfigurations-Feldern. Wird vom UI fuer den Step-Editor genutzt. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            name: 'send_email',
            label: 'E-Mail senden',
            description: 'Versendet eine E-Mail anhand eines Templates.',
            category: 'communication',
            icon: 'mail',
            configFields: [
              { name: 'template', type: 'string', required: true },
              { name: 'to', type: 'string', required: false },
            ],
          },
          {
            name: 'wait',
            label: 'Warten',
            description: 'Pausiert den Workflow fuer eine definierte Zeit.',
            category: 'flow',
            icon: 'clock',
            configFields: [{ name: 'hours', type: 'number', required: true }],
          },
        ],
      },
      curl: `curl https://example.com/api/v1/workflows/actions \\
  -b cookies.txt`,
    },
  ],
}

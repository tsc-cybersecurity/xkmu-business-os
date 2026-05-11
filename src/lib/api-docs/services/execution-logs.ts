import type { ApiService } from '../types'

export const executionLogsService: ApiService = {
  name: 'Execution-Logs',
  slug: 'execution-logs',
  description:
    'Revisionssicheres Ausfuehrungs-Log fuer Prozesse, Workflows und Jobs. Erfasst entityType, entityId, executedBy (system/user/cron/workflow) und status (success/failed/...). Endpunkte erfordern eine aktive Session und processes-Berechtigung.',
  basePath: '/api/v1/execution-logs',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/execution-logs',
      summary: 'Execution-Logs auflisten',
      description:
        'Listet Ausfuehrungs-Log-Eintraege gefiltert nach Entity und Status. Pagination via limit (max 100) und offset. Erfordert die Berechtigung processes.read.',
      params: [
        { name: 'entity_type', in: 'query', required: false, type: 'string', description: 'Entitaets-Typ (z.B. workflow, cron_job)', example: 'workflow' },
        { name: 'entity_id', in: 'query', required: false, type: 'string', description: 'UUID der Entitaet', example: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'success | failed | running', example: 'failed' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (max 100, default 20)', example: '20' },
        { name: 'offset', in: 'query', required: false, type: 'number', description: 'Offset fuer Pagination', example: '0' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'el-7a8b9c0d-1e2f-3a4b-5c6d-7e8f90123456',
            entityType: 'workflow',
            entityId: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            executedBy: 'cron',
            status: 'success',
            durationMs: 412,
            payload: { stepsRun: 3 },
            createdAt: '2026-05-12T06:00:12.000Z',
          },
        ],
      },
      curl: `curl 'https://example.com/api/v1/execution-logs?entity_type=workflow&status=failed&limit=50' \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/execution-logs',
      summary: 'Execution-Log-Eintrag erstellen',
      description:
        'Legt einen neuen Log-Eintrag an. Felder entityType, entityId, executedBy und status sind Pflicht und werden gegen Enum-Werte validiert (ENTITY_TYPE_ENUM, EXECUTED_BY_ENUM, EXECUTION_STATUS_ENUM). Erfordert die Berechtigung processes.create.',
      requestBody: {
        entityType: 'workflow',
        entityId: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
        executedBy: 'user',
        status: 'success',
        durationMs: 387,
        payload: { triggeredBy: 'manual-run', stepsRun: 2 },
      },
      response: {
        success: true,
        data: {
          id: 'el-8b9c0d1e-2f3a-4b5c-6d7e-8f9012345678',
          entityType: 'workflow',
          entityId: 'wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          executedBy: 'user',
          status: 'success',
          createdAt: '2026-05-12T09:15:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/execution-logs \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"entityType":"workflow","entityId":"wf-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d","executedBy":"user","status":"success"}'`,
    },
  ],
}

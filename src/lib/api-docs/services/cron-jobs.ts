import type { ApiService } from '../types'

export const cronJobsService: ApiService = {
  name: 'Cron-Jobs',
  slug: 'cron-jobs',
  description:
    'Geplante Jobs (Cron) mit fixem Intervall (5min/15min/30min/60min) oder taeglicher Ausfuehrung zu einer Uhrzeit. Der Tick-Endpunkt wird ueber einen externen Scheduler (z.B. Vercel Cron) periodisch aufgerufen. Bis auf tick erfordern alle Endpunkte eine aktive Session und settings-Berechtigung.',
  basePath: '/api/v1/cron-jobs',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/cron-jobs',
      summary: 'Cron-Jobs auflisten',
      description:
        'Listet alle definierten Cron-Jobs. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            id: 'cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012',
            name: 'Mahnungen pruefen',
            description: 'Sucht ueberfaellige Rechnungen und legt Mahn-Tasks an.',
            interval: 'daily',
            dailyAt: '08:00',
            actionType: 'check_overdue_invoices',
            actionConfig: { daysThreshold: 14 },
            isActive: true,
            lastRunAt: '2026-05-12T08:00:03.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/cron-jobs \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cron-jobs',
      summary: 'Cron-Job erstellen',
      description:
        'Legt einen neuen Cron-Job an. Erfordert die Berechtigung settings.create.',
      requestBody: {
        name: 'Token-Refresh Social Accounts',
        description: 'Refresht ablaufende OAuth-Tokens fuer Social-Accounts.',
        interval: '60min',
        actionType: 'refresh_social_tokens',
        actionConfig: { providers: ['meta', 'linkedin'] },
        isActive: true,
      },
      response: {
        success: true,
        data: {
          id: 'cj-6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f901234',
          name: 'Token-Refresh Social Accounts',
          interval: '60min',
          isActive: true,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/cron-jobs \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Token-Refresh Social Accounts","interval":"60min","actionType":"refresh_social_tokens","isActive":true}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/cron-jobs/{id}',
      summary: 'Cron-Job-Details abrufen',
      description:
        'Liefert Details zu einem einzelnen Cron-Job. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 'cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012',
          name: 'Mahnungen pruefen',
          interval: 'daily',
          dailyAt: '08:00',
          isActive: true,
        },
      },
      curl: `curl https://example.com/api/v1/cron-jobs/cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cron-jobs/{id}',
      summary: 'Cron-Job aktualisieren',
      description:
        'Aktualisiert Felder eines Cron-Jobs. Erfordert die Berechtigung settings.update.',
      requestBody: {
        dailyAt: '09:30',
        isActive: false,
      },
      response: {
        success: true,
        data: {
          id: 'cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012',
          dailyAt: '09:30',
          isActive: false,
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/cron-jobs/cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"dailyAt":"09:30","isActive":false}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/cron-jobs/{id}',
      summary: 'Cron-Job loeschen',
      description:
        'Loescht einen Cron-Job dauerhaft. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/cron-jobs/cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cron-jobs/{id}/run',
      summary: 'Cron-Job manuell ausfuehren',
      description:
        'Fuehrt einen Cron-Job sofort aus, unabhaengig vom Intervall. Nuetzlich fuer Tests/Manuelle Ausloesung. Erfordert die Berechtigung settings.update.',
      response: {
        success: true,
        data: {
          jobId: 'cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012',
          status: 'success',
          durationMs: 412,
          result: { processed: 7 },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/cron-jobs/cj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012/run \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/cron-jobs/tick',
      summary: 'Cron-Tick (Scheduler-Endpunkt)',
      description:
        'Wird vom externen Scheduler (Vercel Cron o.ae.) periodisch aufgerufen. Fuehrt alle faelligen Cron-Jobs aus. Force-dynamic, maxDuration 60s. Oeffentlich/scheduler-extern (kein withPermission), Schutz durch externe Cron-Konfiguration und Bearer-Header.',
      response: {
        success: true,
        data: { ran: 2, skipped: 5, errors: 0 },
      },
      curl: `curl https://example.com/api/v1/cron-jobs/tick`,
    },
  ],
}

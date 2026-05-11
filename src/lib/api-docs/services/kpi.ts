import type { ApiService } from '../types'

export const kpiService: ApiService = {
  name: 'KPI-Tracking',
  slug: 'kpi',
  description:
    'Aggregiertes KPI-Tracking ueber Vertrieb (Leads), Finanzen (Rechnungen, Umsatz) und Konversion. Liefert Kennzahlen fuer einen frei waehlbaren Zeitraum. Permission: settings (read).',
  basePath: '/api/v1/kpi',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/kpi',
      summary: 'KPI-Kennzahlen fuer Zeitraum abrufen',
      description:
        'Liefert aggregierte Kennzahlen: Neue Leads, gewonnene Leads, Konversionsrate, Umsatz (bezahlte Rechnungen), offene Rechnungen und ueberfaellige Rechnungen. Default-Zeitraum: aktueller Monat plus zwei Monate rueckwirkend. Permission: settings.read.',
      params: [
        { name: 'from', in: 'query', required: false, type: 'string', description: 'Startdatum (ISO 8601). Default: erster Tag vor 2 Monaten.', example: '2026-01-01' },
        { name: 'to', in: 'query', required: false, type: 'string', description: 'Enddatum (ISO 8601). Default: jetzt.', example: '2026-03-31' },
      ],
      response: {
        success: true,
        data: {
          period: { from: '2026-01-01T00:00:00.000Z', to: '2026-03-31T00:00:00.000Z' },
          newLeads: 42,
          wonLeads: 11,
          conversionRate: 26,
          revenue: 87450.5,
          openInvoices: 7,
          overdueInvoices: 2,
        },
      },
      curl: `curl "https://example.com/api/v1/kpi?from=2026-01-01&to=2026-03-31" \\
  -b cookies.txt`,
    },
  ],
}

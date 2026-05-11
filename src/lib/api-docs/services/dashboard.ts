import type { ApiService } from '../types'

export const dashboardService: ApiService = {
  name: 'Dashboard',
  slug: 'dashboard',
  description:
    'Aggregierte Uebersichts-Daten fuer das Haupt-Dashboard: Kennzahlen, Trends, juengste Datensaetze und Status-Verteilungen. Erfordert eine aktive Session.',
  basePath: '/api/v1/dashboard',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/dashboard',
      summary: 'Dashboard-Daten abrufen',
      description:
        'Liefert aggregierte Kennzahlen fuer das Haupt-Dashboard: Anzahl Firmen/Personen/Leads, Aktivitaet der letzten 7 Tage, Konversionsrate, 60-Tage-Trends (Leads/Firmen), juengste Firmen und Personen, offene Leads sowie Firmen-Status-Verteilung. Erfordert eine aktive Session.',
      response: {
        success: true,
        data: {
          stats: {
            companies: 142,
            persons: 387,
            leads: 23,
            activityLast7Days: 56,
          },
          conversionRate: 18,
          trends: {
            leads: [
              { date: '2026-03-13', count: 2 },
              { date: '2026-03-14', count: 1 },
            ],
            companies: [
              { date: '2026-03-13', count: 1 },
              { date: '2026-03-14', count: 0 },
            ],
          },
          recentCompanies: [
            {
              id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              name: 'Mustermann GmbH',
              status: 'customer',
              createdAt: '2026-05-10T08:15:00.000Z',
            },
          ],
          recentPersons: [
            {
              id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              firstName: 'Anna',
              lastName: 'Schmidt',
              email: 'a.schmidt@beispiel-ag.de',
              createdAt: '2026-05-11T09:30:00.000Z',
            },
          ],
          openLeads: [
            {
              id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              source: 'website',
              status: 'qualified',
              score: 75,
              createdAt: '2026-05-09T11:42:00.000Z',
              contactCompany: 'Weber Consulting GmbH',
              companyName: 'Weber Consulting GmbH',
            },
          ],
          companyStatuses: [
            { status: 'customer', count: 87 },
            { status: 'lead', count: 32 },
            { status: 'prospect', count: 23 },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/dashboard \\
  -b cookies.txt`,
    },
  ],
}

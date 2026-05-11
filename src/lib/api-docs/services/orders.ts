import type { ApiService } from '../types'

export const ordersService: ApiService = {
  name: 'Bestellungen (Admin-Auftraege)',
  slug: 'orders',
  description:
    'Admin-Verwaltung der Portal-Auftraege (Kunden-Bestellungen aus dem Portal). Listet Auftraege mit Filtern und unterstuetzt Status-Uebergaenge (accept/start/complete/reject) sowie Bearbeiter-Zuweisung. Alle Aktionen werden im Audit-Log protokolliert; Status-Wechsel triggern eine Kundenbenachrichtigung per E-Mail-Queue. Permission-Modul: users.',
  basePath: '/api/v1/orders',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/orders',
      summary: 'Auftraege auflisten',
      description:
        'Listet Auftraege mit Filtern (status komma-separiert moeglich, priority, categoryId, companyId, assignedTo) und Pagination (limit max 500, offset). Sortiert nach createdAt absteigend. Permission: users.read.',
      params: [
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status (komma-separiert: pending,accepted,in_progress)' },
        { name: 'priority', in: 'query', required: false, type: 'string', description: 'Prioritaet (low|normal|high|urgent)' },
        { name: 'categoryId', in: 'query', required: false, type: 'uuid', description: 'Kategorie-ID' },
        { name: 'companyId', in: 'query', required: false, type: 'uuid', description: 'Firmen-ID' },
        { name: 'assignedTo', in: 'query', required: false, type: 'uuid', description: 'Bearbeiter-User-ID' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'max 500, default 100' },
        { name: 'offset', in: 'query', required: false, type: 'number', description: 'default 0' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Neue Domain einrichten',
            status: 'pending',
            priority: 'normal',
            companyName: 'Weber Consulting GmbH',
            categoryName: 'Hosting',
            categoryColor: '#3B82F6',
            createdAt: '2026-05-10T08:00:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/orders?status=pending,accepted&limit=50" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/orders/{id}',
      summary: 'Auftrag-Detail abrufen',
      description: 'Liefert einen Auftrag inkl. Joins (Kategorie, Firma, Antragsteller, Vertrag, Projekt). Permission: users.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Auftrags-ID' }],
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          title: 'Neue Domain einrichten',
          description: 'Bitte richtet die Domain weber-consulting.de mit SSL ein.',
          status: 'pending',
          priority: 'normal',
          companyName: 'Weber Consulting GmbH',
          requestedByEmail: 'lisa@weber-consulting.de',
          createdAt: '2026-05-10T08:00:00.000Z',
        },
      },
      curl: `curl https://example.com/api/v1/orders/o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/orders/{id}',
      summary: 'Auftrags-Aktion ausfuehren',
      description:
        'Fuehrt eine Aktion auf einem Auftrag aus. Aktionen: accept | start | complete | reject (mit rejectReason) | assign (mit assignedTo). Status-Uebergaenge sind in OrderService.transitionStatus definiert (INVALID_TRANSITION -> 409). API-Keys duerfen diese Aktion NICHT ausfuehren (403 FORBIDDEN). Schreibt Audit-Log und triggert E-Mail-Benachrichtigung an den Antragsteller. Permission: users.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Auftrags-ID' }],
      requestBody: { action: 'accept' },
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          status: 'accepted',
          acceptedAt: '2026-05-12T09:15:00.000Z',
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/orders/o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"action":"reject","rejectReason":"Auftrag ausserhalb des Service-Scopes"}'`,
    },
  ],
}

import type { ApiService } from '../types'

export const elearningService: ApiService = {
  name: 'E-Learning Reports',
  slug: 'elearning',
  description:
    'Kursuebergreifende Auswertungen fuer das E-Learning (z.B. Compliance-Overview ueber alle zugewiesenen Kurse). Ergaenzt die Onlinekurs-Endpunkte um zentrale Reports. Erfordert eine aktive Session und Berechtigung courses:read.',
  basePath: '/api/v1/elearning',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/elearning/reports/compliance',
      summary: 'Compliance-Report (kursuebergreifend)',
      description:
        'Kursuebergreifende Compliance-Auswertung ueber alle zugewiesenen Kurse: pro Teilnehmer Kurs, Frist, Status, Fortschritt und Gruppenzugehoerigkeit. Optional filterbar nach Gruppe. Mit format=csv wird eine UTF-8-CSV-Datei zum Download geliefert. Erfordert Berechtigung courses:read.',
      params: [
        { name: 'groupId', in: 'query', required: false, type: 'uuid', description: 'Auf eine Benutzergruppe filtern' },
        { name: 'format', in: 'query', required: false, type: 'string', description: 'csv fuer CSV-Download, sonst JSON' },
      ],
      response: {
        success: true,
        data: [
          {
            userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Max Mustermann',
            email: 'max@mustermann-gmbh.de',
            courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseTitle: 'Einfuehrung in KI-Beratung',
            dueDate: '2026-06-30',
            status: 'in_progress',
            percentage: 50,
            completedLessons: 4,
            totalLessons: 8,
            groupNames: ['Vertrieb', 'Pilot-Gruppe'],
          },
        ],
      },
      curl: `curl 'https://example.com/api/v1/elearning/reports/compliance?groupId=gr1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6&format=csv' \\
  -b cookies.txt \\
  -o elearning-compliance.csv`,
    },
  ],
}

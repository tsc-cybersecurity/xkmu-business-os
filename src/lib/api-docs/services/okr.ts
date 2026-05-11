import type { ApiService } from '../types'

export const okrService: ApiService = {
  name: 'OKR-Tracking',
  slug: 'okr',
  description:
    'OKR-Management (Objectives & Key Results): Zyklen, Objectives, Key Results und Check-ins. Permission: processes (read/create/update/delete).',
  basePath: '/api/v1/okr',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/okr/cycles',
      summary: 'OKR-Zyklen auflisten',
      description:
        'Listet alle OKR-Zyklen (z.B. Quartale) auf. Permission: processes.read.',
      response: {
        success: true,
        data: [
          {
            id: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Q2 2026',
            startDate: '2026-04-01',
            endDate: '2026-06-30',
            status: 'active',
            createdAt: '2026-03-25T09:00:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/okr/cycles \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/okr/cycles',
      summary: 'OKR-Zyklus anlegen',
      description:
        'Legt einen neuen OKR-Zyklus an (z.B. Quartal oder Halbjahr). Permission: processes.create.',
      requestBody: {
        name: 'Q3 2026',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        status: 'planned',
      },
      response: {
        success: true,
        data: {
          id: 'cy2a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Q3 2026',
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          status: 'planned',
          createdAt: '2026-05-11T10:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/okr/cycles \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Q3 2026","startDate":"2026-07-01","endDate":"2026-09-30","status":"planned"}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/okr/cycles/{id}',
      summary: 'OKR-Zyklus aktualisieren',
      description:
        'Aktualisiert Name, Zeitraum oder Status eines OKR-Zyklus. Permission: processes.update.',
      requestBody: {
        name: 'Q2 2026 (revidiert)',
        status: 'active',
      },
      response: {
        success: true,
        data: {
          id: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Q2 2026 (revidiert)',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          status: 'active',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/okr/cycles/cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Q2 2026 (revidiert)","status":"active"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/okr/cycles/{id}',
      summary: 'OKR-Zyklus loeschen',
      description:
        'Loescht einen OKR-Zyklus inkl. zugehoeriger Objectives. Permission: processes.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/okr/cycles/cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/okr/objectives',
      summary: 'Objectives auflisten',
      description:
        'Listet Objectives auf, optional gefiltert per cycleId. Permission: processes.read.',
      params: [
        { name: 'cycleId', in: 'query', required: false, type: 'string', description: 'UUID des Zyklus', example: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            cycleId: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'Marktposition als KI-Spezialist im KMU-Segment ausbauen',
            description: 'Sichtbarkeit erhoehen, Pipeline staerken',
            ownerId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            progress: 35,
            status: 'on_track',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/okr/objectives?cycleId=cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/okr/objectives',
      summary: 'Objective anlegen',
      description:
        'Legt ein neues Objective innerhalb eines Zyklus an. Permission: processes.create.',
      requestBody: {
        cycleId: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        title: 'Marktposition als KI-Spezialist im KMU-Segment ausbauen',
        description: 'Sichtbarkeit erhoehen, Pipeline staerken',
        ownerId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          cycleId: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Marktposition als KI-Spezialist im KMU-Segment ausbauen',
          progress: 0,
          status: 'on_track',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/okr/objectives \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"cycleId":"cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6","title":"Marktposition als KI-Spezialist im KMU-Segment ausbauen","ownerId":"u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/okr/objectives/{id}',
      summary: 'Objective aktualisieren',
      description:
        'Aktualisiert Felder eines Objective (Titel, Beschreibung, Owner, Status). Permission: processes.update.',
      requestBody: {
        title: 'Marktposition als KI-Spezialist staerken',
        status: 'at_risk',
      },
      response: {
        success: true,
        data: {
          id: 'ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Marktposition als KI-Spezialist staerken',
          status: 'at_risk',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/okr/objectives/ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Marktposition als KI-Spezialist staerken","status":"at_risk"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/okr/objectives/{id}',
      summary: 'Objective loeschen',
      description:
        'Loescht ein Objective inkl. aller zugehoerigen Key Results und Check-ins. Permission: processes.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/okr/objectives/ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/okr/objectives/{id}/kr',
      summary: 'Key Result zu Objective hinzufuegen',
      description:
        'Fuegt einem Objective einen neuen Key Result mit Start-/Zielwert hinzu. Permission: processes.create.',
      requestBody: {
        title: '20 Leads aus Branche "Maschinenbau" generieren',
        unit: 'Leads',
        startValue: 0,
        targetValue: 20,
        currentValue: 0,
      },
      response: {
        success: true,
        data: {
          id: 'kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          objectiveId: 'ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: '20 Leads aus Branche "Maschinenbau" generieren',
          unit: 'Leads',
          startValue: 0,
          targetValue: 20,
          currentValue: 0,
          progress: 0,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/okr/objectives/ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6/kr \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"20 Leads aus Branche Maschinenbau generieren","unit":"Leads","startValue":0,"targetValue":20,"currentValue":0}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/okr/kr/{id}',
      summary: 'Key Result aktualisieren',
      description:
        'Aktualisiert Felder eines Key Result (Titel, Werte, Status). Permission: processes.update.',
      requestBody: {
        currentValue: 7,
        status: 'on_track',
      },
      response: {
        success: true,
        data: {
          id: 'kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          currentValue: 7,
          progress: 35,
          status: 'on_track',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/okr/kr/kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"currentValue":7,"status":"on_track"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/okr/kr/{id}',
      summary: 'Key Result loeschen',
      description:
        'Loescht einen Key Result inkl. seiner Check-ins. Permission: processes.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/okr/kr/kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/okr/kr/{id}/checkin',
      summary: 'Check-ins eines Key Result auflisten',
      description:
        'Listet alle Check-ins (Fortschritts-Updates) zu einem Key Result auf. Permission: processes.read.',
      response: {
        success: true,
        data: [
          {
            id: 'ci1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            keyResultId: 'kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            value: 7,
            comment: 'Drei Leads aus Hannover-Messe, vier ueber Webinar',
            createdBy: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            createdAt: '2026-05-09T16:30:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/okr/kr/kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6/checkin \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/okr/kr/{id}/checkin',
      summary: 'Check-in zu Key Result anlegen',
      description:
        'Legt einen neuen Check-in (Fortschritts-Update) fuer einen Key Result an. createdBy wird automatisch aus der Session uebernommen. Permission: processes.create.',
      requestBody: {
        value: 7,
        comment: 'Drei Leads aus Hannover-Messe, vier ueber Webinar',
      },
      response: {
        success: true,
        data: {
          id: 'ci1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          keyResultId: 'kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          value: 7,
          comment: 'Drei Leads aus Hannover-Messe, vier ueber Webinar',
          createdBy: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          createdAt: '2026-05-11T10:30:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/okr/kr/kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6/checkin \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"value":7,"comment":"Drei Leads aus Hannover-Messe, vier ueber Webinar"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/okr/dashboard',
      summary: 'OKR-Dashboard-Daten abrufen',
      description:
        'Aggregierte Sicht ueber aktiven Zyklus, Objectives mit Fortschritt, Key Results und Status-Verteilung. Permission: processes.read.',
      response: {
        success: true,
        data: {
          activeCycle: {
            id: 'cy1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Q2 2026',
            startDate: '2026-04-01',
            endDate: '2026-06-30',
          },
          objectives: [
            {
              id: 'ob1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              title: 'Marktposition als KI-Spezialist im KMU-Segment ausbauen',
              progress: 35,
              status: 'on_track',
              keyResults: [
                { id: 'kr1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: '20 Leads aus Maschinenbau', progress: 35 },
              ],
            },
          ],
          summary: { onTrack: 2, atRisk: 1, offTrack: 0 },
        },
      },
      curl: `curl https://example.com/api/v1/okr/dashboard \\
  -b cookies.txt`,
    },
  ],
}

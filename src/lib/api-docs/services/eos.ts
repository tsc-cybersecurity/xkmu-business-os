import type { ApiService } from '../types'

export const eosService: ApiService = {
  name: 'EOS (Entrepreneurial Operating System)',
  slug: 'eos',
  description:
    'Internes EOS-Modul fuer Unternehmensfuehrung nach Traction-Methodik: quartalsweise Rocks (Ziele), Issues (zu loesende Themen), Level-10 Meetings, wochenbasierte Scorecard-Metriken und das Vision/Traction Organizer (VTO) Dokument. Alle Endpunkte erfordern Berechtigung im Modul "processes".',
  basePath: '/api/v1/eos',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/eos/rocks',
      summary: 'Rocks auflisten',
      description: 'Liefert alle Quartals-Rocks (90-Tage-Ziele), optional gefiltert nach Quartal. Erfordert Berechtigung "processes.read".',
      params: [
        { name: 'quarter', in: 'query', required: false, type: 'string', description: 'Quartal im Format "YYYY-Q#"', example: '2026-Q2' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'rock-1111-2222-3333-4444-555555555555',
            quarter: '2026-Q2',
            title: 'Neue Marketing-Pipeline live schalten',
            owner: 'Tino Stenzel',
            status: 'on-track',
            progress: 60,
            dueDate: '2026-06-30',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/eos/rocks?quarter=2026-Q2" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/eos/rocks',
      summary: 'Rock erstellen',
      description: 'Legt ein neues Quartals-Rock an. Erfordert Berechtigung "processes.create".',
      requestBody: {
        quarter: '2026-Q2',
        title: 'Onboarding-Flow auf 5 Min reduzieren',
        owner: 'Tino Stenzel',
        dueDate: '2026-06-30',
        status: 'on-track',
      },
      response: {
        success: true,
        data: { id: 'rock-9999-8888-7777-6666-555555555555', title: 'Onboarding-Flow auf 5 Min reduzieren' },
      },
      curl: `curl -X POST https://example.com/api/v1/eos/rocks \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"quarter":"2026-Q2","title":"Onboarding-Flow auf 5 Min reduzieren","owner":"Tino Stenzel","dueDate":"2026-06-30"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/eos/rocks/{id}',
      summary: 'Rock abrufen',
      description: 'Liefert ein einzelnes Rock inkl. Detail-Notizen. Erfordert Berechtigung "processes.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rock-ID (UUID)', example: 'rock-1111-2222-3333-4444-555555555555' },
      ],
      response: {
        success: true,
        data: { id: 'rock-1111-2222-3333-4444-555555555555', title: 'Neue Marketing-Pipeline live schalten', progress: 60 },
      },
      curl: `curl https://example.com/api/v1/eos/rocks/rock-1111-2222-3333-4444-555555555555 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/eos/rocks/{id}',
      summary: 'Rock aktualisieren',
      description: 'Aktualisiert Titel, Owner, Status, Fortschritt oder Faelligkeit eines Rocks. Erfordert Berechtigung "processes.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rock-ID (UUID)', example: 'rock-1111-2222-3333-4444-555555555555' },
      ],
      requestBody: {
        progress: 80,
        status: 'on-track',
      },
      response: {
        success: true,
        data: { id: 'rock-1111-2222-3333-4444-555555555555', progress: 80, status: 'on-track' },
      },
      curl: `curl -X PUT https://example.com/api/v1/eos/rocks/rock-1111-2222-3333-4444-555555555555 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"progress":80,"status":"on-track"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/eos/rocks/{id}',
      summary: 'Rock loeschen',
      description: 'Loescht ein Rock unwiderruflich. Erfordert Berechtigung "processes.delete".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Rock-ID (UUID)', example: 'rock-1111-2222-3333-4444-555555555555' },
      ],
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/eos/rocks/rock-1111-2222-3333-4444-555555555555 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/eos/issues',
      summary: 'Issues auflisten',
      description: 'Liefert alle EOS-Issues (zu loesende Themen). Optional nach Status filterbar (open, solved, dropped). Erfordert Berechtigung "processes.read".',
      params: [
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filter nach Status', example: 'open' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'iss-1234-5678-9abc-def012345678',
            title: 'Conversion-Rate auf Pricing-Page faellt',
            status: 'open',
            priority: 'high',
            createdAt: '2026-05-04T09:30:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/eos/issues?status=open" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/eos/issues',
      summary: 'Issue erstellen',
      description: 'Legt ein neues Issue an. createdBy wird automatisch aus der Session uebernommen. Erfordert Berechtigung "processes.create".',
      requestBody: {
        title: 'Onboarding-Mail wird nicht zugestellt',
        description: 'In den letzten 7 Tagen 4 Beschwerden eingegangen.',
        priority: 'high',
      },
      response: {
        success: true,
        data: { id: 'iss-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee', title: 'Onboarding-Mail wird nicht zugestellt', status: 'open' },
      },
      curl: `curl -X POST https://example.com/api/v1/eos/issues \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Onboarding-Mail wird nicht zugestellt","priority":"high"}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/eos/issues/{id}',
      summary: 'Issue aktualisieren',
      description: 'Aktualisiert ein Issue (z. B. Status auf "solved" setzen). Erfordert Berechtigung "processes.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Issue-ID (UUID)', example: 'iss-1234-5678-9abc-def012345678' },
      ],
      requestBody: {
        status: 'solved',
        resolution: 'SMTP-Throttling angepasst, Tests gruen.',
      },
      response: {
        success: true,
        data: { id: 'iss-1234-5678-9abc-def012345678', status: 'solved' },
      },
      curl: `curl -X PUT https://example.com/api/v1/eos/issues/iss-1234-5678-9abc-def012345678 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"solved"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/eos/issues/{id}',
      summary: 'Issue loeschen',
      description: 'Loescht ein Issue unwiderruflich. Erfordert Berechtigung "processes.delete".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Issue-ID (UUID)', example: 'iss-1234-5678-9abc-def012345678' },
      ],
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/eos/issues/iss-1234-5678-9abc-def012345678 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/eos/meetings',
      summary: 'Meetings auflisten',
      description: 'Liefert alle Level-10 Meetings inkl. Agenda und Notizen. Erfordert Berechtigung "processes.read".',
      response: {
        success: true,
        data: [
          {
            id: 'mtg-2026-05-11',
            date: '2026-05-11',
            type: 'level-10',
            participants: ['Tino Stenzel', 'Lisa Weber'],
            durationMinutes: 90,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/eos/meetings \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/eos/meetings',
      summary: 'Meeting erstellen',
      description: 'Legt ein neues Meeting an. Erfordert Berechtigung "processes.create".',
      requestBody: {
        date: '2026-05-18',
        type: 'level-10',
        participants: ['Tino Stenzel', 'Lisa Weber'],
        agenda: ['Segue', 'Scorecard Review', 'Rock Review', 'IDS'],
      },
      response: {
        success: true,
        data: { id: 'mtg-2026-05-18', date: '2026-05-18' },
      },
      curl: `curl -X POST https://example.com/api/v1/eos/meetings \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"date":"2026-05-18","type":"level-10"}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/eos/meetings/{id}',
      summary: 'Meeting aktualisieren',
      description: 'Aktualisiert Notizen, To-dos oder Status eines Meetings. Erfordert Berechtigung "processes.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Meeting-ID', example: 'mtg-2026-05-11' },
      ],
      requestBody: {
        notes: 'Conversion-Issue diskutiert, neuer Rock fuer Q3 vorgemerkt.',
        todos: [{ title: 'A/B-Test Pricing-Page', owner: 'Lisa', due: '2026-05-25' }],
      },
      response: {
        success: true,
        data: { id: 'mtg-2026-05-11', notesUpdated: true },
      },
      curl: `curl -X PUT https://example.com/api/v1/eos/meetings/mtg-2026-05-11 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"notes":"Conversion-Issue diskutiert."}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/eos/scorecard',
      summary: 'Scorecard mit Metriken & Eintraegen',
      description:
        'Liefert alle Scorecard-Metriken inklusive der letzten 13 Wocheneintraege je Metrik. Erfordert Berechtigung "processes.read".',
      response: {
        success: true,
        data: [
          {
            id: 'metric-1234-5678-9abc-def012345678',
            name: 'Wöchentliche neue Leads',
            target: 25,
            owner: 'Tino Stenzel',
            entries: [
              { week: '2026-W18', actual: 27, note: '' },
              { week: '2026-W19', actual: 22, note: 'Feiertag' },
            ],
          },
        ],
      },
      curl: `curl https://example.com/api/v1/eos/scorecard \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/eos/scorecard',
      summary: 'Metrik oder Wocheneintrag anlegen',
      description:
        'Polymorpher Endpoint: ohne action wird eine neue Metrik angelegt. Mit action="entry" wird ein Wocheneintrag (metricId, week, actual, note) upsertet. Erfordert Berechtigung "processes.create".',
      requestBody: {
        action: 'entry',
        metricId: 'metric-1234-5678-9abc-def012345678',
        week: '2026-W19',
        actual: 22,
        note: 'Feiertagswoche',
      },
      response: {
        success: true,
        data: {
          metricId: 'metric-1234-5678-9abc-def012345678',
          week: '2026-W19',
          actual: 22,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/eos/scorecard \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"action":"entry","metricId":"metric-1234-5678-9abc-def012345678","week":"2026-W19","actual":22}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/eos/vto',
      summary: 'Vision/Traction Organizer abrufen',
      description: 'Liefert das Vision/Traction Organizer Dokument (Kernwerte, Kernfokus, 10-Jahres-Ziel, Marketing-Strategie, 3-Jahres-Bild, 1-Jahres-Plan). Erfordert Berechtigung "processes.read".',
      response: {
        success: true,
        data: {
          coreValues: ['Pragmatismus', 'Kundennaehe', 'Transparenz'],
          coreFocus: { purpose: 'KMU operativ entlasten', niche: 'AI-gestuetzte Business-OS fuer Mittelstand' },
          tenYearTarget: '10.000 KMU als Kunden',
          marketingStrategy: { targetMarket: 'DACH-KMU 10-200 MA', threeUniques: ['All-in-one', 'AI-first', 'Made in Germany'] },
          threeYearPicture: { revenue: '5 Mio EUR ARR', employees: 25 },
          oneYearPlan: { revenue: '1.2 Mio EUR ARR', goals: ['Workflow-Engine GA', 'Multi-Tenant'] },
        },
      },
      curl: `curl https://example.com/api/v1/eos/vto \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/eos/vto',
      summary: 'Vision/Traction Organizer aktualisieren',
      description: 'Upsertet das VTO-Dokument. Die User-ID des Bearbeiters wird automatisch aus der Session uebernommen. Erfordert Berechtigung "processes.update".',
      requestBody: {
        coreValues: ['Pragmatismus', 'Kundennaehe', 'Transparenz', 'Geschwindigkeit'],
        tenYearTarget: '10.000 KMU als Kunden',
        oneYearPlan: { revenue: '1.5 Mio EUR ARR' },
      },
      response: {
        success: true,
        data: { updatedAt: '2026-05-11T15:22:08.001Z' },
      },
      curl: `curl -X PUT https://example.com/api/v1/eos/vto \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"coreValues":["Pragmatismus","Kundennaehe"],"tenYearTarget":"10.000 KMU"}'`,
    },
  ],
}

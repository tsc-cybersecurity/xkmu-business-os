import type { ApiService } from '../types'

export const availabilityService: ApiService = {
  name: 'Verfuegbarkeit',
  slug: 'availability',
  description:
    'Konfiguration der Buchungs-Verfuegbarkeit pro Mitarbeiter: wiederkehrende Wochenregeln (rules) und punktuelle Ausnahmen (overrides) fuer Urlaub, Sondertermine oder zusaetzlich freigegebene Zeiten. Plus Diagnose-Endpoint zum Debuggen des Verfuegbarkeits-Renderings.',
  basePath: '/api/v1/availability',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/availability/rules',
      summary: 'Wochenregeln auflisten',
      description:
        'Listet alle wiederkehrenden Verfuegbarkeitsregeln (z.B. "Mo 09:00-17:00") des aktuell eingeloggten Mitarbeiters. Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          rules: [
            {
              id: 'rule-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
              userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '17:00',
              isActive: true,
              createdAt: '2026-01-15T10:00:00.000Z',
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/availability/rules \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/availability/rules',
      summary: 'Wochenregel anlegen',
      description:
        'Erstellt eine neue wiederkehrende Verfuegbarkeitsregel fuer den aktuellen Mitarbeiter. dayOfWeek 0=Sonntag bis 6=Samstag. endTime muss strikt groesser als startTime sein. Erfordert Permission appointments.create.',
      requestBody: {
        dayOfWeek: 2,
        startTime: '08:30',
        endTime: '12:30',
        isActive: true,
      },
      response: {
        success: true,
        data: {
          rule: {
            id: 'rule-9f8e7d6c-5b4a-3210-fedc-ba9876543210',
            userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            dayOfWeek: 2,
            startTime: '08:30',
            endTime: '12:30',
            isActive: true,
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/availability/rules \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"dayOfWeek":2,"startTime":"08:30","endTime":"12:30","isActive":true}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/availability/rules/{id}',
      summary: 'Wochenregel aktualisieren',
      description:
        'Aktualisiert eine bestehende Wochenregel des aktuellen Mitarbeiters. Partial Update — nur uebergebene Felder werden geaendert. Cross-Field-Check stellt sicher, dass die effektive endTime > startTime ist. Erfordert Permission appointments.update.',
      requestBody: {
        endTime: '18:00',
        isActive: true,
      },
      response: {
        success: true,
        data: {
          rule: {
            id: 'rule-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '18:00',
            isActive: true,
          },
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/availability/rules/rule-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"endTime":"18:00","isActive":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/availability/rules/{id}',
      summary: 'Wochenregel loeschen',
      description:
        'Entfernt eine Wochenregel permanent. Pruefen Owner-Match (Regel muss dem aktuellen Mitarbeiter gehoeren). Erfordert Permission appointments.delete.',
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/availability/rules/rule-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/availability/overrides',
      summary: 'Ausnahmen auflisten',
      description:
        'Listet punktuelle Verfuegbarkeits-Ausnahmen (Urlaub, Sondertermine) des aktuellen Mitarbeiters. Optional gefiltert via Query-Parameter from/to (ISO 8601). Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          overrides: [
            {
              id: 'ovr-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
              userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
              startAt: '2026-08-01T00:00:00.000Z',
              endAt: '2026-08-15T23:59:59.000Z',
              kind: 'block',
              reason: 'Sommerurlaub',
            },
          ],
        },
      },
      curl: `curl "https://example.com/api/v1/availability/overrides?from=2026-08-01T00:00:00Z&to=2026-08-31T23:59:59Z" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/availability/overrides',
      summary: 'Ausnahme anlegen',
      description:
        'Erstellt eine punktuelle Ausnahme: kind="free" gibt zusaetzliche Zeiten frei (z.B. Samstag-Sondertermin), kind="block" sperrt geplante Verfuegbarkeit (z.B. Urlaub). endAt muss nach startAt liegen. Erfordert Permission appointments.create.',
      requestBody: {
        startAt: '2026-08-01T00:00:00.000Z',
        endAt: '2026-08-15T23:59:59.000Z',
        kind: 'block',
        reason: 'Sommerurlaub',
      },
      response: {
        success: true,
        data: {
          override: {
            id: 'ovr-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
            userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            startAt: '2026-08-01T00:00:00.000Z',
            endAt: '2026-08-15T23:59:59.000Z',
            kind: 'block',
            reason: 'Sommerurlaub',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/availability/overrides \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"startAt":"2026-08-01T00:00:00.000Z","endAt":"2026-08-15T23:59:59.000Z","kind":"block","reason":"Sommerurlaub"}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/availability/overrides/{id}',
      summary: 'Ausnahme aktualisieren',
      description:
        'Aktualisiert eine bestehende Ausnahme partial. Bei gleichzeitigem Setzen von startAt/endAt wird die Reihenfolge geprueft (endAt > startAt). Erfordert Permission appointments.update und Owner-Match.',
      requestBody: {
        endAt: '2026-08-22T23:59:59.000Z',
        reason: 'Sommerurlaub (verlaengert)',
      },
      response: {
        success: true,
        data: {
          override: {
            id: 'ovr-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
            startAt: '2026-08-01T00:00:00.000Z',
            endAt: '2026-08-22T23:59:59.000Z',
            kind: 'block',
            reason: 'Sommerurlaub (verlaengert)',
          },
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/availability/overrides/ovr-aa11bb22-cc33-dd44-ee55-ff66aabbccdd \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"endAt":"2026-08-22T23:59:59.000Z","reason":"Sommerurlaub (verlaengert)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/availability/overrides/{id}',
      summary: 'Ausnahme loeschen',
      description:
        'Entfernt eine Ausnahme permanent. Pruefen Owner-Match (Override muss dem aktuellen Mitarbeiter gehoeren). Erfordert Permission appointments.delete.',
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/availability/overrides/ovr-aa11bb22-cc33-dd44-ee55-ff66aabbccdd \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/availability/diagnose',
      summary: 'Diagnose der Verfuegbarkeitsdaten',
      description:
        'Diagnose-Endpoint fuer Render-Bugs. Liefert die rohen Wochenregeln plus alle Overrides der letzten 7 und naechsten 30 Tage so wie sie in der DB liegen. Hilfreich, um Diskrepanzen zwischen UI und gespeicherten Werten zu finden. Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
          now: '2026-05-12T08:00:00.000Z',
          rangeFrom: '2026-05-05T08:00:00.000Z',
          rangeTo: '2026-06-11T08:00:00.000Z',
          rules: [
            {
              id: 'rule-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '17:00',
              isActive: true,
              createdAt: '2026-01-15T10:00:00.000Z',
            },
          ],
          overrides: [],
        },
      },
      curl: `curl https://example.com/api/v1/availability/diagnose \\
  -b cookies.txt`,
    },
  ],
}

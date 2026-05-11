import type { ApiService } from '../types'

export const slotTypesService: ApiService = {
  name: 'Termin-Typen',
  slug: 'slot-types',
  description:
    'Verwaltung buchbarer Termin-Typen pro Mitarbeiter (z.B. "Erstgespraech 30 Min", "Beratung 60 Min"). Konfiguriert Dauer, Puffer, Vorlauf, max. Vorausbuchung, Location und Reihenfolge auf der oeffentlichen Buchungsseite.',
  basePath: '/api/v1/slot-types',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/slot-types',
      summary: 'Termin-Typen auflisten',
      description:
        'Listet alle Termin-Typen des aktuell eingeloggten Mitarbeiters (sortiert nach displayOrder). Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          slotTypes: [
            {
              id: 'st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
              userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
              slug: 'erstgespraech-30',
              name: 'Erstgespraech (30 Min)',
              description: 'Kostenfreies Kennenlernen per Telefon',
              durationMinutes: 30,
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 15,
              minNoticeHours: 24,
              maxAdvanceDays: 60,
              color: '#3b82f6',
              isActive: true,
              location: 'phone',
              locationDetails: null,
              displayOrder: 0,
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/slot-types \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/slot-types',
      summary: 'Termin-Typ anlegen',
      description:
        'Erstellt einen neuen Termin-Typ fuer den aktuellen Mitarbeiter. slug muss pro User eindeutig sein (Konflikt -> 409 slug_already_exists), Format: ^[a-z0-9-]{1,100}$. Erfordert Permission appointments.create.',
      requestBody: {
        slug: 'beratung-60',
        name: 'Beratungstermin (60 Min)',
        description: 'Vertiefende Beratung zur KI-Strategie',
        durationMinutes: 60,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 15,
        minNoticeHours: 48,
        maxAdvanceDays: 90,
        color: '#10b981',
        isActive: true,
        location: 'video',
        locationDetails: 'Microsoft Teams — Link wird nach Buchung gesendet',
        displayOrder: 1,
      },
      response: {
        success: true,
        data: {
          slotType: {
            id: 'st-7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
            userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            slug: 'beratung-60',
            name: 'Beratungstermin (60 Min)',
            durationMinutes: 60,
            color: '#10b981',
            isActive: true,
            location: 'video',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/slot-types \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"slug":"beratung-60","name":"Beratungstermin (60 Min)","description":"Vertiefende Beratung zur KI-Strategie","durationMinutes":60,"bufferAfterMinutes":15,"minNoticeHours":48,"maxAdvanceDays":90,"color":"#10b981","location":"video","locationDetails":"Microsoft Teams — Link wird nach Buchung gesendet","displayOrder":1}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/slot-types/{id}',
      summary: 'Termin-Typ abrufen',
      description:
        'Gibt einen einzelnen Termin-Typ zurueck. Pruefen Owner-Match (Slot-Type muss dem aktuellen Mitarbeiter gehoeren). Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          slotType: {
            id: 'st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
            slug: 'erstgespraech-30',
            name: 'Erstgespraech (30 Min)',
            durationMinutes: 30,
            color: '#3b82f6',
            isActive: true,
            location: 'phone',
          },
        },
      },
      curl: `curl https://example.com/api/v1/slot-types/st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/slot-types/{id}',
      summary: 'Termin-Typ aktualisieren',
      description:
        'Aktualisiert einen Termin-Typ partial. Pruefen Owner-Match. Erfordert Permission appointments.update.',
      requestBody: {
        name: 'Erstgespraech (45 Min)',
        durationMinutes: 45,
        isActive: true,
      },
      response: {
        success: true,
        data: {
          slotType: {
            id: 'st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
            slug: 'erstgespraech-30',
            name: 'Erstgespraech (45 Min)',
            durationMinutes: 45,
            isActive: true,
          },
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/slot-types/st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Erstgespraech (45 Min)","durationMinutes":45,"isActive":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/slot-types/{id}',
      summary: 'Termin-Typ loeschen',
      description:
        'Loescht einen Termin-Typ permanent. Pruefen Owner-Match. Erfordert Permission appointments.delete. Achtung: Bereits gebuchte Termine bleiben erhalten, koennen aber nicht mehr neu gebucht werden.',
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/slot-types/st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/slot-types/reorder',
      summary: 'Reihenfolge aktualisieren',
      description:
        'Aktualisiert die Reihenfolge (displayOrder) aller Termin-Typen des aktuellen Mitarbeiters auf einmal. Reihenfolge entspricht der uebergebenen ids-Liste (Index 0 = oberster Eintrag). Erfordert Permission appointments.update.',
      requestBody: {
        ids: [
          'st-7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
          'st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
        ],
      },
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X POST https://example.com/api/v1/slot-types/reorder \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"ids":["st-7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d","st-c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f"]}'`,
    },
  ],
}

import type { ApiService } from '../types'

export const calendarAccountService: ApiService = {
  name: 'Google-Kalender-Verbindung',
  slug: 'calendar-account',
  description:
    'Verwaltung des verbundenen Google-Kalender-Accounts: Lesen des Status, Setzen des Primaer-Kalenders fuer Termin-Schreibungen, Aktivieren/Deaktivieren von "als belegt zaehlen" pro Kalender, Re-Sync und Trennen der Verbindung. Plus Diagnose- und Force-Sync-Endpoint.',
  basePath: '/api/v1/calendar-account',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/calendar-account',
      summary: 'Kalender-Status abrufen',
      description:
        'Liefert den aktiven Google-Account, alle ueberwachten Kalender mit Sync-/Watch-Status sowie die globale OAuth-Konfiguration. Liefert {account:null, calendars:[]} wenn kein Account verbunden. Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          account: {
            id: 'cal-acc-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            googleEmail: 'max@mustermann-gmbh.de',
            primaryCalendarId: 'max@mustermann-gmbh.de',
            connectedAt: '2026-03-10T14:25:00.000Z',
          },
          calendars: [
            {
              id: 'wcal-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
              googleCalendarId: 'max@mustermann-gmbh.de',
              displayName: 'Max Mustermann (Primaer)',
              readForBusy: true,
              hasSyncToken: true,
              watchActive: true,
              watchExpiresAt: '2026-05-19T08:00:00.000Z',
              lastSyncedAt: '2026-05-12T07:55:00.000Z',
            },
          ],
          configured: true,
        },
      },
      curl: `curl https://example.com/api/v1/calendar-account \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/calendar-account',
      summary: 'Kalender-Aktion ausfuehren',
      description:
        'Discriminated-Union-Endpoint fuer 4 Aktionen via Feld "action": setPrimary (Primaer-Kalender setzen, in den geschriebene Termine landen), setReadForBusy (Kalender als belegt zaehlen toggeln, triggert Initial-Sync + Watch-Registrierung bzw. Cleanup), resyncCalendar (vollstaendiger Re-Sync eines Kalenders inkl. Watch-Re-Arm), resyncAll (Re-Sync aller Kalender des Accounts). Erfordert Permission appointments.update.',
      requestBody: {
        action: 'setReadForBusy',
        watchedId: 'wcal-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
        readForBusy: true,
      },
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X PATCH https://example.com/api/v1/calendar-account \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"action":"setReadForBusy","watchedId":"wcal-aa11bb22-cc33-dd44-ee55-ff66aabbccdd","readForBusy":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/calendar-account',
      summary: 'Kalender-Verbindung trennen',
      description:
        'Widerruft den aktiven Google-Account des Mitarbeiters (revoke). Stoppt Watch-Channels und markiert den Account als revoked. Bereits gebuchte Termine bleiben in der Datenbank, werden aber nicht mehr mit Google synchronisiert. Erfordert Permission appointments.delete.',
      response: {
        success: true,
        data: { ok: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/calendar-account \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/calendar-account/debug',
      summary: 'Diagnose Google-Sync',
      description:
        'Diagnose-Endpoint fuer Google-Calendar-Sync-Probleme. Liefert alle Accounts (auch revoked, Split-Brain-Detection), Watched-Calendars mit Sync-Status, externalBusy- und Appointments-Sample fuer die naechsten 14 Tage plus heuristische Hints. Optional ?probe=1 fuehrt Live-FreeBusy/Events-Probe gegen Google aus, ?forceSync=1 triggert einen vollstaendigen Trace-Sync. Robust gegen Sub-Query-Fehler (jede Section in eigenem try/catch). Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          now: '2026-05-12T08:00:00.000Z',
          window: { from: '2026-05-12T00:00:00.000Z', to: '2026-05-26T00:00:00.000Z' },
          accounts: {
            total: 1,
            active: {
              id: 'cal-acc-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
              googleEmail: 'max@mustermann-gmbh.de',
              primaryCalendarId: 'max@mustermann-gmbh.de',
            },
            revoked: [],
            splitBrain: false,
          },
          watched: [
            {
              id: 'wcal-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
              googleCalendarId: 'max@mustermann-gmbh.de',
              readForBusy: true,
              hasSyncToken: true,
              watchChannelId: 'channel-9f8e7d6c',
              lastSyncedAt: '2026-05-12T07:55:00.000Z',
            },
          ],
          externalBusy: { count: 12, orphanedCount: 0, sample: [] },
          appointments: { count: 5, sample: [] },
          liveProbe: null,
          forceSyncResult: null,
          hints: ['Alle Diagnose-Checks ok.'],
        },
      },
      curl: `curl "https://example.com/api/v1/calendar-account/debug?probe=1" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/calendar-account/debug',
      summary: 'Force-Sync mit Trace',
      description:
        'Triggert einen vollstaendigen Force-Sync fuer alle readForBusy=true Watched-Calendars. Setzt vor jedem Call sync_token=null (Google liefert kompletten Eventset, kein Incremental), paginiert bis zu 20 Pages und liefert pro Kalender detaillierte Stats inkl. Sample der ersten Events pro Page sowie Upsert-Stats (inserted/deleted/skipped). Erfordert Permission appointments.update.',
      response: {
        success: true,
        data: {
          ok: true,
          accountId: 'cal-acc-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          results: [
            {
              watchedId: 'wcal-aa11bb22-cc33-dd44-ee55-ff66aabbccdd',
              googleCalendarId: 'max@mustermann-gmbh.de',
              beforeSyncToken: 'CAESDAie6...',
              pages: [
                {
                  page: 1,
                  eventCount: 47,
                  sample: [],
                  nextPageToken: null,
                  nextSyncToken: 'set',
                },
              ],
              upsertStats: { events: 47, inserted: 12, deleted: 0, skipped: 35 },
              error: null,
            },
          ],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/calendar-account/debug \\
  -b cookies.txt`,
    },
  ],
}

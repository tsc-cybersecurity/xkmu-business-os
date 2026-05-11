import type { ApiService } from '../types'

export const appointmentsService: ApiService = {
  name: 'Termine',
  slug: 'appointments',
  description:
    'Verwaltung gebuchter Termine im Buchungssystem. Manuelle Anlage durch Mitarbeiter sowie ICS-Download fuer Kalender-Clients (Outlook, Apple Calendar, Google Calendar).',
  basePath: '/api/v1/appointments',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/appointments',
      summary: 'Termin manuell anlegen',
      description:
        'Bucht einen Termin manuell fuer einen bestimmten Slot-Type und Zeitpunkt. Erfordert Permission appointments.create. Pruefen die Slot-Verfuegbarkeit (Konflikt -> 409 slot_unavailable), schreibt Audit-Log und triggert optional Kunden-Mail (per suppressCustomerMail unterdrueckbar).',
      requestBody: {
        userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
        slotTypeId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        startAtUtc: '2026-05-20T08:30:00.000Z',
        customerName: 'Lisa Weber',
        customerEmail: 'lisa.weber@weber-consulting.de',
        customerPhone: '+49 30 12345678',
        customerMessage: 'Bitte vorab Unterlagen per Mail senden.',
        suppressCustomerMail: false,
      },
      response: {
        success: true,
        data: {
          appointment: {
            id: 'apt-2f4e8a90-1c3b-4d5e-9f6a-7b8c9d0e1f2a',
            userId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            slotTypeId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
            startAt: '2026-05-20T08:30:00.000Z',
            endAt: '2026-05-20T09:00:00.000Z',
            status: 'confirmed',
            customerName: 'Lisa Weber',
            customerEmail: 'lisa.weber@weber-consulting.de',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/appointments \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"userId":"b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c","slotTypeId":"a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d","startAtUtc":"2026-05-20T08:30:00.000Z","customerName":"Lisa Weber","customerEmail":"lisa.weber@weber-consulting.de","customerPhone":"+49 30 12345678","customerMessage":"Bitte vorab Unterlagen per Mail senden."}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/appointments/{id}/ics',
      summary: 'ICS-Datei fuer Termin downloaden',
      description:
        'Liefert eine RFC-5545 konforme ICS-Datei (text/calendar) zum Import in beliebige Kalender-Clients. Kein Auth erforderlich (UID-basierter Zugriff per Termin-ID). Liefert METHOD:CANCEL bei stornierten Terminen, sonst METHOD:REQUEST. Antwort traegt Content-Disposition: attachment; filename="termin.ics".',
      response: {
        success: true,
        data: 'BEGIN:VCALENDAR\\nVERSION:2.0\\nMETHOD:REQUEST\\nBEGIN:VEVENT\\nUID:apt-2f4e8a90-1c3b-4d5e-9f6a-7b8c9d0e1f2a\\nSUMMARY:Erstgespraech\\nDTSTART:20260520T083000Z\\nDTEND:20260520T090000Z\\nEND:VEVENT\\nEND:VCALENDAR',
      },
      curl: `curl https://example.com/api/v1/appointments/apt-2f4e8a90-1c3b-4d5e-9f6a-7b8c9d0e1f2a/ics \\
  -o termin.ics`,
    },
  ],
}

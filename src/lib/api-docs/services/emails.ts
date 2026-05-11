import type { ApiService } from '../types'

export const emailsService: ApiService = {
  name: 'E-Mail-Inbox',
  slug: 'emails',
  description:
    'Inbox-/Mailbox-Verwaltung der synchronisierten E-Mails: Listing mit Filtern, Detailansicht inkl. verknuepfter Lead-/Firmen-/Personen-Datensaetze, Versand und Reply per SMTP, IMAP-Sync und Link-Suche fuer Zuordnung.',
  basePath: '/api/v1/emails',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/emails',
      summary: 'E-Mails auflisten',
      description:
        'Listet synchronisierte E-Mails mit Filtern (accountId, folder, isRead, leadId, companyId, personId, search). Volltextsuche ueber subject, fromAddress, fromName und snippet. Maximal 200 Eintraege pro Aufruf. Erfordert die Berechtigung settings.read.',
      params: [
        { name: 'accountId', in: 'query', required: false, type: 'uuid', description: 'Auf ein bestimmtes E-Mail-Konto einschraenken' },
        { name: 'folder', in: 'query', required: false, type: 'string', description: 'IMAP-Ordner, z.B. INBOX oder Sent' },
        { name: 'isRead', in: 'query', required: false, type: 'boolean', description: 'true = nur gelesene, false = nur ungelesene' },
        { name: 'leadId', in: 'query', required: false, type: 'uuid', description: 'Filtert auf einen verknuepften Lead' },
        { name: 'companyId', in: 'query', required: false, type: 'uuid', description: 'Filtert auf eine verknuepfte Firma' },
        { name: 'personId', in: 'query', required: false, type: 'uuid', description: 'Filtert auf eine verknuepfte Person' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Volltextsuche ueber Betreff, Absender und Snippet' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Maximal 200, Default 50' },
        { name: 'offset', in: 'query', required: false, type: 'number', description: 'Offset fuer Pagination, Default 0' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
            messageId: '<abc123@mail.weber-consulting.de>',
            folder: 'INBOX',
            subject: 'Rueckfrage zum Angebot',
            fromAddress: 'lisa.weber@weber-consulting.de',
            fromName: 'Lisa Weber',
            toAddresses: [{ address: 'vertrieb@mustermann-gmbh.de', name: 'Vertrieb' }],
            snippet: 'Guten Tag Herr Mustermann, ich haette noch eine Rueckfrage zum Angebot...',
            date: '2026-05-10T08:42:00.000Z',
            isRead: false,
            isStarred: false,
            hasAttachments: false,
            direction: 'incoming',
            leadId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        ],
      },
      curl: `curl 'https://example.com/api/v1/emails?folder=INBOX&isRead=false&limit=20' \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/emails/{id}',
      summary: 'Einzelne E-Mail abrufen',
      description:
        'Liefert die vollstaendige E-Mail inkl. Body und optional verknuepftem Lead, Firma und Person (linkedLead, linkedCompany, linkedPerson). Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          subject: 'Rueckfrage zum Angebot',
          fromAddress: 'lisa.weber@weber-consulting.de',
          bodyHtml: '<p>Guten Tag Herr Mustermann,</p><p>ich haette noch eine Rueckfrage zum Angebot.</p>',
          bodyText: 'Guten Tag Herr Mustermann, ich haette noch eine Rueckfrage zum Angebot.',
          isRead: false,
          linkedLead: {
            id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'KI-Beratung Weber Consulting',
            contactFirstName: 'Lisa',
            contactLastName: 'Weber',
            contactCompany: 'Weber Consulting GmbH',
            contactEmail: 'lisa.weber@weber-consulting.de',
            status: 'qualified',
          },
          linkedCompany: null,
          linkedPerson: null,
        },
      },
      curl: `curl https://example.com/api/v1/emails/e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/emails/{id}',
      summary: 'E-Mail aktualisieren',
      description:
        'Aktualisiert Inbox-Status oder Verknuepfungen einer E-Mail. Erlaubte Felder: isRead, isStarred, leadId, companyId, personId. Erfordert die Berechtigung settings.update.',
      requestBody: {
        isRead: true,
        isStarred: true,
        leadId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          isRead: true,
          isStarred: true,
          leadId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          linkedLead: {
            id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'KI-Beratung Weber Consulting',
          },
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/emails/e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"isRead":true,"isStarred":true,"leadId":"l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/emails/{id}',
      summary: 'E-Mail loeschen',
      description:
        'Loescht die E-Mail aus dem lokalen Datenbestand. Der originale Mail-Server-Eintrag bleibt unberuehrt. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { message: 'Email deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/emails/e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/emails/{id}/reply',
      summary: 'Auf E-Mail antworten',
      description:
        'Versendet eine Antwort auf eine bestehende E-Mail ueber SMTP. Setzt automatisch Re:-Prefix, In-Reply-To- und References-Header. Mit replyAll werden alle urspruenglichen Empfaenger uebernommen. Erfordert die Berechtigung settings.create.',
      requestBody: {
        bodyHtml: '<p>Guten Tag Frau Weber,</p><p>vielen Dank fuer Ihre Rueckfrage. Anbei die ergaenzten Informationen.</p>',
        bodyText: 'Guten Tag Frau Weber, vielen Dank fuer Ihre Rueckfrage.',
        replyAll: false,
        accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
      },
      response: {
        success: true,
        data: { messageId: '<reply-9f8e7d6c-5b4a-3a2b-1c0d-9e8f7a6b5c4d@example.com>' },
      },
      curl: `curl -X POST https://example.com/api/v1/emails/e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/reply \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"bodyHtml":"<p>Vielen Dank fuer Ihre Rueckfrage.</p>","replyAll":false}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/emails/send',
      summary: 'E-Mail via SMTP senden',
      description:
        'Versendet eine neue E-Mail ueber ein konkretes verbundenes E-Mail-Konto (SMTP). Pflichtfelder: accountId, to, subject, bodyHtml. Erfordert die Berechtigung settings.create.',
      requestBody: {
        accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
        to: ['lisa.weber@weber-consulting.de'],
        cc: ['cc@weber-consulting.de'],
        bcc: [],
        subject: 'Folgetermin KI-Beratung',
        bodyHtml: '<p>Guten Tag Frau Weber,</p><p>gerne moechten wir einen Folgetermin vereinbaren.</p>',
        bodyText: 'Guten Tag Frau Weber, gerne moechten wir einen Folgetermin vereinbaren.',
      },
      response: {
        success: true,
        data: { messageId: '<send-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d@example.com>' },
      },
      curl: `curl -X POST https://example.com/api/v1/emails/send \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"accountId":"ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d","to":["lisa.weber@weber-consulting.de"],"subject":"Folgetermin KI-Beratung","bodyHtml":"<p>Gerne moechten wir einen Folgetermin vereinbaren.</p>"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/emails/sync',
      summary: 'Alle Konten synchronisieren (Cron)',
      description:
        'Synchronisiert alle aktiven E-Mail-Konten via IMAP. Wird typischerweise von einem Cron-Job ohne Authentifizierung aufgerufen (force-dynamic, maxDuration 60s).',
      response: {
        success: true,
        data: {
          results: [
            { accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', synced: 12, errors: 0 },
            { accountId: 'ea2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', synced: 7, errors: 1 },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/emails/sync`,
    },
    {
      method: 'POST',
      path: '/api/v1/emails/sync',
      summary: 'Einzelnes Konto synchronisieren',
      description:
        'Synchronisiert ein einzelnes Konto via IMAP. Pflichtfeld accountId. Erfordert die Berechtigung settings.create.',
      requestBody: {
        accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
      },
      response: {
        success: true,
        data: {
          accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          synced: 12,
          errors: 0,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/emails/sync \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"accountId":"ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/emails/link-search',
      summary: 'Verknuepfbare Entitaeten suchen',
      description:
        'Sucht in Leads, Firmen und Personen nach passenden Kandidaten zum Verknuepfen einer E-Mail. Liefert max. 5 Treffer pro Typ. Mindestens 2 Zeichen in q erforderlich. Erfordert die Berechtigung settings.read.',
      params: [
        { name: 'q', in: 'query', required: true, type: 'string', description: 'Suchbegriff (mindestens 2 Zeichen)', example: 'weber' },
      ],
      response: {
        success: true,
        data: [
          { id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', label: 'KI-Beratung Weber Consulting — Lisa Weber — Weber Consulting GmbH — lisa.weber@weber-consulting.de', type: 'lead' },
          { id: 'c2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', label: 'Weber Consulting GmbH — Berlin — info@weber-consulting.de', type: 'company' },
          { id: 'p3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8', label: 'Lisa Weber — Geschaeftsfuehrerin — lisa.weber@weber-consulting.de', type: 'person' },
        ],
      },
      curl: `curl 'https://example.com/api/v1/emails/link-search?q=weber' \\
  -b cookies.txt`,
    },
  ],
}

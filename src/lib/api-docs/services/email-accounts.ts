import type { ApiService } from '../types'

export const emailAccountsService: ApiService = {
  name: 'E-Mail-Konten',
  slug: 'email-accounts',
  description:
    'Verwaltung verbundener E-Mail-Konten (IMAP fuer Empfang, SMTP fuer Versand). Passwoerter werden in API-Responses immer maskiert (***). Erlaubt Verbindungstest und manuelle Synchronisation pro Konto.',
  basePath: '/api/v1/email-accounts',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/email-accounts',
      summary: 'E-Mail-Konten auflisten',
      description:
        'Gibt alle konfigurierten E-Mail-Konten sortiert nach Name zurueck. Passwoerter sind in der Antwort maskiert. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            id: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
            name: 'Vertrieb Postfach',
            email: 'vertrieb@mustermann-gmbh.de',
            imapHost: 'imap.mustermann-gmbh.de',
            imapPort: 993,
            imapUser: 'vertrieb@mustermann-gmbh.de',
            imapPassword: '***',
            imapTls: true,
            smtpHost: 'smtp.mustermann-gmbh.de',
            smtpPort: 587,
            smtpUser: 'vertrieb@mustermann-gmbh.de',
            smtpPassword: '***',
            smtpTls: true,
            syncEnabled: true,
            syncInterval: 5,
            syncFolder: 'INBOX',
            signature: 'Mit freundlichen Gruessen\nVertriebsteam',
            isActive: true,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/email-accounts \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/email-accounts',
      summary: 'E-Mail-Konto anlegen',
      description:
        'Erstellt ein neues E-Mail-Konto mit IMAP- und optional SMTP-Konfiguration. Pflichtfelder sind name, email, imapHost, imapUser und imapPassword. Erfordert die Berechtigung settings.create.',
      requestBody: {
        name: 'Vertrieb Postfach',
        email: 'vertrieb@mustermann-gmbh.de',
        imapHost: 'imap.mustermann-gmbh.de',
        imapPort: 993,
        imapUser: 'vertrieb@mustermann-gmbh.de',
        imapPassword: 'sicheresImapPasswort123',
        imapTls: true,
        smtpHost: 'smtp.mustermann-gmbh.de',
        smtpPort: 587,
        smtpUser: 'vertrieb@mustermann-gmbh.de',
        smtpPassword: 'sicheresSmtpPasswort456',
        smtpTls: true,
        syncEnabled: true,
        syncInterval: 5,
        syncFolder: 'INBOX',
        signature: 'Mit freundlichen Gruessen\nVertriebsteam',
      },
      response: {
        success: true,
        data: {
          id: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          name: 'Vertrieb Postfach',
          email: 'vertrieb@mustermann-gmbh.de',
          imapHost: 'imap.mustermann-gmbh.de',
          imapPassword: '***',
          smtpPassword: '***',
          syncEnabled: true,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/email-accounts \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Vertrieb Postfach","email":"vertrieb@mustermann-gmbh.de","imapHost":"imap.mustermann-gmbh.de","imapUser":"vertrieb@mustermann-gmbh.de","imapPassword":"sicheresImapPasswort123"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/email-accounts/{id}',
      summary: 'Einzelnes Konto abrufen',
      description:
        'Liefert ein konkretes E-Mail-Konto inklusive maskierter Passwoerter. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          name: 'Vertrieb Postfach',
          email: 'vertrieb@mustermann-gmbh.de',
          imapHost: 'imap.mustermann-gmbh.de',
          imapPassword: '***',
          smtpPassword: '***',
          syncEnabled: true,
          syncInterval: 5,
          syncFolder: 'INBOX',
        },
      },
      curl: `curl https://example.com/api/v1/email-accounts/ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/email-accounts/{id}',
      summary: 'Konto aktualisieren',
      description:
        'Aktualisiert ein bestehendes E-Mail-Konto. Maskierte Passwoerter (***) werden ignoriert, sodass nur neue Passwoerter geschrieben werden. Erfordert die Berechtigung settings.update.',
      requestBody: {
        name: 'Vertrieb Postfach (Hauptkonto)',
        syncInterval: 10,
        signature: 'Mit freundlichen Gruessen\nMax Mustermann\nGeschaeftsfuehrung',
      },
      response: {
        success: true,
        data: {
          id: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          name: 'Vertrieb Postfach (Hauptkonto)',
          syncInterval: 10,
          signature: 'Mit freundlichen Gruessen\nMax Mustermann\nGeschaeftsfuehrung',
          imapPassword: '***',
          smtpPassword: '***',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/email-accounts/ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Vertrieb Postfach (Hauptkonto)","syncInterval":10}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/email-accounts/{id}',
      summary: 'Konto loeschen',
      description:
        'Loescht ein E-Mail-Konto endgueltig. Verknuepfte synchronisierte E-Mails werden je nach FK-Konfiguration mitgeloescht. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { message: 'Email account deleted successfully' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/email-accounts/ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/email-accounts/{id}/sync',
      summary: 'Manuelle Synchronisation ausloesen',
      description:
        'Stoesst eine manuelle IMAP-Synchronisation fuer das angegebene Konto an. Gibt Synchronisationsstatistiken zurueck. Erfordert die Berechtigung settings.create.',
      response: {
        success: true,
        data: {
          accountId: 'ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
          synced: 24,
          errors: 0,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/email-accounts/ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d/sync \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/email-accounts/{id}/test',
      summary: 'IMAP-Verbindung testen',
      description:
        'Versucht einen IMAP-Login mit den gespeicherten Credentials und meldet, ob die Verbindung erfolgreich war. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: { connected: true },
      },
      curl: `curl -X POST https://example.com/api/v1/email-accounts/ea1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d/test \\
  -b cookies.txt`,
    },
  ],
}

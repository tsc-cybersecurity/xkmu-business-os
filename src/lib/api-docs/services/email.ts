import type { ApiService } from '../types'

export const emailService: ApiService = {
  name: 'E-Mail-Versand',
  slug: 'email',
  description:
    'Einzelner E-Mail-Versand ueber die zentral konfigurierte EmailService-Instanz (EMAIL_USER/EMAIL_PASSWORD in der .env). Optional kann die Mail mit einem Lead, einer Firma oder einer Person verknuepft werden.',
  basePath: '/api/v1/email',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/email/send',
      summary: 'Einzelne E-Mail versenden',
      description:
        'Versendet eine E-Mail ueber den global konfigurierten EmailService. Erfordert die Berechtigung activities.create. Validiert Empfaenger, Betreff und Body und gibt eine messageId zurueck.',
      requestBody: {
        to: 'kontakt@weber-consulting.de',
        subject: 'Ihr Angebot zur KI-Beratung',
        body: 'Sehr geehrte Frau Weber,\n\nanbei finden Sie unser Angebot.\n\nViele Gruesse\nMax Mustermann',
        html: '<p>Sehr geehrte Frau Weber,</p><p>anbei finden Sie unser Angebot.</p>',
        leadId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        companyId: 'c2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
        personId: 'p3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8',
      },
      response: {
        success: true,
        data: {
          message: 'E-Mail erfolgreich gesendet',
          messageId: '<a1b2c3d4-e5f6-7890-abcd-ef1234567890@example.com>',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/email/send \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"to":"kontakt@weber-consulting.de","subject":"Ihr Angebot zur KI-Beratung","body":"Sehr geehrte Frau Weber, anbei finden Sie unser Angebot."}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/email/send',
      summary: 'Konfigurationsstatus pruefen',
      description:
        'Prueft, ob der globale E-Mail-Versand korrekt konfiguriert ist und ob eine SMTP-Verbindung erfolgreich aufgebaut werden kann. Erfordert die Berechtigung activities.create.',
      response: {
        success: true,
        data: {
          configured: true,
          verified: true,
          error: null,
        },
      },
      curl: `curl https://example.com/api/v1/email/send \\
  -b cookies.txt`,
    },
  ],
}

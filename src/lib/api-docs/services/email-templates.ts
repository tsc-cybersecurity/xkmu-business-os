import type { ApiService } from '../types'

export const emailTemplatesService: ApiService = {
  name: 'E-Mail-Vorlagen',
  slug: 'email-templates',
  description:
    'Verwaltung wiederverwendbarer E-Mail-Vorlagen mit Platzhaltern (z.B. {{contactName}}, {{companyName}}). Templates werden in Lead-Workflows und automatisierten Follow-ups genutzt.',
  basePath: '/api/v1/email-templates',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/email-templates',
      summary: 'Vorlagen auflisten',
      description:
        'Listet alle vorhandenen E-Mail-Vorlagen. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: [
          {
            id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            slug: 'lead-erstkontakt',
            name: 'Lead Erstkontakt',
            subject: 'Vielen Dank fuer Ihr Interesse, {{contactName}}',
            bodyHtml: '<p>Hallo {{contactName}},</p><p>vielen Dank fuer Ihre Anfrage bei {{companyName}}.</p>',
            placeholders: ['contactName', 'companyName'],
          },
        ],
      },
      curl: `curl https://example.com/api/v1/email-templates \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/email-templates',
      summary: 'Neue Vorlage anlegen',
      description:
        'Erstellt eine neue E-Mail-Vorlage. Slug muss eindeutig sein und wird zur programmatischen Auswahl verwendet. Erfordert die Berechtigung settings.create.',
      requestBody: {
        slug: 'angebot-versand',
        name: 'Angebotsversand',
        subject: 'Ihr Angebot von {{senderCompany}}',
        bodyHtml: '<p>Sehr geehrte/r {{contactName}},</p><p>anbei erhalten Sie das gewuenschte Angebot.</p>',
        placeholders: ['contactName', 'senderCompany'],
      },
      response: {
        success: true,
        data: {
          id: 't2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          slug: 'angebot-versand',
          name: 'Angebotsversand',
          subject: 'Ihr Angebot von {{senderCompany}}',
          bodyHtml: '<p>Sehr geehrte/r {{contactName}},</p><p>anbei erhalten Sie das gewuenschte Angebot.</p>',
          placeholders: ['contactName', 'senderCompany'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/email-templates \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"slug":"angebot-versand","name":"Angebotsversand","subject":"Ihr Angebot von {{senderCompany}}","bodyHtml":"<p>Sehr geehrte/r {{contactName}}</p>","placeholders":["contactName","senderCompany"]}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/email-templates/seed',
      summary: 'Default-Vorlagen seeden',
      description:
        'Legt einen Standard-Satz an E-Mail-Vorlagen idempotent an (z.B. Lead-Erstkontakt, Angebotsversand, Follow-up). Erfordert die Berechtigung settings.create.',
      response: {
        success: true,
        data: { created: 5 },
      },
      curl: `curl -X POST https://example.com/api/v1/email-templates/seed \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/email-templates/{id}',
      summary: 'Einzelne Vorlage abrufen',
      description:
        'Liefert eine einzelne E-Mail-Vorlage anhand ihrer ID. Erfordert die Berechtigung settings.read.',
      response: {
        success: true,
        data: {
          id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          slug: 'lead-erstkontakt',
          name: 'Lead Erstkontakt',
          subject: 'Vielen Dank fuer Ihr Interesse, {{contactName}}',
          bodyHtml: '<p>Hallo {{contactName}},</p><p>vielen Dank fuer Ihre Anfrage bei {{companyName}}.</p>',
          placeholders: ['contactName', 'companyName'],
        },
      },
      curl: `curl https://example.com/api/v1/email-templates/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/email-templates/{id}',
      summary: 'Vorlage aktualisieren',
      description:
        'Aktualisiert Felder einer bestehenden Vorlage (Subject, Body, Placeholders). Erfordert die Berechtigung settings.update.',
      requestBody: {
        subject: 'Vielen Dank fuer Ihr Interesse bei {{senderCompany}}',
        bodyHtml: '<p>Hallo {{contactName}},</p><p>vielen Dank fuer Ihre Anfrage.</p>',
        placeholders: ['contactName', 'senderCompany'],
      },
      response: {
        success: true,
        data: {
          id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          slug: 'lead-erstkontakt',
          name: 'Lead Erstkontakt',
          subject: 'Vielen Dank fuer Ihr Interesse bei {{senderCompany}}',
          bodyHtml: '<p>Hallo {{contactName}},</p><p>vielen Dank fuer Ihre Anfrage.</p>',
          placeholders: ['contactName', 'senderCompany'],
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/email-templates/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"subject":"Vielen Dank fuer Ihr Interesse bei {{senderCompany}}"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/email-templates/{id}',
      summary: 'Vorlage loeschen',
      description:
        'Loescht eine E-Mail-Vorlage endgueltig. Erfordert die Berechtigung settings.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/email-templates/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
  ],
}

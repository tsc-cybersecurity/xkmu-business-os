import type { ApiService } from '../types'

export const documentTemplatesService: ApiService = {
  name: 'Dokumentvorlagen',
  slug: 'document-templates',
  description:
    'Verwaltung von Dokumentvorlagen (z.B. Vertraege, Angebote, NDAs) inkl. KI-gestuetzter Generierung. Vorlagen werden nach Kategorien organisiert und koennen mit einem Kontext-Prompt von der KI ausgefuellt werden.',
  basePath: '/api/v1/document-templates',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/document-templates',
      summary: 'Vorlagen auflisten',
      description:
        'Listet alle Dokumentvorlagen, optional gefiltert nach Kategorie. Erfordert die Berechtigung documents.read.',
      params: [
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategorie-Filter, z.B. "vertrag" oder "angebot"', example: 'vertrag' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'dt1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
            slug: 'nda-bilateral',
            name: 'NDA (bilateral)',
            category: 'vertrag',
            description: 'Beidseitige Geheimhaltungsvereinbarung',
            bodyHtml: '<h1>Geheimhaltungsvereinbarung</h1><p>zwischen {{partyA}} und {{partyB}} ...</p>',
            placeholders: ['partyA', 'partyB', 'effectiveDate'],
          },
        ],
      },
      curl: `curl 'https://example.com/api/v1/document-templates?category=vertrag' \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/document-templates',
      summary: 'Neue Vorlage anlegen',
      description:
        'Erstellt eine neue Dokumentvorlage mit Body-HTML und Platzhalter-Liste. Erfordert die Berechtigung documents.create.',
      requestBody: {
        slug: 'angebot-ki-beratung',
        name: 'Angebot KI-Beratung',
        category: 'angebot',
        description: 'Standardangebot fuer KI-Beratungspakete A1-A4',
        bodyHtml: '<h1>Angebot {{offerNumber}}</h1><p>Sehr geehrte/r {{contactName}}, gerne unterbreiten wir Ihnen folgendes Angebot ...</p>',
        placeholders: ['offerNumber', 'contactName', 'companyName', 'totalAmount'],
      },
      response: {
        success: true,
        data: {
          id: 'dt2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          slug: 'angebot-ki-beratung',
          name: 'Angebot KI-Beratung',
          category: 'angebot',
          description: 'Standardangebot fuer KI-Beratungspakete A1-A4',
          placeholders: ['offerNumber', 'contactName', 'companyName', 'totalAmount'],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/document-templates \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"slug":"angebot-ki-beratung","name":"Angebot KI-Beratung","category":"angebot","bodyHtml":"<h1>Angebot {{offerNumber}}</h1>","placeholders":["offerNumber","contactName"]}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/document-templates/seed',
      summary: 'Default-Vorlagen seeden',
      description:
        'Legt einen Standard-Satz an Dokumentvorlagen idempotent an (NDA, Beratervertrag, Angebot, Rechnung). Erfordert die Berechtigung documents.create.',
      response: {
        success: true,
        data: { created: 4 },
      },
      curl: `curl -X POST https://example.com/api/v1/document-templates/seed \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/document-templates/{id}/generate',
      summary: 'Dokument per KI generieren',
      description:
        'Laesst die KI die Platzhalter der Vorlage anhand des uebergebenen Kontextes ausfuellen und gibt fertiges HTML zurueck. Der Kontext kann freier Text (z.B. Lead-Details, Anforderungen) sein. Erfordert die Berechtigung documents.create.',
      requestBody: {
        context: 'Kunde: Weber Consulting GmbH, Ansprechpartnerin Lisa Weber. Paket A2 (KI-Workshop), Investitionssumme 4.800 EUR netto. Angebotsnummer ANG-2026-0042.',
      },
      response: {
        success: true,
        data: {
          html: '<h1>Angebot ANG-2026-0042</h1><p>Sehr geehrte Frau Weber, gerne unterbreiten wir Ihnen folgendes Angebot fuer den KI-Workshop (Paket A2): 4.800 EUR netto ...</p>',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/document-templates/dt2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/generate \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"context":"Kunde: Weber Consulting GmbH, Paket A2, 4.800 EUR netto, ANG-2026-0042."}'`,
    },
  ],
}

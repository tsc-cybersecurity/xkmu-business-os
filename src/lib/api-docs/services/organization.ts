import type { ApiService } from '../types'

export const organizationService: ApiService = {
  name: 'Organisation (Single-Tenant)',
  slug: 'organization',
  description:
    'Stammdaten der Organisation (Singleton-Datensatz: Firmenname, Adresse, Bankverbindung, USt-ID, Settings). Single-Tenant-Setup: die tenants-Tabelle existiert weiterhin als Singleton, hier wird sie als organization angesprochen. Zusaetzlich KI-Analyse "Company Knowledge" und Demo-Daten-Import. Permission-Modul: settings.',
  basePath: '/api/v1/organization',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/organization',
      summary: 'Organisations-Stammdaten abrufen',
      description: 'Liefert die Stammdaten der Organisation (Firmenname, Adresse, USt-ID, Bankverbindungen, Settings). Permission: settings.read.',
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          name: 'Mustermann GmbH',
          slug: 'mustermann',
          street: 'Hauptstrasse',
          houseNumber: '42',
          postalCode: '10115',
          city: 'Berlin',
          country: 'DE',
          legalForm: 'GmbH',
          vatId: 'DE123456789',
          email: 'info@mustermann.de',
          website: 'https://mustermann.de',
        },
      },
      curl: `curl https://example.com/api/v1/organization \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/organization',
      summary: 'Organisations-Stammdaten aktualisieren',
      description:
        'Aktualisiert die Stammdaten der Organisation. Validiert via zod (slug nur lowercase-alnum + dashes). Bei Slug-Aenderung wird auf Eindeutigkeit geprueft (SLUG_EXISTS). Permission: settings.update.',
      requestBody: {
        name: 'Mustermann GmbH & Co. KG',
        legalForm: 'GmbH & Co. KG',
        bankName1: 'Sparkasse Berlin',
        bankIban1: 'DE89 3704 0044 0532 0130 00',
        bankBic1: 'COBADEFFXXX',
        settings: { invoicePrefix: 'RE-' },
      },
      response: {
        success: true,
        data: { id: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'Mustermann GmbH & Co. KG' },
      },
      curl: `curl -X PUT https://example.com/api/v1/organization \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Mustermann GmbH & Co. KG"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/organization/analyze',
      summary: 'KI-Analyse "Company Knowledge"',
      description:
        'Erstellt eine KI-basierte Unternehmens-Wissensbasis aus Stammdaten, Produkten, Dienstleistungen, Kategorien, Leads und Business-Intelligence-Profilen. Ergebnis wird in organization.settings.companyKnowledge gespeichert. Permission: settings.update.',
      response: {
        success: true,
        data: {
          knowledge: 'Die Mustermann GmbH ist ein KMU im Bereich IT-Beratung mit Fokus auf...',
          stats: { products: 12, services: 8, categories: 5, leads: 47, topInterests: 23 },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/organization/analyze \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/organization/seed-demo',
      summary: 'Demo-Daten importieren',
      description: 'Importiert kuratierte Demo-Daten (Companies, Leads, Produkte etc.) in die Organisation. Erfordert eine eingeloggte User-ID. Permission: settings.update.',
      response: {
        success: true,
        data: {
          message: 'Demo-Daten erfolgreich importiert',
          companies: 10,
          leads: 25,
          products: 15,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/organization/seed-demo \\
  -b cookies.txt`,
    },
  ],
}

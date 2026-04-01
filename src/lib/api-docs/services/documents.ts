import type { ApiService } from '../types'

export const documentsService: ApiService = {
  name: 'Dokumente',
  slug: 'documents',
  description:
    'Dokumentenverwaltung fuer Rechnungen, Angebote und Vertraege. Unterstuetzt CRUD-Operationen, Positionsverwaltung, Statuswechsel, Konvertierung (Angebot zu Rechnung, Vertrag zu Angebot/Rechnung), E-Mail-Versand und automatische Nummernvergabe.',
  basePath: '/api/v1/documents',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/documents',
      summary: 'Dokumente auflisten',
      description:
        'Gibt eine paginierte Liste aller Dokumente zurueck. Unterstuetzt Filterung nach Typ (invoice, offer, contract), Status, Firma, Datumszeitraum und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Dokumenttyp: invoice, offer, contract', example: 'invoice' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status (z.B. draft, sent, paid)' },
        { name: 'companyId', in: 'query', required: false, type: 'string', description: 'Filtert nach Firma (UUID)' },
        { name: 'dateFrom', in: 'query', required: false, type: 'string', description: 'Startdatum (ISO 8601)', example: '2025-01-01' },
        { name: 'dateTo', in: 'query', required: false, type: 'string', description: 'Enddatum (ISO 8601)', example: '2025-12-31' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche ueber Nummer und Kundenname' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            type: 'invoice',
            number: 'RE-2025-0042',
            status: 'sent',
            customerName: 'Schneider & Partner GmbH',
            total: '12500.00',
            dueDate: '2025-12-31',
          },
        ],
        meta: { page: 1, limit: 25, total: 89 },
      },
      curl: `curl "https://example.com/api/v1/documents?type=invoice&status=sent&dateFrom=2025-01-01" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/documents',
      summary: 'Dokument erstellen',
      description: 'Erstellt ein neues Dokument (Rechnung, Angebot oder Vertrag).',
      requestBody: {
        type: 'invoice',
        number: 'RE-2025-0043',
        companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        customerName: 'Schneider & Partner GmbH',
        customerStreet: 'Leopoldstrasse 10',
        customerPostalCode: '80802',
        customerCity: 'Muenchen',
        dueDate: '2026-01-31',
        notes: 'Zahlbar innerhalb 30 Tagen',
      },
      response: {
        success: true,
        data: {
          id: 'd2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          type: 'invoice',
          number: 'RE-2025-0043',
          status: 'draft',
          customerName: 'Schneider & Partner GmbH',
          total: '0.00',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/documents \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"type":"invoice","number":"RE-2025-0043","companyId":"c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","customerName":"Schneider & Partner GmbH","customerStreet":"Leopoldstrasse 10","customerPostalCode":"80802","customerCity":"Muenchen","dueDate":"2026-01-31","notes":"Zahlbar innerhalb 30 Tagen"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/documents/:id',
      summary: 'Dokument abrufen',
      description: 'Gibt die vollstaendigen Daten eines einzelnen Dokuments zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          type: 'invoice',
          number: 'RE-2025-0042',
          status: 'sent',
          customerName: 'Schneider & Partner GmbH',
          total: '12500.00',
          subtotal: '10504.20',
          taxTotal: '1995.80',
          dueDate: '2025-12-31',
          companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        },
      },
      curl: `curl https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/documents/:id',
      summary: 'Dokument aktualisieren',
      description:
        'Aktualisiert die Daten eines Dokuments. Nur Dokumente im Status Entwurf koennen bearbeitet werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      requestBody: {
        notes: 'Skonto: 2% bei Zahlung innerhalb 10 Tagen',
        dueDate: '2026-02-15',
      },
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          type: 'invoice',
          number: 'RE-2025-0042',
          status: 'draft',
          dueDate: '2026-02-15',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"notes":"Skonto: 2% bei Zahlung innerhalb 10 Tagen","dueDate":"2026-02-15"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/documents/:id',
      summary: 'Dokument loeschen',
      description: 'Loescht ein Dokument. Nur Dokumente im Status Entwurf koennen geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      response: {
        success: true,
        data: { message: 'Dokument erfolgreich gelöscht' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/documents/:id/items',
      summary: 'Positionen auflisten',
      description: 'Gibt alle Positionen (Zeilen) eines Dokuments zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'i1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            documentId: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            position: 1,
            description: 'IT-Beratung Cloud Migration',
            quantity: 40,
            unit: 'Stunden',
            unitPrice: '150.00',
            taxRate: '19.00',
            total: '6000.00',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/items \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/documents/:id/items',
      summary: 'Position hinzufuegen',
      description: 'Fuegt eine neue Position zu einem Dokument hinzu.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      requestBody: {
        description: 'Schulung SAP S/4HANA Grundlagen',
        quantity: 2,
        unit: 'Tage',
        unitPrice: 1800,
        taxRate: 19,
      },
      response: {
        success: true,
        data: {
          id: 'i2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          documentId: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          position: 2,
          description: 'Schulung SAP S/4HANA Grundlagen',
          quantity: 2,
          unit: 'Tage',
          unitPrice: '1800.00',
          taxRate: '19.00',
          total: '3600.00',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/items \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"description":"Schulung SAP S/4HANA Grundlagen","quantity":2,"unit":"Tage","unitPrice":1800,"taxRate":19}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/documents/:id/items/:itemId',
      summary: 'Position aktualisieren',
      description: 'Aktualisiert eine bestehende Position eines Dokuments.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
        { name: 'itemId', in: 'path', required: true, type: 'string', description: 'UUID der Position' },
      ],
      requestBody: {
        quantity: 3,
        unitPrice: 1650,
      },
      response: {
        success: true,
        data: {
          id: 'i2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          description: 'Schulung SAP S/4HANA Grundlagen',
          quantity: 3,
          unitPrice: '1650.00',
          total: '4950.00',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/items/i2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"quantity":3,"unitPrice":1650}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/documents/:id/items/:itemId',
      summary: 'Position entfernen',
      description: 'Entfernt eine Position aus einem Dokument.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
        { name: 'itemId', in: 'path', required: true, type: 'string', description: 'UUID der Position' },
      ],
      response: {
        success: true,
        data: { message: 'Position erfolgreich entfernt' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/items/i2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/documents/:id/status',
      summary: 'Status aendern',
      description:
        'Aendert den Status eines Dokuments (z.B. draft -> sent -> paid). Validiert zulaessige Statusuebergaenge.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      requestBody: {
        status: 'sent',
      },
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          type: 'invoice',
          number: 'RE-2025-0042',
          status: 'sent',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/status \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"sent"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/documents/:id/convert',
      summary: 'Dokument konvertieren',
      description:
        'Konvertiert ein Dokument in einen anderen Typ. Angebote werden direkt zu Rechnungen konvertiert. Vertraege benoetigen einen targetType (offer oder invoice) im Request-Body. Erstellt ein neues Dokument mit kopierten Positionen.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Quelldokuments' },
      ],
      requestBody: {
        targetType: 'invoice',
      },
      response: {
        success: true,
        data: {
          id: 'd3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8',
          type: 'invoice',
          number: 'RE-2025-0044',
          status: 'draft',
          customerName: 'Schneider & Partner GmbH',
          total: '12500.00',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/convert \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"targetType":"invoice"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/documents/:id/send',
      summary: 'Dokument per E-Mail versenden',
      description:
        'Versendet ein Dokument per E-Mail an den angegebenen Empfaenger. Nutzt E-Mail-Templates basierend auf dem Dokumenttyp (offer_send fuer Angebote, reminder_7d fuer Rechnungen). Unterstuetzt CC-Empfaenger und benutzerdefinierte Betreffzeilen.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Dokuments' },
      ],
      requestBody: {
        to: 'thomas@schneider-partner.de',
        cc: 'buchhaltung@schneider-partner.de',
        subject: 'Rechnung RE-2025-0042',
        message: 'Anbei erhalten Sie unsere Rechnung.',
      },
      response: {
        success: true,
        data: {
          sent: true,
          messageId: 'msg-abc123',
          to: 'thomas@schneider-partner.de',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/send \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"to":"thomas@schneider-partner.de","cc":"buchhaltung@schneider-partner.de","subject":"Rechnung RE-2025-0042","message":"Anbei erhalten Sie unsere Rechnung."}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/documents/next-number',
      summary: 'Naechste Dokumentnummer ermitteln',
      description:
        'Gibt die naechste verfuegbare Dokumentnummer zurueck. Unterstuetzt die Typen invoice und offer.',
      params: [
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Dokumenttyp: invoice oder offer (Standard: invoice)', example: 'invoice' },
      ],
      response: {
        success: true,
        data: { number: 'RE-2025-0044' },
      },
      curl: `curl "https://example.com/api/v1/documents/next-number?type=invoice" \\
  -b cookies.txt`,
    },
  ],
}

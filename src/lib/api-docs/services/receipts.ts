import type { ApiService } from '../types'

export const receiptsService: ApiService = {
  name: 'Belege',
  slug: 'receipts',
  description: 'Belege (Quittungen, Rechnungen) erfassen und verwalten.',
  basePath: '/api/v1/receipts',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/receipts',
      summary: 'Alle Belege auflisten',
      description: 'Gibt paginierte Belege zurueck. Optional nach Status filterbar.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Status filtern (z.B. pending, processed, archived)', example: 'pending' },
      ],
      response: {
        items: [{ id: 'uuid', fileName: 'tankbeleg_2026-03.pdf', vendor: 'Shell Tankstelle Muenchen', amount: 78.45, date: '2026-03-25', category: 'fahrtkosten', status: 'pending' }],
        meta: { page: 1, limit: 25, total: 15 },
      },
      curl: `curl -s "https://example.com/api/v1/receipts?status=pending&limit=10" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/receipts',
      summary: 'Neuen Beleg erstellen',
      description: 'Erstellt einen neuen Beleg mit optionalen OCR-Daten.',
      requestBody: {
        fileName: 'bueromat_rechnung_2026-03.pdf',
        fileUrl: '/uploads/belege/bueromat_rechnung_2026-03.pdf',
        amount: 234.56,
        date: '2026-03-20',
        vendor: 'Buerobedarf Mueller OHG',
        category: 'bueromaterial',
        notes: 'Druckerpapier und Toner fuer Q2',
        ocrData: { rawText: 'Buerobedarf Mueller OHG\nRechnungsnr. 2026-1234\nGesamt: 234,56 EUR' },
      },
      response: { id: 'uuid', fileName: 'bueromat_rechnung_2026-03.pdf', vendor: 'Buerobedarf Mueller OHG', amount: 234.56 },
      curl: `curl -s -X POST https://example.com/api/v1/receipts -b cookies.txt -H "Content-Type: application/json" -d '{"fileName":"bueromat_rechnung_2026-03.pdf","fileUrl":"/uploads/belege/bueromat_rechnung_2026-03.pdf","amount":234.56,"date":"2026-03-20","vendor":"Buerobedarf Mueller OHG","category":"bueromaterial","notes":"Druckerpapier und Toner fuer Q2"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/receipts/{id}',
      summary: 'Einzelnen Beleg abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Beleg-ID (UUID)', example: 'e5f6a7b8-c9d0-1234-efgh-567890abcdef' },
      ],
      response: { id: 'uuid', fileName: 'tankbeleg_2026-03.pdf', vendor: 'Shell Tankstelle Muenchen', amount: 78.45, date: '2026-03-25', category: 'fahrtkosten' },
      curl: `curl -s https://example.com/api/v1/receipts/e5f6a7b8-c9d0-1234-efgh-567890abcdef -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/receipts/{id}',
      summary: 'Beleg aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Beleg-ID (UUID)' },
      ],
      requestBody: {
        vendor: 'Shell Deutschland GmbH',
        amount: 78.45,
        category: 'fahrtkosten',
        notes: 'Dienstfahrt zum Kunden nach Augsburg',
      },
      response: { id: 'uuid', vendor: 'Shell Deutschland GmbH', amount: 78.45 },
      curl: `curl -s -X PUT https://example.com/api/v1/receipts/e5f6a7b8-c9d0-1234-efgh-567890abcdef -b cookies.txt -H "Content-Type: application/json" -d '{"vendor":"Shell Deutschland GmbH","notes":"Dienstfahrt zum Kunden nach Augsburg"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/receipts/{id}',
      summary: 'Beleg loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Beleg-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/receipts/e5f6a7b8-c9d0-1234-efgh-567890abcdef -b cookies.txt`,
    },
  ],
}

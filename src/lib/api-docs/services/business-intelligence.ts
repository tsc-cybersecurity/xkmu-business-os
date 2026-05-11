import type { ApiService } from '../types'

export const businessIntelligenceService: ApiService = {
  name: 'Business Intelligence',
  slug: 'business-intelligence',
  description:
    'Business-Intelligence-Pipeline: Upload und Textextraktion von Geschaeftsdokumenten (PDF, DOCX, XLSX, TXT) sowie KI-gestuetzte Analyse zur Erzeugung eines konsolidierten Unternehmensprofils. Permission: business_intelligence (read/create/update/delete).',
  basePath: '/api/v1/business-intelligence',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/business-intelligence/documents',
      summary: 'Geschaeftsdokumente auflisten',
      description:
        'Listet alle hochgeladenen Geschaeftsdokumente paginiert auf. Optionaler Status-Filter (pending, processing, completed, failed). Permission: business_intelligence.read.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (1-basiert)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Extraktions-Status', example: 'completed' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            filename: '1715420000000-Geschaeftsbericht_2025.pdf',
            originalName: 'Geschaeftsbericht 2025.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1843200,
            extractionStatus: 'completed',
            createdAt: '2026-05-10T10:15:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 7 },
      },
      curl: `curl "https://example.com/api/v1/business-intelligence/documents?status=completed" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/business-intelligence/documents',
      summary: 'Geschaeftsdokument hochladen',
      description:
        'Laedt ein Geschaeftsdokument hoch (multipart/form-data). Erlaubte Typen: PDF, DOCX, XLSX, XLS, TXT. Max. 10 MB. Permission: business_intelligence.create.',
      requestBody: {
        file: '<binary> (Feldname: file, z.B. Geschaeftsbericht_2025.pdf)',
      },
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          filename: '1715420000000-Geschaeftsbericht_2025.pdf',
          originalName: 'Geschaeftsbericht 2025.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1843200,
          extractionStatus: 'pending',
          createdAt: '2026-05-11T10:15:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/business-intelligence/documents \\
  -b cookies.txt \\
  -F "file=@./Geschaeftsbericht_2025.pdf"`,
    },
    {
      method: 'GET',
      path: '/api/v1/business-intelligence/documents/{id}',
      summary: 'Geschaeftsdokument-Details abrufen',
      description:
        'Gibt Metadaten und extrahierten Text eines einzelnen Geschaeftsdokuments zurueck. Permission: business_intelligence.read.',
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          filename: '1715420000000-Geschaeftsbericht_2025.pdf',
          originalName: 'Geschaeftsbericht 2025.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1843200,
          extractionStatus: 'completed',
          extractedText: 'Die Mustermann GmbH erzielte im Geschaeftsjahr 2025 einen Umsatz von ...',
          createdAt: '2026-05-10T10:15:00.000Z',
        },
      },
      curl: `curl https://example.com/api/v1/business-intelligence/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/business-intelligence/documents/{id}',
      summary: 'Geschaeftsdokument loeschen',
      description:
        'Loescht ein Geschaeftsdokument samt zugehoerigem extrahiertem Text. Permission: business_intelligence.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/business-intelligence/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/business-intelligence/documents/{id}/extract',
      summary: 'Textextraktion ausloesen',
      description:
        'Extrahiert den Text aus einem hochgeladenen Geschaeftsdokument (PDF via pdf-parse, DOCX via mammoth, XLSX via exceljs, TXT direkt). Aktualisiert extractionStatus auf processing -> completed/failed. Permission: business_intelligence.update.',
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          filename: '1715420000000-Geschaeftsbericht_2025.pdf',
          originalName: 'Geschaeftsbericht 2025.pdf',
          extractionStatus: 'completed',
          extractedText: 'Die Mustermann GmbH erzielte im Geschaeftsjahr 2025 einen Umsatz von 4,2 Mio. EUR ...',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/business-intelligence/documents/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/extract \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/business-intelligence/profile',
      summary: 'Aktuelles Unternehmensprofil abrufen',
      description:
        'Gibt das zuletzt erzeugte Unternehmensprofil zurueck (Branchen, USPs, Zielgruppen, Marktposition etc.). Permission: business_intelligence.read.',
      response: {
        success: true,
        data: {
          id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          industry: 'IT-Beratung fuer KMU',
          coreOffering: 'KI-gestuetzte Geschaeftsprozess-Automatisierung',
          targetCustomers: ['Mittelstaendische Produktionsbetriebe', 'Beratungsunternehmen 10-200 MA'],
          usps: ['Schnelle Implementierung in 4-6 Wochen', 'DSGVO-konformer KI-Einsatz'],
          marketPosition: 'Spezialist fuer KI-Adoption im deutschen Mittelstand',
          sourceDocumentIds: ['d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6'],
          createdAt: '2026-05-10T12:00:00.000Z',
        },
      },
      curl: `curl https://example.com/api/v1/business-intelligence/profile \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/business-intelligence/profile',
      summary: 'Unternehmensprofil neu analysieren',
      description:
        'Startet die KI-Analyse ueber alle extrahierten Geschaeftsdokumente und speichert das Ergebnis als neues Unternehmensprofil (Upsert). Erfordert mindestens ein Dokument mit erfolgreicher Textextraktion. Permission: business_intelligence.create.',
      response: {
        success: true,
        data: {
          id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          industry: 'IT-Beratung fuer KMU',
          coreOffering: 'KI-gestuetzte Geschaeftsprozess-Automatisierung',
          targetCustomers: ['Mittelstaendische Produktionsbetriebe'],
          usps: ['Schnelle Implementierung in 4-6 Wochen'],
          marketPosition: 'Spezialist fuer KI-Adoption im deutschen Mittelstand',
          sourceDocumentIds: ['d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6'],
          createdAt: '2026-05-11T14:22:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/business-intelligence/profile \\
  -b cookies.txt`,
    },
  ],
}

import type { ApiService } from '../types'

export const ideasService: ApiService = {
  name: 'Ideen',
  slug: 'ideas',
  description:
    'Ideenverwaltung mit KI-gestuetzter Verarbeitung. Neue Ideen werden automatisch per KI analysiert, zusammengefasst und getaggt. Ideen koennen zu Leads und Firmen konvertiert werden, wobei die KI Entitaeten (Firmen, Personen, E-Mails) aus dem Rohtext extrahiert.',
  basePath: '/api/v1/ideas',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/ideas',
      summary: 'Ideen auflisten',
      description:
        'Gibt eine paginierte Liste aller Ideen zurueck. Mit grouped=true werden Ideen nach Status gruppiert zurueckgegeben (Kanban-Ansicht). Unterstuetzt Filterung nach Status und Typ.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'grouped', in: 'query', required: false, type: 'string', description: 'Wenn true, Gruppierung nach Status', example: 'true' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Filtert nach Ideentyp' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            rawContent: 'Mueller Elektrotechnik in Koeln koennte Cloud-Loesungen brauchen',
            status: 'new',
            type: 'lead',
            tags: ['elektrotechnik', 'koeln', 'cloud'],
            structuredContent: {
              summary: 'Potentieller Cloud-Kunde im Bereich Elektrotechnik in Koeln',
            },
          },
        ],
        meta: { page: 1, limit: 25, total: 18 },
      },
      curl: `curl "https://example.com/api/v1/ideas?page=1&limit=25&status=new" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ideas',
      summary: 'Idee erstellen',
      description:
        'Erstellt eine neue Idee aus Rohtext. Die KI-Verarbeitung (Zusammenfassung, Tag-Extraktion) wird asynchron im Hintergrund gestartet und die Idee sofort zurueckgegeben.',
      requestBody: {
        rawContent: 'Habe auf der CeBIT den Geschaeftsfuehrer der Firma Hoffmann Logistik aus Hamburg getroffen. Sie suchen eine neue Lagerverwaltungssoftware. Kontakt: h.hoffmann@hoffmann-logistik.de',
        type: 'lead',
      },
      response: {
        success: true,
        data: {
          id: 'id2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          rawContent: 'Habe auf der CeBIT den Geschaeftsfuehrer der Firma Hoffmann Logistik aus Hamburg getroffen. Sie suchen eine neue Lagerverwaltungssoftware. Kontakt: h.hoffmann@hoffmann-logistik.de',
          status: 'new',
          type: 'lead',
          tags: [],
          structuredContent: null,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/ideas \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"rawContent":"Habe auf der CeBIT den Geschaeftsfuehrer der Firma Hoffmann Logistik aus Hamburg getroffen. Sie suchen eine neue Lagerverwaltungssoftware. Kontakt: h.hoffmann@hoffmann-logistik.de","type":"lead"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/ideas/:id',
      summary: 'Idee abrufen',
      description: 'Gibt die vollstaendigen Daten einer einzelnen Idee zurueck, inklusive KI-generierter Zusammenfassung und Tags.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Idee' },
      ],
      response: {
        success: true,
        data: {
          id: 'id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          rawContent: 'Mueller Elektrotechnik in Koeln koennte Cloud-Loesungen brauchen',
          status: 'new',
          type: 'lead',
          tags: ['elektrotechnik', 'koeln', 'cloud'],
          structuredContent: {
            summary: 'Potentieller Cloud-Kunde im Bereich Elektrotechnik in Koeln',
          },
          createdAt: '2025-12-01T10:30:00Z',
          updatedAt: '2025-12-01T10:30:05Z',
        },
      },
      curl: `curl https://example.com/api/v1/ideas/id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/ideas/:id',
      summary: 'Idee aktualisieren',
      description: 'Aktualisiert die Daten einer Idee (z.B. Status, Tags, strukturierte Inhalte).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Idee' },
      ],
      requestBody: {
        status: 'reviewed',
        tags: ['elektrotechnik', 'koeln', 'cloud', 'prioritaet-hoch'],
      },
      response: {
        success: true,
        data: {
          id: 'id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'reviewed',
          tags: ['elektrotechnik', 'koeln', 'cloud', 'prioritaet-hoch'],
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/ideas/id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"status":"reviewed","tags":["elektrotechnik","koeln","cloud","prioritaet-hoch"]}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/ideas/:id',
      summary: 'Idee loeschen',
      description: 'Loescht eine Idee permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Idee' },
      ],
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/ideas/id1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ideas/:id/convert',
      summary: 'Idee konvertieren',
      description:
        'Konvertiert eine Idee zu einem Lead und optional einer Firma. Die KI extrahiert Entitaeten (Firmennamen, Personen, E-Mails) aus dem Rohtext. Falls ein Firmenname erkannt wird, wird automatisch eine Firma erstellt und mit dem Lead verknuepft. Die KI-Zusammenfassung und Tags werden in den Lead uebernommen. Erstellt eine Activity zur Dokumentation der Konvertierung. Loest idea.converted und ggf. company.created Webhooks aus. Kann nur einmal ausgefuehrt werden (Status wechselt zu converted).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Idee' },
      ],
      response: {
        success: true,
        data: {
          message: 'Idee erfolgreich konvertiert',
          companyId: 'c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9',
          companyName: 'Hoffmann Logistik',
          leadId: 'l4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/ideas/id2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7/convert \\
  -b cookies.txt`,
    },
  ],
}

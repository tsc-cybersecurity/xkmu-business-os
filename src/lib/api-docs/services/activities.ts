import type { ApiService } from '../types'

export const activitiesService: ApiService = {
  name: 'Aktivitaeten',
  slug: 'activities',
  description: 'CRM-Aktivitaeten (Notizen, Anrufe, E-Mails, Meetings) verwalten.',
  basePath: '/api/v1/activities',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/activities',
      summary: 'Aktivitaeten auflisten',
      description: 'Gibt paginierte Aktivitaeten zurueck. Filterbar nach Lead, Firma, Person oder Typ.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'leadId', in: 'query', required: false, type: 'string', description: 'Nach Lead filtern (UUID)' },
        { name: 'companyId', in: 'query', required: false, type: 'string', description: 'Nach Firma filtern (UUID)' },
        { name: 'personId', in: 'query', required: false, type: 'string', description: 'Nach Person filtern (UUID)' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Aktivitaetstyp (note, call, email, meeting)', example: 'call' },
      ],
      response: {
        items: [{ id: 'uuid', type: 'call', subject: 'Erstgespraech IT-Beratung', content: 'Herr Mueller interessiert sich fuer Managed Services...', companyId: 'uuid', createdAt: '2026-03-30T14:00:00Z' }],
        meta: { page: 1, limit: 25, total: 128 },
      },
      curl: `curl -s "https://example.com/api/v1/activities?type=call&companyId=c1d2e3f4-a5b6-7890-cdef-123456789abc&limit=10" -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/activities',
      summary: 'Neue Aktivitaet erstellen',
      description: 'Erstellt eine neue CRM-Aktivitaet. Validierung ueber Zod-Schema.',
      requestBody: {
        type: 'meeting',
        subject: 'Projektbesprechung ERP-Migration',
        content: 'Besprechung der Meilensteine fuer Q2. Teilnehmer: Hr. Schmitt, Fr. Weber. Naechster Schritt: Pflichtenheft bis 15.04.',
        companyId: 'c1d2e3f4-a5b6-7890-cdef-123456789abc',
        personId: 'd2e3f4a5-b6c7-8901-defg-234567890abc',
        metadata: { location: 'Buero Muenchen', duration: 60 },
      },
      response: { id: 'uuid', type: 'meeting', subject: 'Projektbesprechung ERP-Migration' },
      curl: `curl -s -X POST https://example.com/api/v1/activities -b cookies.txt -H "Content-Type: application/json" -d '{"type":"meeting","subject":"Projektbesprechung ERP-Migration","content":"Besprechung der Meilensteine fuer Q2.","companyId":"c1d2e3f4-a5b6-7890-cdef-123456789abc","metadata":{"location":"Buero Muenchen","duration":60}}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/activities/{id}',
      summary: 'Einzelne Aktivitaet abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Aktivitaet-ID (UUID)', example: 'c3d4e5f6-a7b8-9012-cdef-345678901abc' },
      ],
      response: { id: 'uuid', type: 'call', subject: 'Erstgespraech IT-Beratung', content: '...', companyId: 'uuid' },
      curl: `curl -s https://example.com/api/v1/activities/c3d4e5f6-a7b8-9012-cdef-345678901abc -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/activities/{id}',
      summary: 'Aktivitaet aktualisieren',
      description: 'Aktualisiert Subject, Content und/oder Metadata einer Aktivitaet.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Aktivitaet-ID (UUID)' },
      ],
      requestBody: {
        subject: 'Erstgespraech IT-Beratung (Nachtrag)',
        content: 'Ergaenzung: Kunde wuenscht zusaetzlich Backup-Loesung. Angebot bis Freitag.',
        metadata: { followUp: '2026-04-04' },
      },
      response: { id: 'uuid', subject: 'Erstgespraech IT-Beratung (Nachtrag)' },
      curl: `curl -s -X PUT https://example.com/api/v1/activities/c3d4e5f6-a7b8-9012-cdef-345678901abc -b cookies.txt -H "Content-Type: application/json" -d '{"subject":"Erstgespraech IT-Beratung (Nachtrag)","content":"Ergaenzung: Kunde wuenscht zusaetzlich Backup-Loesung."}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/activities/{id}',
      summary: 'Aktivitaet loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Aktivitaet-ID (UUID)' },
      ],
      response: { deleted: true },
      curl: `curl -s -X DELETE https://example.com/api/v1/activities/c3d4e5f6-a7b8-9012-cdef-345678901abc -b cookies.txt`,
    },
  ],
}

import type { ApiService } from '../types'

export const portalDocumentCategoriesService: ApiService = {
  name: 'Portal-Dokumentkategorien',
  slug: 'portal-document-categories',
  description:
    'Administrative Verwaltung der Kategorien fuer den Dokumenten-Austausch im Kunden-Portal (admin_to_portal, portal_to_admin, both). Wird im Backoffice gepflegt; die portal-seitige Auswahlliste laeuft ueber /api/v1/portal/document-categories. System-Kategorien koennen nicht umbenannt oder geloescht werden.',
  basePath: '/api/v1/portal-document-categories',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/portal-document-categories',
      summary: 'Portal-Dokumentkategorien auflisten',
      description:
        'Liefert alle aktiven Portal-Dokumentkategorien (direction any). Erfordert Permission documents.read.',
      response: {
        success: true,
        data: [
          {
            id: 'pdc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Vertragsunterlagen',
            direction: 'both',
            sortOrder: 1,
            isSystem: false,
            createdAt: '2026-03-01T08:00:00.000Z',
          },
          {
            id: 'pdc2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Rechnungen',
            direction: 'admin_to_portal',
            sortOrder: 2,
            isSystem: true,
            createdAt: '2026-03-01T08:00:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal-document-categories \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal-document-categories',
      summary: 'Portal-Dokumentkategorie anlegen',
      description:
        'Erstellt eine neue Kategorie. Felder: name (1-100 Zeichen, Pflicht), direction (admin_to_portal | portal_to_admin | both, Pflicht), sortOrder (optional). Erfordert Permission documents.create. Schreibt Audit-Log portal_document_category.created.',
      requestBody: {
        name: 'Buchhaltungsbelege',
        direction: 'portal_to_admin',
        sortOrder: 10,
      },
      response: {
        success: true,
        data: {
          id: 'pdc3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Buchhaltungsbelege',
          direction: 'portal_to_admin',
          sortOrder: 10,
          isSystem: false,
          createdAt: '2026-05-12T08:30:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal-document-categories \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Buchhaltungsbelege","direction":"portal_to_admin","sortOrder":10}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/portal-document-categories/{id}',
      summary: 'Portal-Dokumentkategorie aktualisieren',
      description:
        'Aktualisiert name und/oder sortOrder einer Kategorie. System-Kategorien sind gesperrt (403 FORBIDDEN). Erfordert Permission documents.update. Schreibt Audit-Log portal_document_category.updated.',
      requestBody: {
        name: 'Buchhaltung & Belege',
        sortOrder: 5,
      },
      response: {
        success: true,
        data: {
          id: 'pdc3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Buchhaltung & Belege',
          direction: 'portal_to_admin',
          sortOrder: 5,
          isSystem: false,
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/portal-document-categories/pdc3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Buchhaltung & Belege","sortOrder":5}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/portal-document-categories/{id}',
      summary: 'Portal-Dokumentkategorie loeschen (Soft-Delete)',
      description:
        'Soft-Delete einer Kategorie. Erfordert Permission documents.delete. Schreibt Audit-Log portal_document_category.deleted. 403 FORBIDDEN bei System-Kategorien, 409 CONFLICT wenn noch aktive Dokumente die Kategorie referenzieren, 404 wenn nicht gefunden.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/portal-document-categories/pdc3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
  ],
}

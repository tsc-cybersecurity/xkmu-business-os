import type { ApiService } from '../types'

export const blogCategoriesService: ApiService = {
  name: 'Blog-Kategorien',
  slug: 'blog-categories',
  description:
    'Verwaltung der Blog-Kategorien (global, kein tenant_id). Kategorien gruppieren Blog-Posts thematisch, haben Farbe und Sortierreihenfolge. Permission-Modul: blog.',
  basePath: '/api/v1/blog-categories',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/blog-categories',
      summary: 'Blog-Kategorien auflisten',
      description: 'Listet Blog-Kategorien. Mit active=true werden nur aktive Kategorien zurueckgegeben. Permission: blog.read.',
      params: [{ name: 'active', in: 'query', required: false, type: 'boolean', description: 'Nur aktive (true) zurueckgeben' }],
      response: {
        success: true,
        data: [
          { id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'KI & Automatisierung', slug: 'ki-automatisierung', color: '#3B82F6', sortOrder: 1, isActive: true },
          { id: 'c2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', name: 'IT-Sicherheit', slug: 'it-sicherheit', color: '#EF4444', sortOrder: 2, isActive: true },
        ],
      },
      curl: `curl "https://example.com/api/v1/blog-categories?active=true" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog-categories',
      summary: 'Blog-Kategorie anlegen',
      description: 'Erstellt eine neue Blog-Kategorie. name ist erforderlich. Permission: blog.create.',
      requestBody: {
        name: 'Foerdermittel',
        slug: 'foerdermittel',
        description: 'Tipps zu Foerderprogrammen fuer KMU',
        color: '#10B981',
        sortOrder: 3,
        isActive: true,
      },
      response: {
        success: true,
        data: { id: 'c3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', name: 'Foerdermittel', slug: 'foerdermittel' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog-categories \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Foerdermittel","slug":"foerdermittel","color":"#10B981"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/blog-categories/{id}',
      summary: 'Blog-Kategorie abrufen',
      description: 'Liefert eine Blog-Kategorie. Permission: blog.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      response: { success: true, data: { id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'KI & Automatisierung' } },
      curl: `curl https://example.com/api/v1/blog-categories/c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/blog-categories/{id}',
      summary: 'Blog-Kategorie aktualisieren',
      description: 'Aktualisiert Felder einer Blog-Kategorie. Permission: blog.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      requestBody: { name: 'KI & Automation', color: '#2563EB', isActive: true },
      response: { success: true, data: { id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'KI & Automation' } },
      curl: `curl -X PUT https://example.com/api/v1/blog-categories/c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"KI & Automation"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/blog-categories/{id}',
      summary: 'Blog-Kategorie loeschen',
      description: 'Loescht eine Blog-Kategorie. Permission: blog.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/blog-categories/c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
  ],
}

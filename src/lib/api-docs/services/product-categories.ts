import type { ApiService } from '../types'

export const productCategoriesService: ApiService = {
  name: 'Produkt-Kategorien',
  slug: 'product-categories',
  description:
    'Verwaltung der Produkt-/Dienstleistungs-Kategorien. Unterstuetzt hierarchische Baeume (Parent/Child). Vor dem Loeschen wird auf Unterkategorien und verknuepfte Produkte geprueft. Permission-Modul: product_categories.',
  basePath: '/api/v1/product-categories',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/product-categories',
      summary: 'Produkt-Kategorien auflisten',
      description: 'Listet Produkt-Kategorien. Mit tree=true wird der hierarchische Baum statt der flachen Liste zurueckgegeben. Permission: product_categories.read.',
      params: [{ name: 'tree', in: 'query', required: false, type: 'boolean', description: 'true fuer Baumstruktur' }],
      response: {
        success: true,
        data: [
          { id: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'Beratung', slug: 'beratung', parentId: null },
          { id: 'p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', name: 'KI-Beratung', slug: 'ki-beratung', parentId: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' },
        ],
      },
      curl: `curl "https://example.com/api/v1/product-categories?tree=true" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/product-categories',
      summary: 'Produkt-Kategorie anlegen',
      description: 'Erstellt eine neue Produkt-Kategorie (zod-validiert via createProductCategorySchema). Permission: product_categories.create.',
      requestBody: {
        name: 'Hosting & Cloud',
        slug: 'hosting-cloud',
        description: 'Managed-Hosting-Dienstleistungen',
        parentId: null,
      },
      response: { success: true, data: { id: 'p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', name: 'Hosting & Cloud' } },
      curl: `curl -X POST https://example.com/api/v1/product-categories \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Hosting & Cloud","slug":"hosting-cloud"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/product-categories/{id}',
      summary: 'Produkt-Kategorie abrufen',
      description: 'Liefert eine Produkt-Kategorie. Permission: product_categories.read.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      response: { success: true, data: { id: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'Beratung' } },
      curl: `curl https://example.com/api/v1/product-categories/p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/product-categories/{id}',
      summary: 'Produkt-Kategorie aktualisieren',
      description: 'Aktualisiert eine Produkt-Kategorie (zod-validiert via updateProductCategorySchema). Permission: product_categories.update.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      requestBody: { name: 'Strategische Beratung' },
      response: { success: true, data: { id: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', name: 'Strategische Beratung' } },
      curl: `curl -X PUT https://example.com/api/v1/product-categories/p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Strategische Beratung"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/product-categories/{id}',
      summary: 'Produkt-Kategorie loeschen',
      description:
        'Loescht eine Produkt-Kategorie. Schlaegt mit 409 fehl, wenn Unterkategorien (HAS_CHILDREN) oder verknuepfte Produkte (HAS_PRODUCTS) existieren. Permission: product_categories.delete.',
      params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Kategorie-ID' }],
      response: { success: true, data: { message: 'Kategorie erfolgreich geloescht' } },
      curl: `curl -X DELETE https://example.com/api/v1/product-categories/p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \\
  -b cookies.txt`,
    },
  ],
}

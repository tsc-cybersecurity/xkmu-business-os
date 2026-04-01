import type { ApiService } from '../types'

export const cmsService: ApiService = {
  name: 'CMS',
  slug: 'cms',
  description:
    'Content-Management-System fuer Seiten, Bloecke, Block-Typen, Block-Vorlagen und Navigation. Unterstuetzt KI-gestuetzte SEO-Generierung.',
  basePath: '/api/v1/cms',
  auth: 'session',
  endpoints: [
    // --- Pages ---
    {
      method: 'GET',
      path: '/api/v1/cms/pages',
      summary: 'CMS-Seiten auflisten',
      description: 'Gibt eine paginierte Liste aller CMS-Seiten zurueck. Filterbar nach Status.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status (draft, published)', example: 'published' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/cms/pages?status=published" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/pages',
      summary: 'CMS-Seite erstellen',
      description: 'Erstellt eine neue CMS-Seite als Entwurf.',
      requestBody: {
        title: 'Ueber uns',
        slug: 'ueber-uns',
        description: 'Unternehmensvorstellung',
      },
      response: { success: true, data: { id: 'uuid', title: 'Ueber uns', status: 'draft' } },
      curl: `curl -X POST https://example.com/api/v1/cms/pages \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Ueber uns","slug":"ueber-uns"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/cms/pages/:id',
      summary: 'CMS-Seite abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      response: { success: true, data: { id: 'uuid', title: 'Ueber uns', blocks: [] } },
      curl: `curl -X GET https://example.com/api/v1/cms/pages/PAGE_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/pages/:id',
      summary: 'CMS-Seite aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      requestBody: { title: 'Ueber uns (neu)', slug: 'ueber-uns' },
      response: { success: true, data: { id: 'uuid', title: 'Ueber uns (neu)' } },
      curl: `curl -X PUT https://example.com/api/v1/cms/pages/PAGE_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Ueber uns (neu)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/cms/pages/:id',
      summary: 'CMS-Seite loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/cms/pages/PAGE_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/pages/:id/publish',
      summary: 'CMS-Seite veroeffentlichen oder zurueckziehen',
      description: 'Veroeffentlicht eine Seite oder zieht sie zurueck (unpublish=true).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
        { name: 'unpublish', in: 'query', required: false, type: 'boolean', description: 'Auf true setzen zum Zurueckziehen', example: 'true' },
      ],
      response: { success: true, data: { id: 'uuid', status: 'published' } },
      curl: `curl -X POST "https://example.com/api/v1/cms/pages/PAGE_ID/publish" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/pages/:id/seo/generate',
      summary: 'SEO-Daten per KI generieren',
      description: 'Generiert SEO-Metadaten fuer eine CMS-Seite basierend auf den Block-Inhalten.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      response: { success: true, data: { seoTitle: '...', seoDescription: '...', seoKeywords: '...' } },
      curl: `curl -X POST https://example.com/api/v1/cms/pages/PAGE_ID/seo/generate \\
  -b cookies.txt`,
    },
    // --- Page Blocks ---
    {
      method: 'GET',
      path: '/api/v1/cms/pages/:id/blocks',
      summary: 'Bloecke einer Seite auflisten',
      description: 'Gibt alle Bloecke einer Seite zurueck, sortiert nach Position.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      response: { success: true, data: [] },
      curl: `curl -X GET https://example.com/api/v1/cms/pages/PAGE_ID/blocks \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/pages/:id/blocks',
      summary: 'Block zu einer Seite hinzufuegen',
      description: 'Erstellt einen neuen Block auf der angegebenen Seite.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      requestBody: {
        blockType: 'hero',
        content: { headline: 'Willkommen', text: 'Beschreibung' },
        settings: {},
      },
      response: { success: true, data: { id: 'uuid', blockType: 'hero' } },
      curl: `curl -X POST https://example.com/api/v1/cms/pages/PAGE_ID/blocks \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"blockType":"hero","content":{"headline":"Willkommen"}}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/pages/:id/blocks/reorder',
      summary: 'Bloecke einer Seite neu sortieren',
      description: 'Sortiert die Bloecke einer Seite anhand einer geordneten Liste von Block-IDs.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Seite' },
      ],
      requestBody: { blockIds: ['block-uuid-1', 'block-uuid-2', 'block-uuid-3'] },
      response: { success: true, data: { reordered: true } },
      curl: `curl -X PUT https://example.com/api/v1/cms/pages/PAGE_ID/blocks/reorder \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"blockIds":["block-uuid-1","block-uuid-2"]}'`,
    },
    // --- Blocks ---
    {
      method: 'PUT',
      path: '/api/v1/cms/blocks/:id',
      summary: 'Block aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blocks' },
      ],
      requestBody: { content: { headline: 'Neu' }, settings: {} },
      response: { success: true, data: { id: 'uuid', blockType: 'hero' } },
      curl: `curl -X PUT https://example.com/api/v1/cms/blocks/BLOCK_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"content":{"headline":"Neu"}}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/cms/blocks/:id',
      summary: 'Block loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blocks' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/cms/blocks/BLOCK_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/blocks/:id/duplicate',
      summary: 'Block duplizieren',
      description: 'Erstellt eine Kopie eines bestehenden Blocks auf derselben Seite.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des zu duplizierenden Blocks' },
      ],
      response: { success: true, data: { id: 'new-uuid', blockType: 'hero' } },
      curl: `curl -X POST https://example.com/api/v1/cms/blocks/BLOCK_ID/duplicate \\
  -b cookies.txt`,
    },
    // --- Block Types ---
    {
      method: 'GET',
      path: '/api/v1/cms/block-types',
      summary: 'Block-Typen auflisten',
      description: 'Gibt alle verfuegbaren Block-Typen zurueck. Seedet Defaults bei erster Anfrage.',
      response: { success: true, data: [] },
      curl: `curl -X GET https://example.com/api/v1/cms/block-types \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/block-types',
      summary: 'Standard-Block-Typen seeden',
      description: 'Erstellt die Standard-Block-Typen (hero, text, image, etc.).',
      response: { success: true, data: { seeded: true } },
      curl: `curl -X POST https://example.com/api/v1/cms/block-types \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/block-types/:id',
      summary: 'Block-Typ aktualisieren',
      description: 'Aktualisiert Felder eines Block-Typs (name, description, icon, category, fields, defaultContent, defaultSettings, isActive, sortOrder).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Block-Typs' },
      ],
      requestBody: { name: 'Hero Banner', icon: 'layout', isActive: true },
      response: { success: true, data: { id: 'uuid', name: 'Hero Banner' } },
      curl: `curl -X PUT https://example.com/api/v1/cms/block-types/TYPE_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Hero Banner","icon":"layout"}'`,
    },
    // --- Templates ---
    {
      method: 'GET',
      path: '/api/v1/cms/templates',
      summary: 'Block-Vorlagen auflisten',
      description: 'Gibt alle Block-Vorlagen zurueck. Optional nach blockType filtern.',
      params: [
        { name: 'blockType', in: 'query', required: false, type: 'string', description: 'Filtern nach Block-Typ', example: 'hero' },
      ],
      response: { success: true, data: [] },
      curl: `curl -X GET "https://example.com/api/v1/cms/templates?blockType=hero" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/templates',
      summary: 'Block-Vorlage erstellen',
      requestBody: {
        name: 'Hero Standard',
        blockType: 'hero',
        content: { headline: 'Willkommen' },
        settings: {},
      },
      response: { success: true, data: { id: 'uuid', name: 'Hero Standard' } },
      curl: `curl -X POST https://example.com/api/v1/cms/templates \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Hero Standard","blockType":"hero","content":{"headline":"Willkommen"}}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/cms/templates/:id',
      summary: 'Block-Vorlage abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      response: { success: true, data: { id: 'uuid', name: 'Hero Standard', blockType: 'hero' } },
      curl: `curl -X GET https://example.com/api/v1/cms/templates/TEMPLATE_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/templates/:id',
      summary: 'Block-Vorlage aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      requestBody: { name: 'Hero Premium', content: { headline: 'Neu' } },
      response: { success: true, data: { id: 'uuid', name: 'Hero Premium' } },
      curl: `curl -X PUT https://example.com/api/v1/cms/templates/TEMPLATE_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Hero Premium"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/cms/templates/:id',
      summary: 'Block-Vorlage loeschen',
      description: 'Loescht eine Block-Vorlage. System-Vorlagen koennen nicht geloescht werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Vorlage' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/cms/templates/TEMPLATE_ID \\
  -b cookies.txt`,
    },
    // --- Navigation ---
    {
      method: 'GET',
      path: '/api/v1/cms/navigation',
      summary: 'Navigations-Items auflisten',
      description: 'Gibt alle Navigations-Items zurueck. Optional nach Location filtern.',
      params: [
        { name: 'location', in: 'query', required: false, type: 'string', description: 'Navigation-Location (header, footer)', example: 'header' },
      ],
      response: { success: true, data: [] },
      curl: `curl -X GET "https://example.com/api/v1/cms/navigation?location=header" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/navigation',
      summary: 'Navigations-Item erstellen',
      requestBody: {
        label: 'Startseite',
        url: '/',
        location: 'header',
        sortOrder: 0,
      },
      response: { success: true, data: { id: 'uuid', label: 'Startseite' } },
      curl: `curl -X POST https://example.com/api/v1/cms/navigation \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"label":"Startseite","url":"/","location":"header","sortOrder":0}'`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/navigation/:id',
      summary: 'Navigations-Item aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Navigation-Items' },
      ],
      requestBody: { label: 'Home', url: '/' },
      response: { success: true, data: { id: 'uuid', label: 'Home' } },
      curl: `curl -X PUT https://example.com/api/v1/cms/navigation/NAV_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"label":"Home"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/cms/navigation/:id',
      summary: 'Navigations-Item loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Navigation-Items' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/cms/navigation/NAV_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/cms/navigation/reorder',
      summary: 'Navigations-Items neu sortieren',
      description: 'Sortiert die Navigation anhand einer geordneten Liste von Item-IDs.',
      requestBody: { itemIds: ['nav-uuid-1', 'nav-uuid-2'] },
      response: { success: true, data: { reordered: true } },
      curl: `curl -X PUT https://example.com/api/v1/cms/navigation/reorder \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"itemIds":["nav-uuid-1","nav-uuid-2"]}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/cms/navigation/seed',
      summary: 'Standard-Navigation seeden',
      description: 'Erstellt die Standard-Navigationsstruktur fuer den Mandanten.',
      response: { success: true, data: {} },
      curl: `curl -X POST https://example.com/api/v1/cms/navigation/seed \\
  -b cookies.txt`,
    },
  ],
}

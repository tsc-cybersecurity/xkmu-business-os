import type { ApiService } from '../types'

export const blogService: ApiService = {
  name: 'Blog',
  slug: 'blog',
  description:
    'Blog-Beitraege erstellen, verwalten und veroeffentlichen. Unterstuetzt KI-Generierung, SEO-Optimierung, Review und WordPress-Publishing.',
  basePath: '/api/v1/blog',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/blog/posts',
      summary: 'Blog-Beitraege auflisten',
      description:
        'Gibt eine paginierte Liste aller Blog-Beitraege zurueck. Filterbar nach Status, Kategorie und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 20)', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status (draft, published)', example: 'draft' },
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Filtern nach Kategorie', example: 'marketing' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Volltextsuche in Titel und Inhalt', example: 'KI Strategie' },
      ],
      response: {
        success: true,
        data: [],
        meta: { page: 1, limit: 20, total: 0 },
      },
      curl: `curl -X GET "https://example.com/api/v1/blog/posts?page=1&limit=20&status=draft" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts',
      summary: 'Blog-Beitrag erstellen',
      description:
        'Erstellt einen neuen Blog-Beitrag als Entwurf. Erfordert mindestens einen Titel und Slug.',
      requestBody: {
        title: 'KI im Mittelstand',
        slug: 'ki-im-mittelstand',
        excerpt: 'Wie KMU von kuenstlicher Intelligenz profitieren',
        content: '<p>Artikel-Inhalt...</p>',
        tags: ['ki', 'mittelstand'],
        seoTitle: 'KI im Mittelstand - Praxisguide',
        seoDescription: 'Erfahren Sie, wie KMU von KI profitieren.',
        seoKeywords: 'KI, Mittelstand, Automatisierung',
      },
      response: {
        success: true,
        data: { id: 'uuid', title: 'KI im Mittelstand', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog/posts \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"title":"KI im Mittelstand","slug":"ki-im-mittelstand","content":"<p>Inhalt</p>"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/blog/posts/:id',
      summary: 'Blog-Beitrag abrufen',
      description: 'Gibt einen einzelnen Blog-Beitrag anhand seiner ID zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      response: {
        success: true,
        data: { id: 'uuid', title: 'KI im Mittelstand', status: 'draft', content: '...' },
      },
      curl: `curl -X GET https://example.com/api/v1/blog/posts/POST_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/blog/posts/:id',
      summary: 'Blog-Beitrag aktualisieren',
      description: 'Aktualisiert einen bestehenden Blog-Beitrag. Nur geaenderte Felder muessen gesendet werden.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      requestBody: {
        title: 'KI im Mittelstand (aktualisiert)',
        content: '<p>Neuer Inhalt</p>',
      },
      response: {
        success: true,
        data: { id: 'uuid', title: 'KI im Mittelstand (aktualisiert)' },
      },
      curl: `curl -X PUT https://example.com/api/v1/blog/posts/POST_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"title":"KI im Mittelstand (aktualisiert)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/blog/posts/:id',
      summary: 'Blog-Beitrag loeschen',
      description: 'Loescht einen Blog-Beitrag dauerhaft.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/blog/posts/POST_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts/:id/publish',
      summary: 'Blog-Beitrag veroeffentlichen oder zurueckziehen',
      description:
        'Veroeffentlicht einen Beitrag oder zieht ihn zurueck (unpublish=true). Setzt den Status auf published bzw. draft.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
        { name: 'unpublish', in: 'query', required: false, type: 'boolean', description: 'Auf true setzen zum Zurueckziehen', example: 'true' },
      ],
      response: {
        success: true,
        data: { id: 'uuid', status: 'published' },
      },
      curl: `curl -X POST "https://example.com/api/v1/blog/posts/POST_ID/publish" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts/:id/publish-wp',
      summary: 'Beitrag auf WordPress veroeffentlichen',
      description:
        'Veroeffentlicht einen Blog-Beitrag als Entwurf auf einer verbundenen WordPress-Instanz. Erfordert einen konfigurierten WordPress-Provider (URL|User|AppPassword) unter KI-Provider.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      response: {
        success: true,
        data: { wpPostId: 42, wpUrl: 'https://blog.example.com/?p=42', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog/posts/POST_ID/publish-wp \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts/:id/review',
      summary: 'KI-Review eines Blog-Beitrags',
      description:
        'Fuehrt eine KI-gestuetzte Analyse des Beitragsinhalts durch. Bewertet Qualitaet, SEO und Lesbarkeit. Mindestens 50 Zeichen Inhalt erforderlich.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      response: {
        success: true,
        data: { review: { gesamtbewertung: '8/10', empfehlungen: [] }, postId: 'uuid', postTitle: 'Titel' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog/posts/POST_ID/review \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts/generate',
      summary: 'Blog-Beitrag per KI generieren',
      description:
        'Generiert einen vollstaendigen Blog-Beitrag per KI inkl. SEO-Daten und optionalem Unsplash-Bild. Wird automatisch als Entwurf gespeichert.',
      requestBody: {
        topic: 'KI-Trends 2025',
        language: 'de',
        tone: 'professional',
        length: 'medium',
      },
      response: {
        success: true,
        data: { id: 'uuid', title: 'KI-Trends 2025', status: 'draft', source: 'ai' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog/posts/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"KI-Trends 2025","language":"de","tone":"professional","length":"medium"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/blog/posts/:id/seo/generate',
      summary: 'SEO-Daten per KI generieren',
      description:
        'Generiert SEO-Metadaten (Titel, Beschreibung, Keywords) fuer einen bestehenden Blog-Beitrag mithilfe von KI.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Blog-Beitrags' },
      ],
      response: {
        success: true,
        data: { seoTitle: '...', seoDescription: '...', seoKeywords: '...' },
      },
      curl: `curl -X POST https://example.com/api/v1/blog/posts/POST_ID/seo/generate \\
  -b cookies.txt`,
    },
  ],
}

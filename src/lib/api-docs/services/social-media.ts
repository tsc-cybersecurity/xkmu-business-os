import type { ApiService } from '../types'

export const socialMediaService: ApiService = {
  name: 'Social Media',
  slug: 'social-media',
  description:
    'Social-Media-Themen und -Beitraege verwalten. Unterstuetzt KI-Generierung, Content-Plaene, Verbesserung bestehender Posts und direktes Publishing auf Plattformen.',
  basePath: '/api/v1/social-media',
  auth: 'session',
  endpoints: [
    // --- Topics ---
    {
      method: 'GET',
      path: '/api/v1/social-media/topics',
      summary: 'Social-Media-Themen auflisten',
      description: 'Paginierte Liste aller Social-Media-Themen des Mandanten.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/social-media/topics?page=1&limit=20" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/topics',
      summary: 'Social-Media-Thema erstellen',
      requestBody: {
        name: 'KI-Innovation',
        description: 'Beitraege rund um KI-Neuheiten',
        color: '#3b82f6',
      },
      response: { success: true, data: { id: 'uuid', name: 'KI-Innovation' } },
      curl: `curl -X POST https://example.com/api/v1/social-media/topics \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"KI-Innovation","description":"Beitraege rund um KI","color":"#3b82f6"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/social-media/topics/:id',
      summary: 'Social-Media-Thema abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Themas' },
      ],
      response: { success: true, data: { id: 'uuid', name: 'KI-Innovation' } },
      curl: `curl -X GET https://example.com/api/v1/social-media/topics/TOPIC_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/social-media/topics/:id',
      summary: 'Social-Media-Thema aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Themas' },
      ],
      requestBody: { name: 'KI & Automatisierung', color: '#10b981' },
      response: { success: true, data: { id: 'uuid', name: 'KI & Automatisierung' } },
      curl: `curl -X PUT https://example.com/api/v1/social-media/topics/TOPIC_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"KI & Automatisierung"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/social-media/topics/:id',
      summary: 'Social-Media-Thema loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Themas' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/social-media/topics/TOPIC_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/topics/generate',
      summary: 'Themen per KI generieren',
      description:
        'Generiert Social-Media-Themen basierend auf dem Business-Profil (Branche, Zielgruppe, SWOT-Staerken). Themen werden automatisch gespeichert.',
      requestBody: { count: 5 },
      response: { success: true, data: [{ id: 'uuid', name: 'Thema 1', color: '#3b82f6' }] },
      curl: `curl -X POST https://example.com/api/v1/social-media/topics/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"count":5}'`,
    },
    // --- Posts ---
    {
      method: 'GET',
      path: '/api/v1/social-media/posts',
      summary: 'Social-Media-Beitraege auflisten',
      description: 'Paginierte Liste aller Social-Media-Beitraege. Filterbar nach Plattform, Status und Thema.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'platform', in: 'query', required: false, type: 'string', description: 'Filtern nach Plattform (linkedin, twitter, instagram, facebook)', example: 'linkedin' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtern nach Status (draft, scheduled, posted)', example: 'draft' },
        { name: 'topicId', in: 'query', required: false, type: 'string', description: 'Filtern nach Thema-ID' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/social-media/posts?platform=linkedin&status=draft" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/posts',
      summary: 'Social-Media-Beitrag erstellen',
      requestBody: {
        content: 'Spannender Beitrag ueber KI im Mittelstand! #KI #Mittelstand',
        platform: 'linkedin',
        topicId: 'topic-uuid',
        scheduledAt: '2025-07-01T10:00:00Z',
      },
      response: { success: true, data: { id: 'uuid', platform: 'linkedin', status: 'draft' } },
      curl: `curl -X POST https://example.com/api/v1/social-media/posts \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"content":"KI im Mittelstand! #KI","platform":"linkedin"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/social-media/posts/:id',
      summary: 'Social-Media-Beitrag abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Beitrags' },
      ],
      response: { success: true, data: { id: 'uuid', content: '...', platform: 'linkedin' } },
      curl: `curl -X GET https://example.com/api/v1/social-media/posts/POST_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/social-media/posts/:id',
      summary: 'Social-Media-Beitrag aktualisieren',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Beitrags' },
      ],
      requestBody: { content: 'Aktualisierter Inhalt #KI', status: 'scheduled' },
      response: { success: true, data: { id: 'uuid', status: 'scheduled' } },
      curl: `curl -X PUT https://example.com/api/v1/social-media/posts/POST_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Aktualisiert #KI"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/social-media/posts/:id',
      summary: 'Social-Media-Beitrag loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Beitrags' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/social-media/posts/POST_ID \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/posts/generate',
      summary: 'Social-Media-Beitrag per KI generieren',
      description: 'Generiert einen einzelnen Social-Media-Beitrag per KI fuer eine bestimmte Plattform.',
      requestBody: {
        topic: 'KI-Trends 2025',
        platform: 'linkedin',
        tone: 'professional',
        language: 'de',
      },
      response: { success: true, data: { content: '...', hashtags: [] } },
      curl: `curl -X POST https://example.com/api/v1/social-media/posts/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"KI-Trends 2025","platform":"linkedin","tone":"professional","language":"de"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/posts/generate-plan',
      summary: 'Content-Plan per KI generieren',
      description:
        'Generiert einen vollstaendigen Content-Plan mit mehreren Beitraegen ueber verschiedene Plattformen und Zeitraeume.',
      requestBody: {
        topics: ['KI', 'Digitalisierung'],
        platforms: ['linkedin', 'twitter'],
        postsPerWeek: 3,
        weeks: 4,
      },
      response: { success: true, data: { posts: [] } },
      curl: `curl -X POST https://example.com/api/v1/social-media/posts/generate-plan \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"topics":["KI"],"platforms":["linkedin"],"postsPerWeek":3,"weeks":2}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/posts/:id/publish',
      summary: 'Beitrag auf Plattform(en) veroeffentlichen',
      description:
        'Veroeffentlicht einen Beitrag auf einer oder mehreren Social-Media-Plattformen. Setzt den Status auf posted bei Erfolg.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Beitrags' },
      ],
      requestBody: {
        platforms: ['linkedin', 'twitter'],
        imageUrl: 'https://example.com/image.jpg',
        link: 'https://example.com/artikel',
      },
      response: {
        success: true,
        data: {
          postId: 'uuid',
          results: { linkedin: { success: true }, twitter: { success: true } },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/social-media/posts/POST_ID/publish \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"platforms":["linkedin"]}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/social-media/posts/:id/improve',
      summary: 'Beitrag per KI verbessern',
      description: 'Verbessert den Inhalt eines bestehenden Social-Media-Beitrags per KI anhand von Anweisungen.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Beitrags' },
      ],
      requestBody: { instructions: 'Kuerzer und praegnanter formulieren' },
      response: { success: true, data: { improvedContent: '...' } },
      curl: `curl -X POST https://example.com/api/v1/social-media/posts/POST_ID/improve \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"instructions":"Kuerzer formulieren"}'`,
    },
    // --- Test Connection ---
    {
      method: 'POST',
      path: '/api/v1/social-media/test-connection',
      summary: 'Plattform-Verbindung testen',
      description: 'Testet die Verbindung zu einer Social-Media-Plattform (linkedin, twitter, facebook, instagram).',
      requestBody: { platform: 'linkedin' },
      response: { success: true, data: { connected: true, platform: 'linkedin' } },
      curl: `curl -X POST https://example.com/api/v1/social-media/test-connection \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"platform":"linkedin"}'`,
    },
  ],
}

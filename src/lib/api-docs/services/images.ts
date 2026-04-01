import type { ApiService } from '../types'

export const imagesService: ApiService = {
  name: 'Bildgenerierung',
  slug: 'images',
  description:
    'KI-gestuetzte Bildgenerierung mit Gemini, OpenAI oder KIE. Unterstuetzt verschiedene Groessen, Stile und Seitenverhaeltnisse. Bilder werden nach Kategorie organisiert.',
  basePath: '/api/v1/images',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/images',
      summary: 'Generierte Bilder auflisten',
      description: 'Paginierte Liste aller generierten Bilder. Filterbar nach Kategorie und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
        { name: 'category', in: 'query', required: false, type: 'string', description: 'Filtern nach Kategorie (social_media, website, blog, marketing, general)', example: 'social_media' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche', example: 'Banner' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/images?category=social_media&page=1" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/images/generate',
      summary: 'Bild per KI generieren',
      description:
        'Generiert ein Bild per KI. Unterstuetzte Provider: gemini, openai, kie. Optionale Parameter fuer Groesse, Stil, Qualitaet und Seitenverhaeltnis.',
      requestBody: {
        prompt: 'Ein modernes Buero mit KI-Roboter am Schreibtisch',
        provider: 'gemini',
        model: 'imagen-3',
        size: '1024x1024',
        style: 'vivid',
        quality: 'hd',
        aspectRatio: '1:1',
        category: 'marketing',
        tags: ['buero', 'ki', 'modern'],
      },
      response: {
        success: true,
        data: { id: 'uuid', url: 'https://...', prompt: '...', provider: 'gemini' },
      },
      curl: `curl -X POST https://example.com/api/v1/images/generate \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Modernes Buero mit KI-Roboter","provider":"gemini","category":"marketing"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/images/status',
      summary: 'Bildgenerierungs-Status pruefen',
      description:
        'Prueft den Status einer asynchronen Bildgenerierung anhand der Task-ID. Speichert das Ergebnis bei Fertigstellung.',
      requestBody: {
        taskId: 'task-id-123',
        prompt: 'Originaler Prompt',
        model: 'imagen-3',
        category: 'marketing',
      },
      response: {
        success: true,
        data: { status: 'completed', imageUrl: 'https://...' },
      },
      curl: `curl -X POST https://example.com/api/v1/images/status \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"taskId":"task-id-123"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/images/:id',
      summary: 'Generiertes Bild abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Bildes' },
      ],
      response: {
        success: true,
        data: { id: 'uuid', url: 'https://...', prompt: '...', category: 'marketing' },
      },
      curl: `curl -X GET https://example.com/api/v1/images/IMAGE_ID \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/images/:id',
      summary: 'Generiertes Bild loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Bildes' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/images/IMAGE_ID \\
  -b cookies.txt`,
    },
  ],
}

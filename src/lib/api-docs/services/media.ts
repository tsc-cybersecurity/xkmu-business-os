import type { ApiService } from '../types'

export const mediaService: ApiService = {
  name: 'Mediathek',
  slug: 'media',
  description:
    'Dateien hochladen, auflisten, ausliefern und loeschen. Unterstuetzt gaengige Bildformate (JPEG, PNG, WebP, GIF). Dateien werden mit Cache-Headern ausgeliefert.',
  basePath: '/api/v1/media',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/media',
      summary: 'Medien-Dateien auflisten',
      description: 'Paginierte Liste aller hochgeladenen Dateien des Mandanten.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite', example: '20' },
      ],
      response: { success: true, data: [], meta: { page: 1, limit: 20, total: 0 } },
      curl: `curl -X GET "https://example.com/api/v1/media?page=1&limit=20" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/media/upload',
      summary: 'Datei hochladen',
      description:
        'Laedt eine Datei per multipart/form-data hoch. Das Feld muss "file" heissen.',
      requestBody: {
        file: '(binary)',
      },
      response: {
        success: true,
        data: { id: 'uuid', filename: 'banner.jpg', url: '/api/v1/media/serve/org-id/banner.jpg', mimeType: 'image/jpeg', size: 102400 },
      },
      curl: `curl -X POST https://example.com/api/v1/media/upload \\
  -b cookies.txt \\
  -F "file=@/pfad/zur/datei.jpg"`,
    },
    {
      method: 'GET',
      path: '/api/v1/media/serve/:path',
      summary: 'Datei ausliefern',
      description:
        'Liefert eine hochgeladene Datei anhand ihres Pfads aus. Oeffentlich cachebar (max-age=1 Jahr). Pfad-Traversal wird verhindert.',
      params: [
        { name: 'path', in: 'path', required: true, type: 'string', description: 'Dateipfad (org-id/dateiname)', example: 'org-id/banner.jpg' },
      ],
      response: { note: 'Binary-Datei mit entsprechendem Content-Type' },
      curl: `curl -X GET https://example.com/api/v1/media/serve/ORG_ID/banner.jpg \\
  -o banner.jpg`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/media/:id',
      summary: 'Datei loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Datei' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/media/FILE_ID \\
  -b cookies.txt`,
    },
  ],
}

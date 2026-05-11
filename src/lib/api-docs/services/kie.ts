import type { ApiService } from '../types'

export const kieService: ApiService = {
  name: 'KIE Video-Generierung',
  slug: 'kie',
  description:
    'Adapter fuer die kie.ai API zur asynchronen Generierung von KI-Videos (Sora-/Veo-aehnliche Modelle). Erzeugt einen Task und liefert eine taskId; der finale Video-Status wird anschliessend per Polling abgefragt. Provider-Konfiguration erfolgt ueber /api/v1/ai-providers (Typ "kie"). Erfordert Modul-Berechtigung "ai_providers".',
  basePath: '/api/v1/kie',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/kie/generate',
      summary: 'Video-Generierung starten',
      description:
        'Startet einen asynchronen Video-Generierungs-Task. prompt ist Pflicht. Optionale Parameter: model, aspectRatio (z. B. "16:9"), mode ("fast"/"quality"), sound (boolean), multiShots (boolean), imageUrls (Image-to-Video). Erfordert Berechtigung "ai_providers.create".',
      requestBody: {
        prompt: 'Drohnenflug ueber eine moderne Fabrikhalle bei Sonnenaufgang, cinematisch',
        model: 'sora-2',
        aspectRatio: '16:9',
        mode: 'quality',
        sound: true,
        multiShots: false,
        imageUrls: [],
      },
      response: {
        success: true,
        data: {
          taskId: 'kie-task-7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c',
          status: 'queued',
          createdAt: '2026-05-11T12:04:18.012Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/kie/generate \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"prompt":"Drohnenflug ueber eine Fabrikhalle bei Sonnenaufgang","aspectRatio":"16:9","mode":"quality"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/kie/status/{taskId}',
      summary: 'Task-Status abfragen',
      description:
        'Fragt den Status eines laufenden oder abgeschlossenen Video-Tasks ab. status ist einer von queued, processing, completed, failed. Bei completed enthaelt data.videoUrl die fertige Video-URL. Erfordert Berechtigung "ai_providers.read".',
      params: [
        { name: 'taskId', in: 'path', required: true, type: 'string', description: 'Task-ID, die von /generate zurueckgegeben wurde', example: 'kie-task-7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c' },
      ],
      response: {
        success: true,
        data: {
          taskId: 'kie-task-7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c',
          status: 'completed',
          progress: 100,
          videoUrl: 'https://cdn.kie.ai/videos/7f8a9b0c.mp4',
          durationSeconds: 8,
          completedAt: '2026-05-11T12:06:42.418Z',
        },
      },
      curl: `curl https://example.com/api/v1/kie/status/kie-task-7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c \\
  -b cookies.txt`,
    },
  ],
}

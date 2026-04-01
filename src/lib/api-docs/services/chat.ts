import type { ApiService } from '../types'

export const chatService: ApiService = {
  name: 'Chat',
  slug: 'chat',
  description:
    'KI-Chat mit Konversationsverlauf. Nachrichten werden als Server-Sent Events gestreamt. Unterstuetzt Kontext-Uebergabe und Provider-Auswahl.',
  basePath: '/api/v1/chat',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/chat',
      summary: 'Chat-Nachricht senden',
      description:
        'Sendet eine Nachricht an den KI-Assistenten. Erstellt automatisch eine neue Konversation falls keine conversationId angegeben ist. Die Antwort wird als Server-Sent Events (SSE) gestreamt mit den Typen: meta (conversationId), text (Inhaltschunks), done.',
      requestBody: {
        message: 'Was sind die wichtigsten KPIs fuer ein KMU?',
        providerId: 'provider-uuid',
        conversationId: 'conv-uuid',
        context: {
          module: 'dashboard',
          data: { revenue: 100000 },
        },
      },
      response: {
        note: 'SSE-Stream mit data-Chunks',
        events: [
          { type: 'meta', conversationId: 'conv-uuid' },
          { type: 'text', content: 'Die wichtig' },
          { type: 'text', content: 'sten KPIs...' },
          { type: 'done' },
        ],
      },
      curl: `curl -X POST https://example.com/api/v1/chat \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{"message":"Was sind wichtige KPIs fuer ein KMU?"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/chat/conversations',
      summary: 'Konversationen auflisten',
      description: 'Gibt die letzten Konversationen des angemeldeten Benutzers zurueck (max. 100).',
      params: [
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Anzahl der Konversationen (Standard: 50, max: 100)', example: '50' },
      ],
      response: { success: true, data: [] },
      curl: `curl -X GET "https://example.com/api/v1/chat/conversations?limit=50" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/chat/conversations/:id',
      summary: 'Konversation abrufen',
      description: 'Gibt eine einzelne Konversation mit allen Nachrichten zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Konversation' },
      ],
      response: {
        success: true,
        data: {
          id: 'conv-uuid',
          title: 'KPIs fuer KMU',
          messages: [
            { role: 'user', content: 'Was sind wichtige KPIs?' },
            { role: 'assistant', content: 'Die wichtigsten KPIs...' },
          ],
        },
      },
      curl: `curl -X GET https://example.com/api/v1/chat/conversations/CONV_ID \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/chat/conversations/:id',
      summary: 'Konversation loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Konversation' },
      ],
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/chat/conversations/CONV_ID \\
  -b cookies.txt`,
    },
  ],
}

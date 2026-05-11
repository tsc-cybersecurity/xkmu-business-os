import type { ApiService } from '../types'

export const aiLogsService: ApiService = {
  name: 'KI-Aufruf-Logs',
  slug: 'ai-logs',
  description:
    'Revisionssichere Protokollierung aller KI-Aufrufe (Prompts, Antworten, Tokens, Kosten, Latenzen). Read-only — Logs werden automatisch durch den AiProviderService erzeugt. Erfordert Modul-Berechtigung "ai_logs".',
  basePath: '/api/v1/ai-logs',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/ai-logs',
      summary: 'KI-Logs auflisten',
      description:
        'Liefert paginierte KI-Aufruf-Logs mit optionalen Filtern. Erfordert Berechtigung "ai_logs.read". Maximum 100 Eintraege pro Seite.',
      params: [
        { name: 'providerType', in: 'query', required: false, type: 'string', description: 'Filter nach Provider-Typ (openai, gemini, openrouter, ollama, deepseek, kimi, kie, firecrawl, serpapi)', example: 'openai' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filter nach Status (success, error)', example: 'success' },
        { name: 'feature', in: 'query', required: false, type: 'string', description: 'Filter nach Feature/Modul (z.B. "leads.qualification")', example: 'leads.qualification' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Volltextsuche in Prompt/Response', example: 'Mustermann GmbH' },
        { name: 'dateFrom', in: 'query', required: false, type: 'string', description: 'Start-Datum (ISO 8601)', example: '2026-05-01' },
        { name: 'dateTo', in: 'query', required: false, type: 'string', description: 'End-Datum (ISO 8601)', example: '2026-05-11' },
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (default 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (max 100)', example: '50' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'log-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            providerId: 'pr0v1d3r-1234-5678-9abc-def012345678',
            providerType: 'openai',
            model: 'gpt-4o-mini',
            feature: 'leads.qualification',
            status: 'success',
            promptTokens: 842,
            completionTokens: 213,
            totalTokens: 1055,
            costEur: 0.0021,
            latencyMs: 1842,
            createdAt: '2026-05-11T08:42:17.391Z',
          },
        ],
        meta: { page: 1, limit: 50, total: 1247, totalPages: 25 },
      },
      curl: `curl "https://example.com/api/v1/ai-logs?providerType=openai&status=success&page=1&limit=50" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ai-logs/stats',
      summary: 'Aggregierte Log-Statistiken',
      description:
        'Liefert aggregierte Kennzahlen ueber alle KI-Aufrufe: Gesamtkosten, Tokens, Erfolgsquote, Aufrufe pro Provider und Feature. Erfordert Berechtigung "ai_logs.read".',
      response: {
        success: true,
        data: {
          totalCalls: 1247,
          successRate: 0.987,
          totalTokens: 1843921,
          totalCostEur: 12.84,
          avgLatencyMs: 1620,
          byProvider: [
            { providerType: 'openai', calls: 812, costEur: 9.42 },
            { providerType: 'gemini', calls: 312, costEur: 2.18 },
            { providerType: 'ollama', calls: 123, costEur: 0 },
          ],
          byFeature: [
            { feature: 'leads.qualification', calls: 521 },
            { feature: 'documents.summarize', calls: 318 },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/ai-logs/stats \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ai-logs/{id}',
      summary: 'Einzelnes Log abrufen',
      description:
        'Liefert einen einzelnen Log-Eintrag mit vollstaendigem Prompt und Response (nicht in der Listenansicht enthalten). Erfordert Berechtigung "ai_logs.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Log-ID (UUID)', example: 'log-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d' },
      ],
      response: {
        success: true,
        data: {
          id: 'log-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          providerType: 'openai',
          model: 'gpt-4o-mini',
          feature: 'leads.qualification',
          status: 'success',
          prompt: 'Bewerte folgenden Lead nach BANT: Firma "Mustermann GmbH"...',
          response: '{"score":78,"reasoning":"Hohes Budget, klare Timeline..."}',
          promptTokens: 842,
          completionTokens: 213,
          totalTokens: 1055,
          costEur: 0.0021,
          latencyMs: 1842,
          createdAt: '2026-05-11T08:42:17.391Z',
        },
      },
      curl: `curl https://example.com/api/v1/ai-logs/log-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d \\
  -b cookies.txt`,
    },
  ],
}

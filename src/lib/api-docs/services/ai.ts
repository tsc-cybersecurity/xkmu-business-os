import type { ApiService } from '../types'

export const aiService: ApiService = {
  name: 'KI & AI-Provider',
  slug: 'ai',
  description:
    'KI-Completion, Recherche, Status-Abfrage und Verwaltung von KI-Anbietern (Ollama, OpenRouter, Gemini, OpenAI, DeepSeek, Kimi, Firecrawl, KIE, SerpAPI).',
  basePath: '/api/v1/ai',
  auth: 'session',
  endpoints: [
    // --- AI Completion ---
    {
      method: 'POST',
      path: '/api/v1/ai/completion',
      summary: 'KI-Completion ausfuehren',
      description:
        'Sendet einen Prompt an den konfigurierten KI-Provider und gibt die Antwort zurueck. Rate-Limit: 30 Anfragen pro Minute pro IP.',
      requestBody: {
        prompt: 'Erklaere die Vorteile von KI fuer KMU',
        maxTokens: 1000,
        temperature: 0.7,
        model: 'gpt-4',
        providerId: 'provider-uuid',
        systemPrompt: 'Du bist ein hilfreicher KI-Berater.',
      },
      response: {
        success: true,
        data: { text: 'KI bietet KMU...', model: 'gpt-4', tokensUsed: 250 },
      },
      curl: `curl -X POST https://example.com/api/v1/ai/completion \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Erklaere KI fuer KMU","maxTokens":1000,"temperature":0.7}'`,
    },
    // --- AI Research ---
    {
      method: 'POST',
      path: '/api/v1/ai/research',
      summary: 'Unternehmensrecherche per KI',
      description: 'Fuehrt eine KI-gestuetzte Recherche zu einem Unternehmen durch.',
      requestBody: { companyName: 'Mustermann GmbH' },
      response: {
        success: true,
        data: { summary: '...', industry: '...', employees: '...' },
      },
      curl: `curl -X POST https://example.com/api/v1/ai/research \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"companyName":"Mustermann GmbH"}'`,
    },
    // --- AI Status ---
    {
      method: 'GET',
      path: '/api/v1/ai/status',
      summary: 'KI-Provider-Status abfragen',
      description:
        'Gibt den Verfuegbarkeitsstatus aller konfigurierten KI-Provider zurueck (DB-basiert und Legacy-Fallback).',
      response: {
        success: true,
        data: {
          available: true,
          providers: [
            { id: 'uuid', name: 'OpenAI', providerType: 'openai', model: 'gpt-4', available: true },
          ],
        },
      },
      curl: `curl -X GET https://example.com/api/v1/ai/status \\
  -b cookies.txt`,
    },
    // --- AI Providers ---
    {
      method: 'GET',
      path: '/api/v1/ai-providers',
      summary: 'KI-Anbieter auflisten',
      description: 'Gibt alle konfigurierten KI-Anbieter zurueck. API-Keys werden maskiert (nur letzte 4 Zeichen).',
      response: {
        success: true,
        data: [
          { id: 'uuid', providerType: 'openai', name: 'OpenAI GPT-4', model: 'gpt-4', apiKey: '****abcd', isActive: true },
        ],
      },
      curl: `curl -X GET https://example.com/api/v1/ai-providers \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ai-providers',
      summary: 'KI-Anbieter erstellen',
      description:
        'Erstellt einen neuen KI-Anbieter. Erlaubte Typen: ollama, openrouter, gemini, openai, deepseek, kimi, firecrawl, kie, serpapi. Cloud-Provider erfordern einen API-Key.',
      requestBody: {
        providerType: 'openai',
        name: 'OpenAI GPT-4',
        apiKey: 'sk-...',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        priority: 0,
        isActive: true,
        isDefault: true,
      },
      response: {
        success: true,
        data: { id: 'uuid', providerType: 'openai', name: 'OpenAI GPT-4', apiKey: '****...' },
      },
      curl: `curl -X POST https://example.com/api/v1/ai-providers \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"providerType":"openai","name":"OpenAI GPT-4","apiKey":"sk-...","model":"gpt-4"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/ai-providers/:id',
      summary: 'KI-Anbieter abrufen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Anbieters' },
      ],
      response: {
        success: true,
        data: { id: 'uuid', providerType: 'openai', name: 'OpenAI GPT-4', apiKey: '****abcd' },
      },
      curl: `curl -X GET https://example.com/api/v1/ai-providers/PROVIDER_ID \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/ai-providers/:id',
      summary: 'KI-Anbieter aktualisieren',
      description:
        'Aktualisiert einen KI-Anbieter. API-Keys die mit **** beginnen werden ignoriert (nicht ueberschrieben).',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Anbieters' },
      ],
      requestBody: {
        name: 'OpenAI GPT-4 Turbo',
        model: 'gpt-4-turbo',
        maxTokens: 2000,
        isDefault: true,
      },
      response: {
        success: true,
        data: { id: 'uuid', name: 'OpenAI GPT-4 Turbo', model: 'gpt-4-turbo' },
      },
      curl: `curl -X PUT https://example.com/api/v1/ai-providers/PROVIDER_ID \\
  -b cookies.txt \\
  -H "Content-Type: application/json" \\
  -d '{"name":"OpenAI GPT-4 Turbo","model":"gpt-4-turbo","maxTokens":2000}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/ai-providers/:id',
      summary: 'KI-Anbieter loeschen',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Anbieters' },
      ],
      response: { success: true, data: { message: 'KI-Anbieter erfolgreich geloescht' } },
      curl: `curl -X DELETE https://example.com/api/v1/ai-providers/PROVIDER_ID \\
  -b cookies.txt`,
    },
  ],
}

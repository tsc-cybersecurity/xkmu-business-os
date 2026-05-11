import type { ApiService } from '../types'

export const aiProvidersService: ApiService = {
  name: 'KI-Anbieter',
  slug: 'ai-providers',
  description:
    'Konfiguration der nutzbaren KI-Provider (OpenAI, Gemini, OpenRouter, Ollama, DeepSeek, Kimi, Firecrawl, kie, SerpAPI). Verwaltet API-Keys, Modelle, Token-Limits, Temperatur und Routing-Prioritaeten. API-Schluessel werden in allen Responses maskiert (****<letzte4>). Erfordert Modul-Berechtigung "ai_providers".',
  basePath: '/api/v1/ai-providers',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/ai-providers',
      summary: 'Alle Provider auflisten',
      description: 'Liefert alle konfigurierten KI-Provider mit maskierten API-Keys. Erfordert Berechtigung "ai_providers.read".',
      response: {
        success: true,
        data: [
          {
            id: 'pr0v1d3r-1234-5678-9abc-def012345678',
            providerType: 'openai',
            name: 'OpenAI Production',
            apiKey: '****a4Df',
            baseUrl: null,
            model: 'gpt-4o-mini',
            maxTokens: 2000,
            temperature: 0.7,
            priority: 10,
            isActive: true,
            isDefault: true,
          },
          {
            id: 'pr0v1d3r-aaaa-bbbb-cccc-dddddddddddd',
            providerType: 'ollama',
            name: 'Lokales Ollama',
            apiKey: null,
            baseUrl: 'http://localhost:11434',
            model: 'llama3.2',
            maxTokens: 1000,
            temperature: 0.5,
            priority: 1,
            isActive: true,
            isDefault: false,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/ai-providers \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ai-providers',
      summary: 'Neuen Provider erstellen',
      description:
        'Legt einen neuen KI-Provider an. providerType muss einer von ollama, openrouter, gemini, openai, deepseek, kimi, firecrawl, kie, serpapi sein. Cloud-Provider benoetigen apiKey, alle ausser firecrawl/kie/serpapi benoetigen ein model. Erfordert Berechtigung "ai_providers.create".',
      requestBody: {
        providerType: 'gemini',
        name: 'Google Gemini',
        apiKey: 'AIzaSyA...echterKey',
        model: 'gemini-2.5-flash',
        maxTokens: 2000,
        temperature: 0.7,
        priority: 5,
        isActive: true,
        isDefault: false,
      },
      response: {
        success: true,
        data: {
          id: 'pr0v1d3r-9999-8888-7777-666666666666',
          providerType: 'gemini',
          name: 'Google Gemini',
          apiKey: '****eKey',
          model: 'gemini-2.5-flash',
          priority: 5,
          isActive: true,
          isDefault: false,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/ai-providers \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"providerType":"gemini","name":"Google Gemini","apiKey":"AIza...","model":"gemini-2.5-flash"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/ai-providers/{id}',
      summary: 'Einzelnen Provider abrufen',
      description: 'Liefert einen einzelnen KI-Provider mit maskiertem API-Key. Erfordert Berechtigung "ai_providers.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Provider-ID (UUID)', example: 'pr0v1d3r-1234-5678-9abc-def012345678' },
      ],
      response: {
        success: true,
        data: {
          id: 'pr0v1d3r-1234-5678-9abc-def012345678',
          providerType: 'openai',
          name: 'OpenAI Production',
          apiKey: '****a4Df',
          model: 'gpt-4o-mini',
          isActive: true,
        },
      },
      curl: `curl https://example.com/api/v1/ai-providers/pr0v1d3r-1234-5678-9abc-def012345678 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/ai-providers/{id}',
      summary: 'Provider aktualisieren',
      description:
        'Aktualisiert Felder eines KI-Providers. Wird apiKey im Format "****..." gesendet, bleibt der bestehende Schluessel unveraendert. Erfordert Berechtigung "ai_providers.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Provider-ID (UUID)', example: 'pr0v1d3r-1234-5678-9abc-def012345678' },
      ],
      requestBody: {
        name: 'OpenAI Production (4o)',
        model: 'gpt-4o',
        maxTokens: 4000,
        temperature: 0.5,
        priority: 20,
        isActive: true,
      },
      response: {
        success: true,
        data: {
          id: 'pr0v1d3r-1234-5678-9abc-def012345678',
          name: 'OpenAI Production (4o)',
          model: 'gpt-4o',
          apiKey: '****a4Df',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/ai-providers/pr0v1d3r-1234-5678-9abc-def012345678 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"model":"gpt-4o","maxTokens":4000}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/ai-providers/{id}',
      summary: 'Provider loeschen',
      description: 'Loescht einen KI-Provider unwiderruflich. Erfordert Berechtigung "ai_providers.delete".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Provider-ID (UUID)', example: 'pr0v1d3r-9999-8888-7777-666666666666' },
      ],
      response: {
        success: true,
        data: { message: 'KI-Anbieter erfolgreich geloescht' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/ai-providers/pr0v1d3r-9999-8888-7777-666666666666 \\
  -b cookies.txt`,
    },
  ],
}

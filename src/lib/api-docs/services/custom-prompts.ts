import type { ApiService } from '../types'

export const customPromptsService: ApiService = {
  name: 'Benutzerdefinierte Prompts',
  slug: 'custom-prompts',
  description:
    'Vom Benutzer erstellte AI-Workflows: benannte Prompts mit Kategorie/Icon/Farbe, optionalem Kontext-Mapping (z. B. Firma) und Ausfuehrungs-Endpoint. Prompts koennen aus einer natursprachlichen Beschreibung per LLM generiert werden. Erfordert Modul-Berechtigung "ai_prompts".',
  basePath: '/api/v1/custom-prompts',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/custom-prompts',
      summary: 'Custom-Prompts auflisten',
      description: 'Liefert alle benutzerdefinierten Prompts. Mit ?active=true werden nur aktive Eintraege zurueckgegeben. Erfordert Berechtigung "ai_prompts.read".',
      params: [
        { name: 'active', in: 'query', required: false, type: 'boolean', description: 'Nur aktive Prompts zurueckgeben', example: 'true' },
      ],
      response: {
        success: true,
        data: {
          prompts: [
            {
              id: 'cp-1111-2222-3333-4444-555555555555',
              name: 'Firma analysieren',
              description: 'Erstellt eine Kurzanalyse einer Firma anhand der CRM-Daten',
              category: 'sales',
              icon: 'Building2',
              color: '#2563eb',
              systemPrompt: 'Du bist ein B2B-Analyst.',
              userPrompt: 'Analysiere {{companyName}} aus Sicht eines Vertrieblers.',
              contextConfig: { source: 'company' },
              activityType: 'analysis',
              isActive: true,
              createdBy: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
              createdAt: '2026-05-02T14:21:08.011Z',
            },
          ],
        },
      },
      curl: `curl "https://example.com/api/v1/custom-prompts?active=true" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/custom-prompts',
      summary: 'Custom-Prompt erstellen',
      description:
        'Legt einen neuen benutzerdefinierten Prompt an. Felder name und userPrompt sind Pflicht. Erfordert Berechtigung "ai_prompts.create".',
      requestBody: {
        name: 'Firma analysieren',
        description: 'Erstellt eine Kurzanalyse einer Firma',
        category: 'sales',
        icon: 'Building2',
        color: '#2563eb',
        systemPrompt: 'Du bist ein B2B-Analyst.',
        userPrompt: 'Analysiere {{companyName}}.',
        contextConfig: { source: 'company' },
        activityType: 'analysis',
        isActive: true,
      },
      response: {
        success: true,
        data: { id: 'cp-1111-2222-3333-4444-555555555555', name: 'Firma analysieren' },
      },
      curl: `curl -X POST https://example.com/api/v1/custom-prompts \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Firma analysieren","userPrompt":"Analysiere {{companyName}}."}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/custom-prompts/generate',
      summary: 'Prompt-Inhalt per LLM generieren',
      description:
        'LLM-gestuetzte Generierung von systemPrompt und userPrompt aus einer freitextlichen Beschreibung. Erwartet description (min 10 Zeichen). Erfordert Berechtigung "ai_prompts.create".',
      requestBody: {
        description: 'Ich brauche einen Prompt, der zu einer Firma eine knappe SWOT-Analyse erstellt.',
      },
      response: {
        success: true,
        data: {
          name: 'SWOT-Analyse',
          systemPrompt: 'Du bist ein erfahrener Strategieberater...',
          userPrompt: 'Erstelle eine SWOT-Analyse fuer {{companyName}}.',
          category: 'strategy',
          icon: 'Target',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/custom-prompts/generate \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"description":"Ich brauche einen Prompt, der zu einer Firma eine SWOT-Analyse erstellt."}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/custom-prompts/{id}',
      summary: 'Einzelnen Prompt abrufen',
      description: 'Liefert einen einzelnen benutzerdefinierten Prompt. Erfordert Berechtigung "ai_prompts.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Prompt-ID (UUID)', example: 'cp-1111-2222-3333-4444-555555555555' },
      ],
      response: {
        success: true,
        data: {
          id: 'cp-1111-2222-3333-4444-555555555555',
          name: 'Firma analysieren',
          userPrompt: 'Analysiere {{companyName}}.',
          isActive: true,
        },
      },
      curl: `curl https://example.com/api/v1/custom-prompts/cp-1111-2222-3333-4444-555555555555 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/custom-prompts/{id}',
      summary: 'Custom-Prompt aktualisieren',
      description: 'Aktualisiert Felder eines benutzerdefinierten Prompts. Erfordert Berechtigung "ai_prompts.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Prompt-ID (UUID)', example: 'cp-1111-2222-3333-4444-555555555555' },
      ],
      requestBody: {
        name: 'Firma analysieren v2',
        userPrompt: 'Analysiere {{companyName}} mit Fokus auf Mittelstand.',
        isActive: true,
      },
      response: {
        success: true,
        data: { id: 'cp-1111-2222-3333-4444-555555555555', name: 'Firma analysieren v2' },
      },
      curl: `curl -X PUT https://example.com/api/v1/custom-prompts/cp-1111-2222-3333-4444-555555555555 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Firma analysieren v2"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/custom-prompts/{id}',
      summary: 'Custom-Prompt loeschen',
      description: 'Loescht einen benutzerdefinierten Prompt. Erfordert Berechtigung "ai_prompts.delete".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Prompt-ID (UUID)', example: 'cp-1111-2222-3333-4444-555555555555' },
      ],
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/custom-prompts/cp-1111-2222-3333-4444-555555555555 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/custom-prompts/{id}/execute',
      summary: 'Prompt ausfuehren',
      description:
        'Fuehrt den Prompt mit dem konfigurierten Kontext (z. B. einer Firma per companyId) aus und liefert die KI-Antwort zurueck. Erfordert Berechtigung "ai_prompts.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Prompt-ID (UUID)', example: 'cp-1111-2222-3333-4444-555555555555' },
      ],
      requestBody: {
        companyId: 'c0mp4ny0-1234-5678-9abc-def012345678',
      },
      response: {
        success: true,
        data: {
          output: 'Die Mustermann GmbH agiert im Maschinenbau mit Schwerpunkt...',
          providerType: 'openai',
          model: 'gpt-4o-mini',
          tokensUsed: 1842,
          costEur: 0.0042,
          latencyMs: 2104,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/custom-prompts/cp-1111-2222-3333-4444-555555555555/execute \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"companyId":"c0mp4ny0-1234-5678-9abc-def012345678"}'`,
    },
  ],
}

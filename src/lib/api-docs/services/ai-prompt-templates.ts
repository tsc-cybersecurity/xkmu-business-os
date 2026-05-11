import type { ApiService } from '../types'

export const aiPromptTemplatesService: ApiService = {
  name: 'KI-Prompt-Vorlagen',
  slug: 'ai-prompt-templates',
  description:
    'Verwaltung systemeigener Prompt-Vorlagen (system + user Prompt, optionales Output-Format/JSON-Schema). Templates besitzen einen eindeutigen Slug und koennen auf den ausgelieferten Default zurueckgesetzt werden. Erfordert Modul-Berechtigung "ai_prompts".',
  basePath: '/api/v1/ai-prompt-templates',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/ai-prompt-templates',
      summary: 'Alle Vorlagen auflisten',
      description:
        'Liefert alle Prompt-Vorlagen inkl. verfuegbarer Platzhalter ({{companyName}}, {{contactName}}, ...). Erfordert Berechtigung "ai_prompts.read".',
      response: {
        success: true,
        data: {
          templates: [
            {
              id: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              slug: 'lead-qualification',
              name: 'Lead-Qualifizierung (BANT)',
              description: 'Bewertet eingehende Leads nach BANT-Kriterien',
              systemPrompt: 'Du bist ein Vertriebs-Analyst...',
              userPrompt: 'Bewerte folgenden Lead: {{leadDescription}}',
              outputFormat: 'json',
              isActive: true,
              isDefault: true,
              createdAt: '2026-04-12T09:00:00.000Z',
            },
          ],
          placeholders: ['{{companyName}}', '{{contactName}}', '{{leadDescription}}'],
        },
      },
      curl: `curl https://example.com/api/v1/ai-prompt-templates \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/ai-prompt-templates',
      summary: 'Neue Vorlage erstellen',
      description:
        'Erstellt eine neue Prompt-Vorlage. Felder slug, name, systemPrompt und userPrompt sind Pflicht. Slug muss eindeutig sein. Erfordert Berechtigung "ai_prompts.create".',
      requestBody: {
        slug: 'email-followup',
        name: 'E-Mail Follow-up',
        description: 'Generiert hoefliche Follow-up-Mails an Leads',
        systemPrompt: 'Du bist ein professioneller B2B-Vertriebler. Schreibe verbindlich, kurz, ohne Floskeln.',
        userPrompt: 'Schreibe eine Follow-up-Mail an {{contactName}} ({{companyName}}) zum Thema {{topic}}.',
        outputFormat: 'text',
        isActive: true,
        isDefault: false,
      },
      response: {
        success: true,
        data: {
          id: 'tpl-12345678-1234-1234-1234-123456789012',
          slug: 'email-followup',
          name: 'E-Mail Follow-up',
          isActive: true,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/ai-prompt-templates \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"slug":"email-followup","name":"E-Mail Follow-up","systemPrompt":"Du bist...","userPrompt":"Schreibe..."}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/ai-prompt-templates/seed',
      summary: 'Standard-Vorlagen erstellen',
      description:
        'Erstellt alle ausgelieferten Standard-Templates (idempotent — vorhandene Slugs werden uebersprungen). Erfordert Berechtigung "ai_prompts.create".',
      response: {
        success: true,
        data: {
          seeded: true,
          templates: [
            { id: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee', slug: 'lead-qualification' },
            { id: 'tpl-bbbb-cccc-dddd-eeee-ffffffffffff', slug: 'document-summary' },
          ],
        },
      },
      curl: `curl -X POST https://example.com/api/v1/ai-prompt-templates/seed \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/ai-prompt-templates/{id}',
      summary: 'Einzelne Vorlage abrufen',
      description: 'Liefert eine einzelne Prompt-Vorlage. Erfordert Berechtigung "ai_prompts.read".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)', example: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      ],
      response: {
        success: true,
        data: {
          id: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          slug: 'lead-qualification',
          name: 'Lead-Qualifizierung (BANT)',
          systemPrompt: 'Du bist ein Vertriebs-Analyst...',
          userPrompt: 'Bewerte folgenden Lead: {{leadDescription}}',
          outputFormat: 'json',
          isActive: true,
          isDefault: true,
        },
      },
      curl: `curl https://example.com/api/v1/ai-prompt-templates/tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/ai-prompt-templates/{id}',
      summary: 'Vorlage aktualisieren',
      description: 'Aktualisiert Felder einer Prompt-Vorlage. Slug ist nicht aenderbar. Erfordert Berechtigung "ai_prompts.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)', example: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      ],
      requestBody: {
        name: 'Lead-Qualifizierung (BANT) v2',
        systemPrompt: 'Du bist ein Vertriebs-Analyst mit Fokus auf Mittelstand...',
        userPrompt: 'Bewerte folgenden Lead: {{leadDescription}}',
        outputFormat: 'json',
        isActive: true,
      },
      response: {
        success: true,
        data: { id: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Lead-Qualifizierung (BANT) v2' },
      },
      curl: `curl -X PUT https://example.com/api/v1/ai-prompt-templates/tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Lead-Qualifizierung (BANT) v2"}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/ai-prompt-templates/{id}',
      summary: 'Auf Standard zuruecksetzen',
      description: 'Setzt eine Vorlage auf den ausgelieferten Default zurueck. Funktioniert nur, wenn ein Default fuer diesen Slug existiert. Erfordert Berechtigung "ai_prompts.update".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)', example: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      ],
      response: {
        success: true,
        data: { id: 'tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee', slug: 'lead-qualification', name: 'Lead-Qualifizierung (BANT)' },
      },
      curl: `curl -X PATCH https://example.com/api/v1/ai-prompt-templates/tpl-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/ai-prompt-templates/{id}',
      summary: 'Vorlage loeschen',
      description: 'Loescht eine Prompt-Vorlage. Standard-Vorlagen koennen nicht geloescht werden. Erfordert Berechtigung "ai_prompts.delete".',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'Template-ID (UUID)', example: 'tpl-12345678-1234-1234-1234-123456789012' },
      ],
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/ai-prompt-templates/tpl-12345678-1234-1234-1234-123456789012 \\
  -b cookies.txt`,
    },
  ],
}

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiDocAnnotations, type ApiDocAnnotation } from '@/lib/db/schema'
import { AIService, type AIRequestContext } from '@/lib/services/ai/ai.service'
import { logger } from '@/lib/utils/logger'
import { DISCOVERED_SOURCES } from '@/lib/api-docs/discovered-sources.server'

interface GeneratedAnnotation {
  summary: string
  description?: string
  requestBody?: unknown
  responseExample?: unknown
  curlExample: string
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const m = text.match(/[\[{][\s\S]*[\]}]/)
  return m ? m[0] : null
}

function readRouteSource(method: string, path: string): string | null {
  return DISCOVERED_SOURCES[`${method} ${path}`] || null
}

function buildPrompt(method: string, path: string, source: string): string {
  return `Du bist API-Dokumentations-Experte. Hier ist der Quellcode eines Next.js-API-Route-Handlers.
Erzeuge eine prazise, kompakte Doku im strikten JSON-Format.

METHOD: ${method}
PATH: ${path}

SOURCE:
\`\`\`typescript
${source}
\`\`\`

Liefere ausschliesslich gueltiges JSON ohne Markdown-Fences nach diesem Schema:
{
  "summary": "Kurze 1-Zeilen-Beschreibung in deutscher Sprache, max 80 Zeichen",
  "description": "2-4 Saetze: Was tut der Endpoint? Welche Auth-/Permission-Anforderung? Welche Seiteneffekte? Rate-Limits falls erkennbar.",
  "requestBody": null oder JSON-Objekt mit realistischem Beispiel-Body (aus Zod-Schema abgeleitet falls vorhanden),
  "responseExample": JSON-Objekt mit realistischem Antwort-Beispiel im Format { "success": true, "data": ... } oder bei Fehler { "success": false, "error": { "code": "...", "message": "..." } },
  "curlExample": "Mehrzeiliges cURL-Beispiel mit https://www.xkmu.de als Basis. Bei session-auth -b cookies.txt nutzen. Bei mutations -H 'Content-Type: application/json' und -d '...' nutzen."
}

Wichtig:
- summary in deutscher Sprache
- description deutsch, fachlich praezise
- bei Listen-Endpoints (GET ohne {id} im Pfad): responseExample mit data:[]-Array + meta-Objekt
- bei Detail-Endpoints (GET mit {id}): einzelnes Objekt
- requestBody nur bei POST/PUT/PATCH und wenn ein Body sinnvoll ist
- curlExample muss tatsaechlich funktional sein, keine Platzhalter-Variablen`
}

function safeParseAnnotation(raw: string): GeneratedAnnotation | null {
  const jsonStr = extractJson(raw)
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const summary = String(parsed.summary || '').slice(0, 200)
    if (!summary) return null
    return {
      summary,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      requestBody: parsed.requestBody === null ? null : parsed.requestBody,
      responseExample: parsed.responseExample ?? null,
      curlExample: String(parsed.curlExample || ''),
    }
  } catch {
    return null
  }
}

export const ApiDocAnnotationService = {
  async getAll(): Promise<ApiDocAnnotation[]> {
    return db.select().from(apiDocAnnotations)
  },

  async getByMethodPath(method: string, path: string): Promise<ApiDocAnnotation | null> {
    const rows = await db
      .select()
      .from(apiDocAnnotations)
      .where(and(eq(apiDocAnnotations.method, method), eq(apiDocAnnotations.path, path)))
      .limit(1)
    return rows[0] ?? null
  },

  async generate(method: string, path: string, userId: string): Promise<ApiDocAnnotation> {
    const source = readRouteSource(method, path)
    if (!source) {
      throw new Error(`Quelldatei fuer ${method} ${path} nicht gefunden`)
    }

    const context: AIRequestContext = { userId, feature: 'api_docs_annotation' }
    const response = await AIService.completeWithContext(buildPrompt(method, path, source), context, {
      maxTokens: 1500,
      temperature: 0.2,
      systemPrompt: 'Du bist API-Dokumentations-Experte. Antworte ausschliesslich in JSON.',
    })

    const parsed = safeParseAnnotation(response.text)
    if (!parsed) {
      logger.error('API-Doc-Annotation: KI lieferte ungueltiges JSON', undefined, {
        module: 'ApiDocAnnotation',
        method,
        path,
        rawSample: response.text.slice(0, 500),
      })
      throw new Error('KI-Antwort konnte nicht als JSON geparst werden')
    }

    const row: typeof apiDocAnnotations.$inferInsert = {
      method,
      path,
      summary: parsed.summary,
      description: parsed.description ?? null,
      requestBody: (parsed.requestBody as unknown) ?? null,
      responseExample: (parsed.responseExample as unknown) ?? null,
      curlExample: parsed.curlExample,
      source: 'ai_generated',
      model: response.model,
      generatedAt: new Date(),
    }

    const [saved] = await db
      .insert(apiDocAnnotations)
      .values(row)
      .onConflictDoUpdate({
        target: [apiDocAnnotations.method, apiDocAnnotations.path],
        set: {
          summary: row.summary,
          description: row.description,
          requestBody: row.requestBody,
          responseExample: row.responseExample,
          curlExample: row.curlExample,
          source: row.source,
          model: row.model,
          generatedAt: row.generatedAt,
        },
      })
      .returning()
    return saved
  },
}

import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai/ai.service'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const { goal, category } = await request.json()
    if (!goal) return apiError('VALIDATION_ERROR', 'Vertragsziel ist erforderlich', 400)

    const systemPrompt = `Du bist ein erfahrener Wirtschaftsjurist fuer deutsche KMU. Erstelle einen Vertragstemplate-Entwurf basierend auf deutschem Recht (BGB, HGB, DSGVO).

Strukturiere den Vertrag in folgende Abschnitte:
1. Praeambel und Vertragsgegenstand
2. Leistungsbeschreibung
3. Verguetung und Zahlungsbedingungen
4. Laufzeit und Kuendigung
5. Haftung und Gewaehrleistung
6. Geheimhaltung
7. Datenschutz (DSGVO)
8. Schlussbestimmungen

Verwende {{Platzhalter}} fuer variable Inhalte (z.B. {{firmenname_auftraggeber}}, {{firmenname_auftragnehmer}}, {{vertragsbeginn}}, {{laufzeit}}).

Antworte als JSON:
{
  "name": "Template-Name",
  "description": "Kurzbeschreibung",
  "bodyHtml": "<h2>1. Praeambel</h2><p>...</p><h2>2. Leistungsbeschreibung</h2><p>...</p>...",
  "placeholders": [
    { "key": "firmenname_auftraggeber", "label": "Firma Auftraggeber", "type": "text", "required": true }
  ]
}`

    const userPrompt = `Erstelle einen Vertragstemplate fuer:\nKategorie: ${category || 'allgemein'}\nVertragsziel: ${goal}`

    try {
      const response = await AIService.completeWithContext(userPrompt, {
        userId: auth.userId,
        feature: 'contract_template_generation',
      }, { systemPrompt })

      let parsed
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        parsed = null
      }

      if (!parsed) {
        return apiSuccess({ raw: response.text, parsed: null })
      }

      return apiSuccess({
        name: parsed.name || 'Neues Template',
        description: parsed.description || '',
        category: category || 'consulting',
        bodyHtml: parsed.bodyHtml || '',
        placeholders: parsed.placeholders || [],
      })
    } catch (err) {
      return apiError('AI_ERROR', (err as Error).message, 500)
    }
  })
}

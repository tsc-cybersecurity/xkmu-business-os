import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

// POST /api/v1/seo/keywords - KI-basierte Keyword-Recherche
export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async (auth) => {
    try {
      const body = await request.json()
      const { keyword, language } = body as { keyword: string; language?: string }

      if (!keyword) return apiError('MISSING_KEYWORD', 'Keyword fehlt', 400)

      // Try SerpAPI if available
      let serpResults: unknown = null
      try {
        const providers = await AiProviderService.getActiveProviders(TENANT_ID)
        const serpProvider = providers.find(p => p.providerType === 'serpapi')
        if (serpProvider?.apiKey) {
          const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&hl=${language || 'de'}&gl=de&api_key=${serpProvider.apiKey}`
          const serpRes = await fetch(serpUrl, { signal: AbortSignal.timeout(15_000) })
          if (serpRes.ok) {
            const data = await serpRes.json()
            serpResults = {
              totalResults: data.search_information?.total_results,
              relatedSearches: (data.related_searches || []).map((r: { query: string }) => r.query).slice(0, 10),
              topResults: (data.organic_results || []).slice(0, 5).map((r: { title: string; link: string }) => ({ title: r.title, url: r.link })),
            }
          }
        }
      } catch { /* SerpAPI optional */ }

      const template = await AiPromptTemplateService.getOrDefault(TENANT_ID, 'seo_keywords')
      const serpContext = serpResults ? `SerpAPI-Daten: ${JSON.stringify(serpResults)}` : 'Keine SerpAPI-Daten verfuegbar.'

      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
        keyword, language: language || 'de', serpData: serpContext,
      })

      const response = await AIService.completeWithContext(userPrompt,
        { tenantId: TENANT_ID, feature: 'seo_keywords' },
        { maxTokens: 1500, temperature: 0.3, systemPrompt: template.systemPrompt })

      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      let analysis = null
      if (jsonMatch) {
        try { analysis = JSON.parse(jsonMatch[0]) } catch { /* raw fallback */ }
      }

      return apiSuccess({
        keyword,
        analysis: analysis || { raw: response.text },
        serpData: serpResults,
      })
    } catch {
      return apiServerError()
    }
  })
}

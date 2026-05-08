import { AiProviderService } from '@/lib/services/ai-provider.service'
import { logger } from '@/lib/utils/logger'
import type { NewsSearchResult, NewsSourceAdapter } from './source-adapter.types'

interface SerpApiNewsResult {
  title?: string
  link?: string
  snippet?: string
  source?: { name?: string } | string
  thumbnail?: string
  date?: string
}

interface SerpApiResponse {
  news_results?: SerpApiNewsResult[]
  error?: string
}

async function getApiKey(): Promise<string | null> {
  try {
    const providers = await AiProviderService.list()
    const provider = providers.find(
      (p: { providerType: string; isActive: boolean | null }) =>
        p.providerType === 'serpapi' && p.isActive,
    )
    return (provider as { apiKey?: string } | undefined)?.apiKey ?? null
  } catch {
    return null
  }
}

function mapResult(r: SerpApiNewsResult): NewsSearchResult | null {
  if (!r.title || !r.link) return null
  const sourceName =
    typeof r.source === 'string' ? r.source : r.source?.name ?? undefined
  return {
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    source: sourceName,
    imageUrl: r.thumbnail,
    publishedAt: r.date ? new Date(r.date) : undefined,
  }
}

// Hard-Cutoff für News-Alter — defensiv, unabhängig vom SerpAPI when-Parameter.
// Items ohne publishedAt werden durchgelassen (Adapter kann das Datum nicht immer extrahieren).
const MAX_AGE_HOURS = 48
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000

export const SerpApiNewsAdapter: NewsSourceAdapter = {
  async search(keywords, config) {
    const apiKey = await getApiKey()
    if (!apiKey) {
      logger.warn('SerpAPI provider not active — returning empty news results', {
        module: 'SerpApiNewsAdapter',
      })
      return []
    }
    if (!keywords.length) return []

    const num = Number((config as { maxResults?: unknown }).maxResults) || 10
    // dateRange-Hint an Google News weiterreichen ('1d', '2d', '7d', ...).
    // Default '2d' = letzte ~48h. Google's `when`-Parameter kennt 1h/4h/1d/7d/1y.
    // '2d' wird von Google teils akzeptiert; Hard-Cutoff unten greift unabhaengig.
    const dateRange = String((config as { dateRange?: unknown }).dateRange ?? '2d')
    const params = new URLSearchParams({
      engine: 'google_news',
      q: keywords.join(' '),
      hl: 'de',
      gl: 'de',
      num: String(num),
      when: dateRange,
      api_key: apiKey,
    })

    const url = `https://serpapi.com/search.json?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`SerpAPI request failed: ${res.status} ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as SerpApiResponse
    if (!data.news_results) return []

    const now = Date.now()
    return data.news_results
      .map(mapResult)
      .filter((x): x is NewsSearchResult => x !== null)
      .filter((x) => {
        if (!x.publishedAt) return true // Datum unbekannt → durchlassen
        return now - x.publishedAt.getTime() <= MAX_AGE_MS
      })
  },
}

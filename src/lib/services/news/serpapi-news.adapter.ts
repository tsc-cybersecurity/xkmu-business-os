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

// Hard-Cutoff abgeleitet aus dem dateRange-Setting. Ohne diese Ableitung
// (vorher: 48h fest) wurden 7d-Topics auf 48h beschnitten — Nischenkeywords
// fanden dann gar nichts. Items ohne publishedAt bleiben durchgelassen.
function cutoffMsFromDateRange(dateRange: string): number {
  const m = dateRange.match(/^(\d+)([hdwmy])$/)
  if (!m) return 48 * 60 * 60 * 1000
  const n = Number(m[1])
  const unit = m[2]
  const HOUR = 60 * 60 * 1000
  switch (unit) {
    case 'h': return n * HOUR
    case 'd': return n * 24 * HOUR
    case 'w': return n * 7 * 24 * HOUR
    case 'm': return n * 30 * 24 * HOUR
    case 'y': return n * 365 * 24 * HOUR
    default:  return 48 * HOUR
  }
}

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

    // Google News `when=` kennt nur diese Werte. Alles andere mapen wir
    // auf den naechstliegenden gueltigen Wert, statt einen 400 von SerpAPI
    // zu provozieren. Lowercase fuer Schreibweisen-Toleranz ("2D" -> "2d").
    const VALID_WHEN = new Set(['1h', '4h', '1d', '7d', '1y'])
    const rawDateRange = String((config as { dateRange?: unknown }).dateRange ?? '2d').toLowerCase().trim()
    const dateRange = VALID_WHEN.has(rawDateRange)
      ? rawDateRange
      : rawDateRange === '2d' || rawDateRange === '3d'
        ? '7d'                            // ≤7d → 7d
        : rawDateRange.endsWith('m')
          ? '1y'                          // 1m/3m/6m → 1y
          : '7d'                          // Fallback

    // Cutoff aus dem ORIGINALEN Setting ableiten (nicht aus dem gemappten
    // Google-Wert) — wenn User 7d eingestellt hat, kommen auch 7 Tage durch.
    const maxAgeMs = cutoffMsFromDateRange(rawDateRange)

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
        return now - x.publishedAt.getTime() <= maxAgeMs
      })
  },
}

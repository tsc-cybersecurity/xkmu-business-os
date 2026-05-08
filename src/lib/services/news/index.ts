import { SerpApiNewsAdapter } from './serpapi-news.adapter'
import type { NewsSourceAdapter } from './source-adapter.types'

export type { NewsSourceAdapter, NewsSearchResult } from './source-adapter.types'

const ADAPTERS: Record<string, NewsSourceAdapter> = {
  serpapi_news: SerpApiNewsAdapter,
}

export function resolveNewsAdapter(sourceType: string): NewsSourceAdapter {
  const adapter = ADAPTERS[sourceType]
  if (!adapter) {
    throw new Error(`Unknown news sourceType: ${sourceType}`)
  }
  return adapter
}

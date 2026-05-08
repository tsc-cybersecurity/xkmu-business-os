export interface NewsSearchResult {
  title: string
  url: string
  snippet?: string
  source?: string
  imageUrl?: string
  publishedAt?: Date
}

export interface NewsSourceAdapter {
  search(keywords: string[], config: Record<string, unknown>): Promise<NewsSearchResult[]>
}

// ============================================
// Firecrawl API Service
// Scrapes websites using the Firecrawl API
// ============================================

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape'

export interface FirecrawlResult {
  markdown: string
  title: string
  url: string
  success: boolean
  error?: string
}

export const FirecrawlService = {
  /**
   * Scrape a URL using the Firecrawl API and return markdown content
   */
  async scrape(url: string, apiKey: string): Promise<FirecrawlResult> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(FIRECRAWL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text()
        return {
          markdown: '',
          title: '',
          url,
          success: false,
          error: `Firecrawl API error (${response.status}): ${errorText}`,
        }
      }

      const data = await response.json()

      if (!data.success) {
        return {
          markdown: '',
          title: '',
          url,
          success: false,
          error: data.error || 'Firecrawl returned unsuccessful response',
        }
      }

      return {
        markdown: data.data?.markdown || '',
        title: data.data?.metadata?.title || '',
        url: data.data?.metadata?.sourceURL || url,
        success: true,
      }
    } catch (error) {
      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Firecrawl error',
      }
    }
  },
}

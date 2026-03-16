// ============================================
// Firecrawl API Service
// Scrapes websites using the Firecrawl API
// ============================================

import { AiProviderService } from '@/lib/services/ai-provider.service'

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v1'
const FIRECRAWL_API_URL = `${FIRECRAWL_API_BASE}/scrape`

export interface FirecrawlResult {
  markdown: string
  title: string
  url: string
  success: boolean
  error?: string
}

export interface FirecrawlCrawlPage {
  url: string
  title: string
  markdown: string
  scrapedAt: string
}

export interface FirecrawlCrawlResult {
  pages: FirecrawlCrawlPage[]
  success: boolean
  error?: string
}

export const FirecrawlService = {
  /**
   * Scrape a URL using the Firecrawl API and return markdown content
   */
  async scrape(url: string, apiKey: string, tenantId?: string): Promise<FirecrawlResult> {
    const startTime = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

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

      const result = {
        markdown: data.data?.markdown || '',
        title: data.data?.metadata?.title || '',
        url: data.data?.metadata?.sourceURL || url,
        success: true,
      }

      // Log success
      if (tenantId) {
        const durationMs = Date.now() - startTime
        AiProviderService.createLog({
          tenantId, providerType: 'firecrawl', model: 'scrape',
          prompt: url, response: `${result.markdown.length} Zeichen extrahiert`,
          status: 'success', durationMs, feature: 'web_scraping',
        }).catch(() => {})
      }

      return result
    } catch (error) {
      // Log error
      if (tenantId) {
        const durationMs = Date.now() - startTime
        AiProviderService.createLog({
          tenantId, providerType: 'firecrawl', model: 'scrape',
          prompt: url, status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          durationMs, feature: 'web_scraping',
        }).catch(() => {})
      }

      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Firecrawl error',
      }
    }
  },

  /**
   * Crawl an entire website using the Firecrawl /v1/crawl API
   * Polls for completion with 3s interval, max 120s timeout, max 20 pages
   */
  async crawl(url: string, apiKey: string): Promise<FirecrawlCrawlResult> {
    try {
      // Start crawl job
      const startResponse = await fetch(`${FIRECRAWL_API_BASE}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          url,
          limit: 20,
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      })

      if (!startResponse.ok) {
        const errorText = await startResponse.text()
        return {
          pages: [],
          success: false,
          error: `Firecrawl crawl start failed (${startResponse.status}): ${errorText}`,
        }
      }

      const startData = await startResponse.json()
      const crawlId = startData.id

      if (!crawlId) {
        return {
          pages: [],
          success: false,
          error: 'Firecrawl returned no crawl ID',
        }
      }

      // Poll for completion
      const maxWaitMs = 120000
      const pollIntervalMs = 3000
      const startTime = Date.now()

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))

        const statusResponse = await fetch(`${FIRECRAWL_API_BASE}/crawl/${crawlId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(15_000),
        })

        if (!statusResponse.ok) {
          continue
        }

        const statusData = await statusResponse.json()

        if (statusData.status === 'completed') {
          const pages: FirecrawlCrawlPage[] = (statusData.data || []).map((item: Record<string, unknown>) => ({
            url: (item.metadata as Record<string, string>)?.sourceURL || item.url || '',
            title: (item.metadata as Record<string, string>)?.title || '',
            markdown: (item as Record<string, string>).markdown || '',
            scrapedAt: new Date().toISOString(),
          }))

          return {
            pages,
            success: true,
          }
        }

        if (statusData.status === 'failed') {
          return {
            pages: [],
            success: false,
            error: statusData.error || 'Crawl failed',
          }
        }

        // Still crawling, continue polling
      }

      return {
        pages: [],
        success: false,
        error: 'Crawl timed out after 120 seconds',
      }
    } catch (error) {
      return {
        pages: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Firecrawl crawl error',
      }
    }
  },
}

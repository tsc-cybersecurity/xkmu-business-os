// ============================================
// Website Scraper Service
// Fetches and extracts text content from websites
// ============================================

export interface ScrapedWebsite {
  url: string
  title: string
  text: string
  metaDescription: string | null
  success: boolean
  error?: string
}

/**
 * Simple HTML-to-text extraction
 * Removes script/style/nav/footer tags and extracts meaningful text
 */
function htmlToText(html: string): string {
  let text = html

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '')
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '')
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&auml;/g, 'ä')
  text = text.replace(/&ouml;/g, 'ö')
  text = text.replace(/&uuml;/g, 'ü')
  text = text.replace(/&Auml;/g, 'Ä')
  text = text.replace(/&Ouml;/g, 'Ö')
  text = text.replace(/&Uuml;/g, 'Ü')
  text = text.replace(/&szlig;/g, 'ß')
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))

  // Replace block-level elements with newlines
  text = text.replace(/<(br|p|div|h[1-6]|li|tr|section|article)[^>]*>/gi, '\n')

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n[ \t]+/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

/**
 * Extract meta description from HTML
 */
function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)
  return match ? match[1] : null
}

/**
 * Extract page title from HTML
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : ''
}

/**
 * Normalize URL - ensures protocol and trailing consistency
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

/**
 * Scrape a single page and extract text content
 */
async function scrapePage(url: string): Promise<ScrapedWebsite> {
  const normalizedUrl = normalizeUrl(url)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; xKMU-BusinessOS/1.0; +https://xkmu.de)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        url: normalizedUrl,
        title: '',
        text: '',
        metaDescription: null,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        url: normalizedUrl,
        title: '',
        text: '',
        metaDescription: null,
        success: false,
        error: `Unexpected content type: ${contentType}`,
      }
    }

    const html = await response.text()
    const title = extractTitle(html)
    const metaDescription = extractMetaDescription(html)
    const text = htmlToText(html)

    return {
      url: normalizedUrl,
      title,
      text: text.substring(0, 15000), // Limit to 15k chars
      metaDescription,
      success: true,
    }
  } catch (error) {
    return {
      url: normalizedUrl,
      title: '',
      text: '',
      metaDescription: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    }
  }
}

/**
 * Try to find and scrape important subpages (Impressum, Kontakt, Über uns)
 */
async function scrapeSubpages(baseUrl: string): Promise<ScrapedWebsite[]> {
  const normalizedBase = normalizeUrl(baseUrl)
  // Remove trailing slash
  const base = normalizedBase.replace(/\/+$/, '')

  // German business-relevant subpages
  const subpages = [
    '/impressum',
    '/kontakt',
    '/ueber-uns',
    '/about',
    '/about-us',
    '/unternehmen',
    '/team',
    '/standorte',
    '/leistungen',
    '/produkte',
    '/services',
  ]

  const results: ScrapedWebsite[] = []

  // Fetch subpages in parallel (max 4 at once)
  const batchSize = 4
  for (let i = 0; i < subpages.length; i += batchSize) {
    const batch = subpages.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(path => scrapePage(`${base}${path}`))
    )
    results.push(...batchResults.filter(r => r.success && r.text.length > 50))
  }

  return results
}

// ============================================
// Exported Service
// ============================================
export const WebsiteScraperService = {
  /**
   * Scrape a website: main page + important subpages
   * Returns combined text content for AI analysis
   */
  async scrapeCompanyWebsite(url: string): Promise<{
    mainPage: ScrapedWebsite
    subPages: ScrapedWebsite[]
    combinedText: string
    success: boolean
  }> {
    console.log(`[WebsiteScraper] Starting scrape of: ${url}`)

    // 1. Scrape main page
    const mainPage = await scrapePage(url)

    if (!mainPage.success) {
      console.error(`[WebsiteScraper] Failed to scrape main page: ${mainPage.error}`)
      return {
        mainPage,
        subPages: [],
        combinedText: '',
        success: false,
      }
    }

    // 2. Scrape subpages
    const subPages = await scrapeSubpages(url)

    console.log(`[WebsiteScraper] Scraped ${subPages.length} subpages successfully`)

    // 3. Combine all text
    const parts: string[] = []

    parts.push(`=== HAUPTSEITE: ${mainPage.url} ===`)
    if (mainPage.title) parts.push(`Titel: ${mainPage.title}`)
    if (mainPage.metaDescription) parts.push(`Beschreibung: ${mainPage.metaDescription}`)
    parts.push(mainPage.text)
    parts.push('')

    for (const sub of subPages) {
      parts.push(`=== UNTERSEITE: ${sub.url} ===`)
      if (sub.title) parts.push(`Titel: ${sub.title}`)
      parts.push(sub.text)
      parts.push('')
    }

    // Limit total combined text to ~30k chars for AI context
    let combinedText = parts.join('\n')
    if (combinedText.length > 30000) {
      combinedText = combinedText.substring(0, 30000) + '\n\n[... Text gekürzt ...]'
    }

    return {
      mainPage,
      subPages,
      combinedText,
      success: true,
    }
  },
}

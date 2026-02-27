import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { FirecrawlResearchService } from '@/lib/services/firecrawl-research.service'
import { FirecrawlService } from '@/lib/services/firecrawl.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { db } from '@/lib/db'
import { aiProviders } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
    }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return {
        tenantId: payload.tenantId,
        userId: null,
      }
    }
  }

  return null
}

// POST /api/v1/companies/[id]/crawl - Start a full website crawl
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params

  try {
    const company = await CompanyService.getById(auth.tenantId, id)
    if (!company) {
      return apiNotFound('Company not found')
    }

    if (!company.website) {
      return apiError('NO_WEBSITE', 'Diese Firma hat keine Website hinterlegt', 400)
    }

    // Load Firecrawl API key from DB
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.tenantId, auth.tenantId),
          eq(aiProviders.providerType, 'firecrawl'),
          eq(aiProviders.isActive, true)
        )
      )
      .limit(1)

    if (!provider?.apiKey) {
      return apiError(
        'NO_FIRECRAWL_KEY',
        'Kein Firecrawl API-Key konfiguriert. Bitte unter Einstellungen > KI-Provider einen Firecrawl-Provider anlegen.',
        400
      )
    }

    console.log(`[Firecrawl Crawl] Starting crawl for: ${company.website}`)

    // Create initial record with status 'crawling'
    const crawlRecord = await FirecrawlResearchService.create(auth.tenantId, id, {
      url: company.website,
      status: 'crawling',
    })

    // Start the actual crawl
    const result = await FirecrawlService.crawl(company.website, provider.apiKey)

    if (result.success) {
      // Update record with results
      const updated = await FirecrawlResearchService.update(auth.tenantId, crawlRecord.id, {
        status: 'completed',
        pageCount: result.pages.length,
        pages: result.pages,
      })

      console.log(`[Firecrawl Crawl] Completed: ${result.pages.length} pages crawled`)

      return apiSuccess({
        crawl: updated,
        pageCount: result.pages.length,
      })
    } else {
      // Update record with error
      await FirecrawlResearchService.update(auth.tenantId, crawlRecord.id, {
        status: 'failed',
        error: result.error,
      })

      return apiError('CRAWL_FAILED', result.error || 'Website-Crawl fehlgeschlagen', 500)
    }
  } catch (error) {
    console.error('Firecrawl crawl error:', error)
    return apiError(
      'CRAWL_FAILED',
      error instanceof Error ? error.message : 'Website-Crawl fehlgeschlagen',
      500
    )
  }
}

// GET /api/v1/companies/[id]/crawl - Get all crawls for this company
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params

  const company = await CompanyService.getById(auth.tenantId, id)
  if (!company) {
    return apiNotFound('Company not found')
  }

  const crawls = await FirecrawlResearchService.listByCompany(auth.tenantId, id)

  return apiSuccess({
    crawls,
    hasCrawls: crawls.length > 0,
  })
}

import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { FirecrawlResearchService } from '@/lib/services/firecrawl-research.service'
import { FirecrawlService } from '@/lib/services/firecrawl.service'
import { WebsiteScraperService } from '@/lib/services/ai/website-scraper.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { aiProviders } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

// POST /api/v1/companies/[id]/crawl - Start a full website crawl
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'update', async (auth) => {
  const { id } = await params

  try {
    const company = await CompanyService.getById(TENANT_ID, id)
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
          eq(aiProviders.tenantId, TENANT_ID),
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

    logger.info(`Starting crawl for: ${company.website}`, { module: 'CompaniesCrawlAPI' })

    // Create initial record with status 'crawling'
    const crawlRecord = await FirecrawlResearchService.create(TENANT_ID, id, {
      url: company.website,
      status: 'crawling',
    })

    // Smart filter: AI selects relevant paths from homepage links
    const includePaths = await WebsiteScraperService.getSmartIncludePaths(company.website, TENANT_ID)
    if (includePaths) {
      logger.info(`Smart filter: ${includePaths.length} include patterns selected`, { module: 'CompaniesCrawlAPI' })
    }

    // Start the actual crawl
    const result = await FirecrawlService.crawl(company.website, provider.apiKey, includePaths)

    if (result.success) {
      // Update record with results
      const updated = await FirecrawlResearchService.update(TENANT_ID, crawlRecord.id, {
        status: 'completed',
        pageCount: result.pages.length,
        pages: result.pages,
      })

      logger.info(`Completed: ${result.pages.length} pages crawled`, { module: 'CompaniesCrawlAPI' })

      return apiSuccess({
        crawl: updated,
        pageCount: result.pages.length,
      })
    } else {
      // Update record with error
      await FirecrawlResearchService.update(TENANT_ID, crawlRecord.id, {
        status: 'failed',
        error: result.error,
      })

      return apiError('CRAWL_FAILED', result.error || 'Website-Crawl fehlgeschlagen', 500)
    }
  } catch (error) {
    logger.error('Firecrawl crawl error', error, { module: 'CompaniesCrawlAPI' })
    return apiError(
      'CRAWL_FAILED',
      error instanceof Error ? error.message : 'Website-Crawl fehlgeschlagen',
      500
    )
  }
  })
}

// GET /api/v1/companies/[id]/crawl - Get all crawls for this company
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'update', async (auth) => {
  const { id } = await params

  const company = await CompanyService.getById(TENANT_ID, id)
  if (!company) {
    return apiNotFound('Company not found')
  }

  const crawls = await FirecrawlResearchService.listByCompany(TENANT_ID, id)

  return apiSuccess({
    crawls,
    hasCrawls: crawls.length > 0,
  })
  })
}

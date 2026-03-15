import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { CompanyResearchService } from '@/lib/services/company-research.service'
import { FirecrawlResearchService } from '@/lib/services/firecrawl-research.service'
import { LeadResearchService } from '@/lib/services/ai'
import type { CompanyResearchResult, CompanyAddress } from '@/lib/services/ai'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { logger } from '@/lib/utils/logger'

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

/**
 * Build a comprehensive company profile text from research results
 */
function buildCompanyProfileText(
  companyName: string,
  research: CompanyResearchResult
): string {
  const lines: string[] = []

  lines.push(`=== FIRMENPROFIL: ${companyName} ===`)
  lines.push(`Erstellt am: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`)
  lines.push('')

  if (research.companyProfile && !research.companyProfile.trim().startsWith('{')) {
    lines.push(research.companyProfile)
    lines.push('')
  }

  if (research.description && research.description !== 'Nicht ermittelbar') {
    lines.push(`Beschreibung: ${research.description}`)
    lines.push('')
  }

  if (research.addresses && research.addresses.length > 0) {
    lines.push('--- STANDORTE ---')
    research.addresses.forEach((addr: CompanyAddress, i: number) => {
      const label = addr.label || `Standort ${i + 1}`
      const addrParts = []
      if (addr.street) addrParts.push(`${addr.street} ${addr.houseNumber || ''}`.trim())
      if (addr.postalCode || addr.city) addrParts.push(`${addr.postalCode || ''} ${addr.city || ''}`.trim())
      if (addr.country && addr.country !== 'DE') addrParts.push(addr.country)
      lines.push(`${label}: ${addrParts.join(', ')}`)
      if (addr.phone) lines.push(`  Telefon: ${addr.phone}`)
      if (addr.email) lines.push(`  E-Mail: ${addr.email}`)
    })
    lines.push('')
  }

  const keyData: [string, string][] = []
  if (research.industry && research.industry !== 'Nicht ermittelbar') keyData.push(['Branche', research.industry])
  if (research.employeeCount && research.employeeCount !== 'Nicht ermittelbar') keyData.push(['Mitarbeiter', research.employeeCount])
  if (research.foundedYear && research.foundedYear !== 'Nicht ermittelbar') keyData.push(['Gründungsjahr', research.foundedYear])
  if (research.headquarters && research.headquarters !== 'Nicht ermittelbar') keyData.push(['Hauptsitz', research.headquarters])
  if (research.targetMarket && research.targetMarket !== 'Nicht ermittelbar') keyData.push(['Zielmarkt', research.targetMarket])

  if (keyData.length > 0) {
    lines.push('--- KERNDATEN ---')
    keyData.forEach(([label, value]) => lines.push(`${label}: ${value}`))
    lines.push('')
  }

  if (research.products?.length > 0) lines.push(`Produkte: ${research.products.join(', ')}`)
  if (research.services?.length > 0) lines.push(`Dienstleistungen: ${research.services.join(', ')}`)
  if (research.products?.length > 0 || research.services?.length > 0) lines.push('')

  if (research.strengths?.length > 0) {
    lines.push('--- STÄRKEN/USP ---')
    research.strengths.forEach(s => lines.push(`• ${s}`))
    lines.push('')
  }

  if (research.competitors?.length > 0) {
    lines.push(`Wettbewerber: ${research.competitors.join(', ')}`)
    lines.push('')
  }

  if (research.technologies?.length > 0) lines.push(`Technologien: ${research.technologies.join(', ')}`)
  if (research.certifications?.length > 0) lines.push(`Zertifizierungen: ${research.certifications.join(', ')}`)

  const fin = research.financials
  if (fin) {
    const finParts: string[] = []
    if (fin.estimatedRevenue && fin.estimatedRevenue !== 'Nicht ermittelbar') finParts.push(`Umsatz: ${fin.estimatedRevenue}`)
    if (fin.growthTrend && fin.growthTrend !== 'Nicht ermittelbar') finParts.push(`Wachstum: ${fin.growthTrend}`)
    if (fin.fundingStatus && fin.fundingStatus !== 'Nicht ermittelbar') finParts.push(`Finanzierung: ${fin.fundingStatus}`)
    if (finParts.length > 0) {
      lines.push('')
      lines.push('--- FINANZEN ---')
      finParts.forEach(p => lines.push(p))
    }
  }

  const sm = research.socialMedia
  if (sm) {
    const smParts: string[] = []
    if (sm.linkedin && sm.linkedin !== 'null') smParts.push(`LinkedIn: ${sm.linkedin}`)
    if (sm.xing && sm.xing !== 'null') smParts.push(`Xing: ${sm.xing}`)
    if (sm.twitter && sm.twitter !== 'null') smParts.push(`Twitter: ${sm.twitter}`)
    if (sm.facebook && sm.facebook !== 'null') smParts.push(`Facebook: ${sm.facebook}`)
    if (sm.instagram && sm.instagram !== 'null') smParts.push(`Instagram: ${sm.instagram}`)
    if (smParts.length > 0) {
      lines.push('')
      lines.push('--- SOCIAL MEDIA ---')
      smParts.forEach(p => lines.push(p))
    }
  }

  return lines.join('\n')
}

/**
 * Extract CRM-relevant update data from research results
 * Only fills in MISSING fields - does not overwrite existing data
 */
function extractCrmUpdateData(
  existingCompany: {
    street: string | null
    houseNumber: string | null
    postalCode: string | null
    city: string | null
    country: string | null
    phone: string | null
    email: string | null
    website: string | null
    industry: string | null
    employeeCount: number | null
  },
  research: CompanyResearchResult
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (!existingCompany.street && research.addresses?.length > 0) {
    const primaryAddr = research.addresses[0]
    if (primaryAddr.street) updates.street = primaryAddr.street
    if (primaryAddr.houseNumber) updates.houseNumber = primaryAddr.houseNumber
    if (primaryAddr.postalCode) updates.postalCode = primaryAddr.postalCode
    if (primaryAddr.city) updates.city = primaryAddr.city
    if (primaryAddr.country) updates.country = primaryAddr.country
  }

  if (!existingCompany.phone) {
    const phoneAddr = research.addresses?.find(a => a.phone)
    if (phoneAddr?.phone) updates.phone = phoneAddr.phone
  }

  if (!existingCompany.email) {
    const emailAddr = research.addresses?.find(a => a.email)
    if (emailAddr?.email) updates.email = emailAddr.email
  }

  if (!existingCompany.website && research.website && research.website !== 'Nicht ermittelbar') {
    updates.website = research.website
  }

  if (!existingCompany.industry && research.industry && research.industry !== 'Nicht ermittelbar') {
    updates.industry = research.industry
  }

  if (!existingCompany.employeeCount && research.employeeCount && research.employeeCount !== 'Nicht ermittelbar') {
    const match = research.employeeCount.match(/\d+/)
    if (match) updates.employeeCount = parseInt(match[0])
  }

  return updates
}

// POST /api/v1/companies/[id]/research - Start AI research, save to DB, return proposed changes (NO auto-apply)
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

    logger.info(`Starting research for: ${company.name}`, { module: 'CompaniesResearchAPI' })

    // Check if there's a recent firecrawl crawl to use as context
    let firecrawlContent: string | undefined
    if (company.website) {
      try {
        const latestCrawl = await FirecrawlResearchService.getLatest(auth.tenantId, id)
        if (latestCrawl?.pages && Array.isArray(latestCrawl.pages)) {
          const pages = latestCrawl.pages as Array<{ url: string; title: string; markdown: string }>
          const parts = pages.map((page, i) => {
            let text = `=== SEITE ${i + 1}: ${page.url} ===\n`
            if (page.title) text += `Titel: ${page.title}\n`
            text += page.markdown
            return text
          })
          firecrawlContent = parts.join('\n\n')
          logger.info(`Using firecrawl data as context (${firecrawlContent.length} chars, ${pages.length} pages)`, { module: 'CompaniesResearchAPI' })
        }
      } catch (err) {
        logger.warn('Could not load firecrawl data', { module: 'CompaniesResearchAPI' })
      }
    }

    // Run AI research (uses firecrawl data if available, otherwise scrapes automatically)
    const { research: researchResult, scrapedPages } = await LeadResearchService.researchCompany({
      name: company.name,
      legalForm: company.legalForm || undefined,
      industry: company.industry || undefined,
      website: company.website || undefined,
      city: company.city || undefined,
      email: company.email || undefined,
      notes: company.notes || undefined,
      websiteContent: firecrawlContent,
    }, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      entityType: 'company',
      entityId: id,
    })

    // Build comprehensive company profile for notes
    const companyProfileText = buildCompanyProfileText(company.name, researchResult)

    // Extract CRM-relevant updates (only fill missing fields)
    const crmUpdates = extractCrmUpdateData(company, researchResult)

    // Build proposed changes (including notes override)
    const proposedChanges = {
      ...crmUpdates,
      notes: companyProfileText,
    }

    // Save research result to DB (but do NOT apply to company yet)
    const savedResearch = await CompanyResearchService.create(auth.tenantId, id, {
      companyId: id,
      researchData: {
        ...researchResult,
        proposedProfileText: companyProfileText,
      },
      scrapedPages,
      proposedChanges,
    })

    // Still store aiResearch in customFields for backward-compat display
    const existingCustomFields = (company.customFields || {}) as Record<string, unknown>
    const updatedCustomFields = {
      ...existingCustomFields,
      aiResearch: {
        lastResearchedAt: researchResult.researchedAt,
        description: researchResult.description || null,
        foundedYear: researchResult.foundedYear || null,
        headquarters: researchResult.headquarters || null,
        targetMarket: researchResult.targetMarket || null,
        website: researchResult.website || null,
        addresses: researchResult.addresses || [],
        socialMedia: researchResult.socialMedia || {},
        financials: researchResult.financials || {},
        products: researchResult.products || [],
        services: researchResult.services || [],
        technologies: researchResult.technologies || [],
        certifications: researchResult.certifications || [],
        competitors: researchResult.competitors || [],
        strengths: researchResult.strengths || [],
      },
    }

    await CompanyService.update(auth.tenantId, id, {
      customFields: updatedCustomFields,
    })

    return apiSuccess({
      researchId: savedResearch.id,
      research: researchResult,
      proposedChanges,
      updatedFields: Object.keys(crmUpdates),
    })
  } catch (error) {
    logger.error('Company research error', error, { module: 'CompaniesResearchAPI' })

    return apiError(
      'RESEARCH_FAILED',
      error instanceof Error ? error.message : 'KI-Recherche fehlgeschlagen',
      500
    )
  }
}

// GET /api/v1/companies/[id]/research - Get all past researches for this company
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

  const researches = await CompanyResearchService.listByCompany(auth.tenantId, id)

  // Backward compat: also include customFields research data
  const customFields = (company.customFields || {}) as Record<string, unknown>
  const aiResearch = customFields.aiResearch as Record<string, unknown> | undefined

  return apiSuccess({
    company,
    researches,
    hasResearch: researches.length > 0 || !!aiResearch,
    research: aiResearch || null,
  })
}

// Allow longer execution time for AI research + website scraping
export const maxDuration = 120

import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { LeadResearchService } from '@/lib/services/ai'
import type { CompanyResearchResult, CompanyAddress } from '@/lib/services/ai'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

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

  // Addresses
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

  // Key data
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

  // Products & Services
  if (research.products?.length > 0) {
    lines.push(`Produkte: ${research.products.join(', ')}`)
  }
  if (research.services?.length > 0) {
    lines.push(`Dienstleistungen: ${research.services.join(', ')}`)
  }
  if (research.products?.length > 0 || research.services?.length > 0) {
    lines.push('')
  }

  // Strengths & USPs
  if (research.strengths?.length > 0) {
    lines.push('--- STÄRKEN/USP ---')
    research.strengths.forEach(s => lines.push(`• ${s}`))
    lines.push('')
  }

  // Competitors
  if (research.competitors?.length > 0) {
    lines.push(`Wettbewerber: ${research.competitors.join(', ')}`)
    lines.push('')
  }

  // Technologies
  if (research.technologies?.length > 0) {
    lines.push(`Technologien: ${research.technologies.join(', ')}`)
  }
  if (research.certifications?.length > 0) {
    lines.push(`Zertifizierungen: ${research.certifications.join(', ')}`)
  }

  // Financials
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

  // Social Media
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

  // Fill primary address from first address in research (if company has no address)
  if (!existingCompany.street && research.addresses?.length > 0) {
    const primaryAddr = research.addresses[0]
    if (primaryAddr.street) updates.street = primaryAddr.street
    if (primaryAddr.houseNumber) updates.houseNumber = primaryAddr.houseNumber
    if (primaryAddr.postalCode) updates.postalCode = primaryAddr.postalCode
    if (primaryAddr.city) updates.city = primaryAddr.city
    if (primaryAddr.country) updates.country = primaryAddr.country
  }

  // Fill phone from first address if missing
  if (!existingCompany.phone) {
    const phoneAddr = research.addresses?.find(a => a.phone)
    if (phoneAddr?.phone) updates.phone = phoneAddr.phone
  }

  // Fill email from first address if missing
  if (!existingCompany.email) {
    const emailAddr = research.addresses?.find(a => a.email)
    if (emailAddr?.email) updates.email = emailAddr.email
  }

  // Fill website if missing
  if (!existingCompany.website && research.website && research.website !== 'Nicht ermittelbar') {
    updates.website = research.website
  }

  // Fill industry if missing
  if (!existingCompany.industry && research.industry && research.industry !== 'Nicht ermittelbar') {
    updates.industry = research.industry
  }

  // Fill employee count if missing
  if (!existingCompany.employeeCount && research.employeeCount && research.employeeCount !== 'Nicht ermittelbar') {
    const match = research.employeeCount.match(/\d+/)
    if (match) {
      updates.employeeCount = parseInt(match[0])
    }
  }

  return updates
}

// POST /api/v1/companies/[id]/research - Start AI research for a company (with website scraping)
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

    console.log(`[Company Research] Starting research for: ${company.name}`)

    // Run AI research (includes automatic website scraping if URL available)
    const researchResult = await LeadResearchService.researchCompany({
      name: company.name,
      legalForm: company.legalForm || undefined,
      industry: company.industry || undefined,
      website: company.website || undefined,
      city: company.city || undefined,
      email: company.email || undefined,
      notes: company.notes || undefined,
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

    // Store additional addresses in customFields
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

    // Apply updates to company record
    const updatePayload = {
      ...crmUpdates,
      notes: companyProfileText,
      customFields: updatedCustomFields,
    }

    console.log(`[Company Research] Updating company record with:`, Object.keys(updatePayload))

    const updatedCompany = await CompanyService.update(
      auth.tenantId,
      id,
      updatePayload
    )

    return apiSuccess({
      company: updatedCompany,
      research: researchResult,
      updatedFields: Object.keys(crmUpdates),
      profileWritten: true,
    })
  } catch (error) {
    console.error('Company research error:', error)

    return apiError(
      'RESEARCH_FAILED',
      error instanceof Error ? error.message : 'KI-Recherche fehlgeschlagen',
      500
    )
  }
}

// GET /api/v1/companies/[id]/research - Get last research data from customFields
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

  const customFields = (company.customFields || {}) as Record<string, unknown>
  const aiResearch = customFields.aiResearch as Record<string, unknown> | undefined

  return apiSuccess({
    company,
    hasResearch: !!aiResearch,
    research: aiResearch || null,
  })
}

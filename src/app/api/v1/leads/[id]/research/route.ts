import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { LeadService } from '@/lib/services/lead.service'
import { CompanyService } from '@/lib/services/company.service'
import { PersonService } from '@/lib/services/person.service'
import { LeadResearchService, WebsiteScraperService } from '@/lib/services/ai'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string }>

// POST /api/v1/leads/[id]/research - Start AI research for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'leads', 'update', async (auth) => {
  const { id } = await params

  try {
    // Get the lead with relations
    const lead = await LeadService.getById(id)
    if (!lead) {
      return apiNotFound('Lead not found')
    }

    // Update status to "processing" (DB constraint: pending, processing, completed, failed)
    await LeadService.updateAIResearch(id, 'processing')

    // Gather information for research
    let companyName: string | undefined
    let personName: string | undefined
    let email: string | undefined
    let website: string | undefined
    let additionalContext: string | undefined
    let websiteContent: string | undefined

    // Get company info if linked
    if (lead.companyId) {
      const company = await CompanyService.getById(lead.companyId)
      if (company) {
        companyName = company.name
        website = company.website || undefined
        email = company.email || undefined

        // Use existing AI research data from company as context (avoids hallucination)
        const customFields = (company.customFields || {}) as Record<string, unknown>
        const existingResearch = customFields.aiResearch as Record<string, unknown> | undefined
        if (existingResearch) {
          const researchParts: string[] = ['=== VORHANDENE FIRMENDATEN (verifiziert) ===']
          if (existingResearch.description) researchParts.push(`Beschreibung: ${existingResearch.description}`)
          if (company.industry) researchParts.push(`Branche: ${company.industry}`)
          if (company.employeeCount) researchParts.push(`Mitarbeiter: ${company.employeeCount}`)
          const products = existingResearch.products as string[] | undefined
          if (products?.length) researchParts.push(`Produkte: ${products.join(', ')}`)
          const services = existingResearch.services as string[] | undefined
          if (services?.length) researchParts.push(`Dienstleistungen: ${services.join(', ')}`)
          const technologies = existingResearch.technologies as string[] | undefined
          if (technologies?.length) researchParts.push(`Technologien: ${technologies.join(', ')}`)
          const strengths = existingResearch.strengths as string[] | undefined
          if (strengths?.length) researchParts.push(`Stärken: ${strengths.join(', ')}`)
          if (existingResearch.targetMarket) researchParts.push(`Zielmarkt: ${existingResearch.targetMarket}`)
          researchParts.push('=== ENDE DER VORHANDENEN FIRMENDATEN ===')
          additionalContext = researchParts.join('\n')
        }

        // Scrape website if available (provides real data instead of hallucination)
        if (website) {
          logger.info(`Scraping company website: ${website}`, { module: 'LeadsResearchAPI' })
          try {
            const scrapeResult = await WebsiteScraperService.scrapeCompanyWebsite(website)
            if (scrapeResult.success && scrapeResult.combinedText) {
              websiteContent = scrapeResult.combinedText
              logger.info(`Website scraped (${websiteContent.length} chars)`, { module: 'LeadsResearchAPI' })
            }
          } catch (scrapeError) {
            logger.error('Website scraping failed', scrapeError, { module: 'LeadsResearchAPI' })
          }
        }
      }
    }

    // Get person info if linked
    if (lead.personId) {
      const person = await PersonService.getById(lead.personId)
      if (person) {
        personName = `${person.firstName} ${person.lastName}`
        if (!email) email = person.email || undefined
      }
    }

    // Use sourceDetail as additional context
    if (lead.sourceDetail) {
      additionalContext = additionalContext
        ? `${additionalContext}\n${lead.sourceDetail}`
        : lead.sourceDetail
    }

    // Add notes from rawData if present
    const rawData = lead.rawData as Record<string, unknown> | null
    if (rawData?.notes) {
      additionalContext = additionalContext
        ? `${additionalContext}\n${rawData.notes}`
        : String(rawData.notes)
    }

    // Validate we have enough info
    if (!companyName && !personName && !email) {
      await LeadService.updateAIResearch(id, 'failed', {
        error: 'Nicht genügend Informationen für die Recherche. Bitte verknüpfen Sie eine Firma oder Person.',
      })
      return apiError(
        'INSUFFICIENT_DATA',
        'Nicht genügend Informationen für die Recherche. Bitte verknüpfen Sie eine Firma oder Person.',
        400
      )
    }

    // Perform research (now with website content and existing company data)
    const researchResult = await LeadResearchService.research({
      companyName,
      personName,
      email,
      website,
      additionalContext,
      websiteContent,
    }, {
      userId: auth.userId,
      entityType: 'lead',
      entityId: id,
    })

    // Update lead with research results
    const updatedLead = await LeadService.updateAIResearch(id,
      'completed',
      researchResult as unknown as Record<string, unknown>
    )

    // Also update the lead score if we got one
    if (researchResult.score !== undefined) {
      await LeadService.update(id, {
        score: researchResult.score,
      })
    }

    // Webhook feuern
    WebhookService.fire('research.completed', {
      leadId: id,
      score: researchResult.score,
    }).catch(() => {})

    return apiSuccess({
      lead: updatedLead,
      research: researchResult,
    })
  } catch (error) {
    logger.error('Lead research error', error, { module: 'LeadsResearchAPI' })

    // Update status to "failed"
    await LeadService.updateAIResearch(id, 'failed', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    })

    return apiError(
      'RESEARCH_FAILED',
      error instanceof Error ? error.message : 'KI-Recherche fehlgeschlagen',
      500
    )
  }
  })
}

// GET /api/v1/leads/[id]/research - Get research status
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'leads', 'update', async (auth) => {
  const { id } = await params

  const lead = await LeadService.getById(id)
  if (!lead) {
    return apiNotFound('Lead not found')
  }

  return apiSuccess({
    status: lead.aiResearchStatus || 'pending',
    result: lead.aiResearchResult,
  })
  })
}

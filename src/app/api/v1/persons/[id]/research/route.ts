import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { PersonService } from '@/lib/services/person.service'
import { CompanyService } from '@/lib/services/company.service'
import { LeadResearchService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string }>

// POST /api/v1/persons/[id]/research - Start AI research for a person
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'persons', 'update', async (auth) => {
  const { id } = await params

  try {
    const person = await PersonService.getById(id)
    if (!person) {
      return apiNotFound('Person not found')
    }

    // If person has a linked company, fetch the company name
    let companyName: string | undefined
    if (person.companyId) {
      const company = await CompanyService.getById(person.companyId)
      if (company) {
        companyName = company.name
      }
    }

    const researchResult = await LeadResearchService.researchPerson({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email || undefined,
      company: companyName,
      jobTitle: person.jobTitle || undefined,
      city: person.city || undefined,
      notes: person.notes || undefined,
    }, {
      userId: auth.userId,
      entityType: 'person',
      entityId: id,
    })

    // Persist research results in customFields
    const existingCustomFields = (person.customFields || {}) as Record<string, unknown>
    const updatedCustomFields = {
      ...existingCustomFields,
      aiResearch: {
        lastResearchedAt: researchResult.researchedAt,
        ...researchResult,
      },
    }

    await PersonService.update(id, {
      customFields: updatedCustomFields,
    })

    return apiSuccess({
      person,
      research: researchResult,
      hasResearch: true,
    })
  } catch (error) {
    logger.error('Person research error', error, { module: 'PersonsResearchAPI' })

    return apiError(
      'RESEARCH_FAILED',
      error instanceof Error ? error.message : 'KI-Recherche fehlgeschlagen',
      500
    )
  }
  })
}

// GET /api/v1/persons/[id]/research - Get saved research data from customFields
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'persons', 'update', async (auth) => {
  const { id } = await params

  const person = await PersonService.getById(id)
  if (!person) {
    return apiNotFound('Person not found')
  }

  const customFields = (person.customFields || {}) as Record<string, unknown>
  const aiResearch = customFields.aiResearch as Record<string, unknown> | undefined

  return apiSuccess({
    person,
    hasResearch: !!aiResearch,
    research: aiResearch || null,
  })
  })
}

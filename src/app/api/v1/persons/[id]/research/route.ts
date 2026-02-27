import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { PersonService } from '@/lib/services/person.service'
import { CompanyService } from '@/lib/services/company.service'
import { LeadResearchService } from '@/lib/services/ai'
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

// POST /api/v1/persons/[id]/research - Start AI research for a person
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
    const person = await PersonService.getById(auth.tenantId, id)
    if (!person) {
      return apiNotFound('Person not found')
    }

    // If person has a linked company, fetch the company name
    let companyName: string | undefined
    if (person.companyId) {
      const company = await CompanyService.getById(auth.tenantId, person.companyId)
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
      tenantId: auth.tenantId,
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

    await PersonService.update(auth.tenantId, id, {
      customFields: updatedCustomFields,
    })

    return apiSuccess({
      person,
      research: researchResult,
      hasResearch: true,
    })
  } catch (error) {
    console.error('Person research error:', error)

    return apiError(
      'RESEARCH_FAILED',
      error instanceof Error ? error.message : 'KI-Recherche fehlgeschlagen',
      500
    )
  }
}

// GET /api/v1/persons/[id]/research - Get saved research data from customFields
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params

  const person = await PersonService.getById(auth.tenantId, id)
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
}

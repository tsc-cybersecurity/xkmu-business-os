import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyResearchService } from '@/lib/services/company-research.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string; researchId: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null }
    }
  }

  return null
}

// POST /api/v1/companies/[id]/research/[researchId]/reject - Reject research changes
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id, researchId } = await params

  try {
    const research = await CompanyResearchService.getById(auth.tenantId, researchId)
    if (!research || research.companyId !== id) {
      return apiNotFound('Research not found')
    }

    if (research.status !== 'completed') {
      return apiError('INVALID_STATUS', 'Recherche kann nicht mehr verworfen werden', 400)
    }

    const updated = await CompanyResearchService.updateStatus(
      auth.tenantId,
      researchId,
      'rejected'
    )

    return apiSuccess({ research: updated })
  } catch (error) {
    logger.error('Reject research error', error, { module: 'CompaniesResearchRejectAPI' })
    return apiError(
      'REJECT_FAILED',
      error instanceof Error ? error.message : 'Verwerfen fehlgeschlagen',
      500
    )
  }
}

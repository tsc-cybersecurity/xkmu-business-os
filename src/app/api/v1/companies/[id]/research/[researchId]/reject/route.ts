import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyResearchService } from '@/lib/services/company-research.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string; researchId: string }>

// POST /api/v1/companies/[id]/research/[researchId]/reject - Reject research changes
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'update', async (auth) => {
  const { id, researchId } = await params

  try {
    const research = await CompanyResearchService.getById(researchId)
    if (!research || research.companyId !== id) {
      return apiNotFound('Research not found')
    }

    if (research.status !== 'completed') {
      return apiError('INVALID_STATUS', 'Recherche kann nicht mehr verworfen werden', 400)
    }

    const updated = await CompanyResearchService.updateStatus(researchId,
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
  })
}

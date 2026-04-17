import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { CompanyResearchService } from '@/lib/services/company-research.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string; researchId: string }>

// POST /api/v1/companies/[id]/research/[researchId]/apply - Apply research changes to company
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

    if (research.status === 'applied') {
      return apiError('ALREADY_APPLIED', 'Recherche wurde bereits übernommen', 400)
    }

    const company = await CompanyService.getById(id)
    if (!company) {
      return apiNotFound('Company not found')
    }

    // Apply proposed changes to company
    const proposedChanges = (research.proposedChanges || {}) as Record<string, unknown>

    if (Object.keys(proposedChanges).length > 0) {
      await CompanyService.update(id, proposedChanges)
    }

    // Update research status
    const updated = await CompanyResearchService.updateStatus(researchId,
      'applied',
      new Date()
    )

    return apiSuccess({
      research: updated,
      appliedFields: Object.keys(proposedChanges),
    })
  } catch (error) {
    logger.error('Apply research error', error, { module: 'CompaniesResearchApplyAPI' })
    return apiError(
      'APPLY_FAILED',
      error instanceof Error ? error.message : 'Übernahme fehlgeschlagen',
      500
    )
  }
  })
}

import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateOpportunitySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { OpportunityService } from '@/lib/services/opportunity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'opportunities', 'read', async (auth) => {
    const { id } = await params
    const opportunity = await OpportunityService.getById(auth.tenantId, id)

    if (!opportunity) {
      return apiNotFound('Opportunity not found')
    }

    return apiSuccess(opportunity)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'opportunities', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const validation = validateAndParse(updateOpportunitySchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const opportunity = await OpportunityService.update(auth.tenantId, id, validation.data)

      if (!opportunity) {
        return apiNotFound('Opportunity not found')
      }

      return apiSuccess(opportunity)
    } catch (error) {
      logger.error('Update opportunity error', error, { module: 'OpportunitiesAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update opportunity', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'opportunities', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await OpportunityService.delete(auth.tenantId, id)

    if (!deleted) {
      return apiNotFound('Opportunity not found')
    }

    return apiSuccess({ message: 'Opportunity deleted successfully' })
  })
}

import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateLeadSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'leads', 'read', async (auth) => {
    const { id } = await params
    const lead = await LeadService.getById(TENANT_ID, id)

    if (!lead) {
      return apiNotFound('Lead not found')
    }

    return apiSuccess(lead)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'leads', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const validation = validateAndParse(updateLeadSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const lead = await LeadService.update(TENANT_ID, id, validation.data)

      if (!lead) {
        return apiNotFound('Lead not found')
      }

      return apiSuccess(lead)
    } catch (error) {
      logger.error('Update lead error', error, { module: 'LeadsAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update lead', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'leads', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await LeadService.delete(TENANT_ID, id)

    if (!deleted) {
      return apiNotFound('Lead not found')
    }

    return apiSuccess({ message: 'Lead deleted successfully' })
  })
}

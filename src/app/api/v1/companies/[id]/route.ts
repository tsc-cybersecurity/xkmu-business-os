import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateCompanySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CompanyService } from '@/lib/services/company.service'
import { CompanyActionsService } from '@/lib/services/ai/company-actions.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'read', async (auth) => {
    const { id } = await params
    const company = await CompanyService.getById(auth.tenantId, id)

    if (!company) {
      return apiNotFound('Company not found')
    }

    return apiSuccess(company)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const validation = validateAndParse(updateCompanySchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const company = await CompanyService.update(auth.tenantId, id, validation.data)

      if (!company) {
        return apiNotFound('Company not found')
      }

      // Fire-and-forget: enrich activities without summaries
      CompanyActionsService.enrichMissingSummaries(auth.tenantId, id, auth.userId).catch((err) => {
        logger.error('Background summary enrichment failed', err, { module: 'CompaniesAPI' })
      })

      return apiSuccess(company)
    } catch (error) {
      logger.error('Update company error', error, { module: 'CompaniesAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update company', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await CompanyService.delete(auth.tenantId, id)

    if (!deleted) {
      return apiNotFound('Company not found')
    }

    return apiSuccess({ message: 'Company deleted successfully' })
  })
}

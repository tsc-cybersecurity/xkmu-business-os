import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createCompanySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CompanyService } from '@/lib/services/company.service'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'companies', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

    const result = await CompanyService.list(auth.tenantId, {
      ...pagination,
      status,
      search,
      tags,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'companies', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(createCompanySchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Dublettenprüfung
      const duplicate = await CompanyService.checkDuplicate(
        auth.tenantId,
        validation.data.name,
        validation.data.website
      )
      if (duplicate) {
        return apiError(
          'DUPLICATE_COMPANY',
          `Firma "${duplicate.name}" existiert bereits`,
          409
        )
      }

      const company = await CompanyService.create(
        auth.tenantId,
        validation.data,
        auth.userId || undefined
      )

      // Webhook feuern
      WebhookService.fire(auth.tenantId, 'company.created', {
        companyId: company.id,
        companyName: company.name,
      }).catch(() => {})

      return apiSuccess(company, undefined, 201)
    } catch (error) {
      logger.error('Create company error', error, { module: 'CompaniesAPI' })
      return apiError('CREATE_FAILED', 'Failed to create company', 500)
    }
  })
}

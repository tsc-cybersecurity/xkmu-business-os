import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createMarketingTemplateSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingTemplateService } from '@/lib/services/marketing-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const type = searchParams.get('type') || undefined

    const result = await MarketingTemplateService.list(auth.tenantId, {
      ...pagination,
      type,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createMarketingTemplateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const template = await MarketingTemplateService.create(auth.tenantId, validation.data)
      return apiSuccess(template, undefined, 201)
    } catch (error) {
      logger.error('Error creating marketing template', error, { module: 'MarketingTemplatesAPI' })
      return apiServerError()
    }
  })
}

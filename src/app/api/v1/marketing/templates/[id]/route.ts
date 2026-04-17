import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { updateMarketingTemplateSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingTemplateService } from '@/lib/services/marketing-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { id } = await params
    const template = await MarketingTemplateService.getById(id)
    if (!template) return apiNotFound('Vorlage nicht gefunden')
    return apiSuccess(template)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateMarketingTemplateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const template = await MarketingTemplateService.update(id, validation.data)
      if (!template) return apiNotFound('Vorlage nicht gefunden')
      return apiSuccess(template)
    } catch (error) {
      logger.error('Error updating marketing template', error, { module: 'MarketingTemplatesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await MarketingTemplateService.delete(id)
    if (!deleted) return apiNotFound('Vorlage nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

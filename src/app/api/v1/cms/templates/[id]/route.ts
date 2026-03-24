import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { CmsBlockTemplateService } from '@/lib/services/cms-block-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  blockType: z.string().min(1).max(50).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'read', async () => {
    const { id } = await params
    const template = await CmsBlockTemplateService.getById(id)
    if (!template) return apiNotFound('Vorlage nicht gefunden')
    return apiSuccess(template)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateTemplateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const template = await CmsBlockTemplateService.update(id, validation.data)
      if (!template) return apiNotFound('Vorlage nicht gefunden')
      return apiSuccess(template)
    } catch (error) {
      logger.error('Error updating CMS template', error, { module: 'CmsTemplatesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'delete', async () => {
    const { id } = await params
    const deleted = await CmsBlockTemplateService.delete(id)
    if (!deleted) return apiNotFound('Vorlage nicht gefunden oder ist eine Systemvorlage')
    return apiSuccess({ deleted: true })
  })
}

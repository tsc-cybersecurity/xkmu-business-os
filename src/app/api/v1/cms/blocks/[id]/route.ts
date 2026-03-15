import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateCmsBlockSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateCmsBlockSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const block = await CmsBlockService.update(auth.tenantId, id, validation.data)
      if (!block) return apiNotFound('Block nicht gefunden')
      return apiSuccess(block)
    } catch (error) {
      logger.error('Error updating CMS block', error, { module: 'CmsBlocksAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await CmsBlockService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Block nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

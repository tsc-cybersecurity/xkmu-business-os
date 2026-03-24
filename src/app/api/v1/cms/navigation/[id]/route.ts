import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateCmsNavigationItemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateCmsNavigationItemSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const item = await CmsNavigationService.update(id, validation.data)
      if (!item) return apiNotFound('Navigations-Item nicht gefunden')
      return apiSuccess(item)
    } catch (error) {
      logger.error('Error updating navigation item', error, { module: 'CmsNavigationAPI' })
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
    const deleted = await CmsNavigationService.delete(id)
    if (!deleted) return apiNotFound('Navigations-Item nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

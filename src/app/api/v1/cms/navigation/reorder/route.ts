import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  reorderCmsNavigationItemsSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function PUT(request: NextRequest) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(reorderCmsNavigationItemsSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      await CmsNavigationService.reorder(auth.tenantId, validation.data.itemIds)
      return apiSuccess({ reordered: true })
    } catch (error) {
      console.error('Error reordering navigation items:', error)
      return apiServerError()
    }
  })
}

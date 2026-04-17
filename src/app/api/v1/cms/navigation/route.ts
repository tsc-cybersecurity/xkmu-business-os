import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { createCmsNavigationItemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') || undefined

    const items = await CmsNavigationService.list(location)
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createCmsNavigationItemSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const item = await CmsNavigationService.create(validation.data)
      return apiSuccess(item, undefined, 201)
    } catch (error) {
      logger.error('Error creating navigation item', error, { module: 'CmsNavigationAPI' })
      return apiServerError()
    }
  })
}

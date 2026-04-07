import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createCmsPageSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined

    const result = await CmsPageService.list({ ...pagination, status })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createCmsPageSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const page = await CmsPageService.create(validation.data, auth.userId ?? undefined)
      return apiSuccess(page, undefined, 201)
    } catch (error) {
      logger.error('Error creating CMS page', error, { module: 'CmsPagesAPI' })
      return apiServerError()
    }
  })
}

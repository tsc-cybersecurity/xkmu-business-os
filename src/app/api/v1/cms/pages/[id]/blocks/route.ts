import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  createCmsBlockSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'read', async (auth) => {
    const { id } = await params
    const blocks = await CmsBlockService.listByPage(auth.tenantId, id)
    return apiSuccess(blocks)
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(createCmsBlockSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const block = await CmsBlockService.create(auth.tenantId, id, validation.data)
      return apiSuccess(block, undefined, 201)
    } catch (error) {
      logger.error('Error creating CMS block', error, { module: 'CmsPagesBlocksAPI' })
      return apiServerError()
    }
  })
}

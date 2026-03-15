import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateCmsPageSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'read', async (auth) => {
    const { id } = await params
    const page = await CmsPageService.getById(auth.tenantId, id)
    if (!page) return apiNotFound('Seite nicht gefunden')
    return apiSuccess(page)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateCmsPageSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const page = await CmsPageService.update(auth.tenantId, id, validation.data)
      if (!page) return apiNotFound('Seite nicht gefunden')
      return apiSuccess(page)
    } catch (error) {
      logger.error('Error updating CMS page', error, { module: 'CmsPagesAPI' })
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
    const deleted = await CmsPageService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Seite nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { CmsBlockTypeService } from '@/lib/services/cms-block-type.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()

      const allowedFields = ['name', 'description', 'icon', 'category', 'fields', 'defaultContent', 'defaultSettings', 'isActive', 'sortOrder']
      const data: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          data[field] = body[field]
        }
      }

      if (Object.keys(data).length === 0) {
        return apiError('VALIDATION_ERROR', 'Keine gueltigen Felder zum Aktualisieren', 400)
      }

      const result = await CmsBlockTypeService.update(id, data)
      if (!result) {
        return apiError('NOT_FOUND', 'Block-Typ nicht gefunden', 404)
      }
      return apiSuccess(result)
    } catch (error) {
      console.error('Error updating block type:', error)
      return apiServerError()
    }
  })
}

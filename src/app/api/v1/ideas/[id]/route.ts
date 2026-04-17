import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateIdeaSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { IdeaService } from '@/lib/services/idea.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ideas', 'read', async (auth) => {
    const { id } = await params
    const idea = await IdeaService.getById(TENANT_ID, id)
    if (!idea) return apiNotFound('Idee nicht gefunden')

    return apiSuccess(idea)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ideas', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateIdeaSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const idea = await IdeaService.update(TENANT_ID, id, validation.data)
      if (!idea) return apiNotFound('Idee nicht gefunden')

      return apiSuccess(idea)
    } catch (error) {
      logger.error('Error updating idea', error, { module: 'IdeasAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ideas', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await IdeaService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Idee nicht gefunden')

    return apiSuccess({ deleted: true })
  })
}

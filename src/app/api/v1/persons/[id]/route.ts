import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updatePersonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { PersonService } from '@/lib/services/person.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'persons', 'read', async (auth) => {
    const { id } = await params
    const person = await PersonService.getById(TENANT_ID, id)

    if (!person) {
      return apiNotFound('Person not found')
    }

    return apiSuccess(person)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'persons', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const validation = validateAndParse(updatePersonSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const person = await PersonService.update(TENANT_ID, id, validation.data)

      if (!person) {
        return apiNotFound('Person not found')
      }

      return apiSuccess(person)
    } catch (error) {
      logger.error('Update person error', error, { module: 'PersonsAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update person', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'persons', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await PersonService.delete(TENANT_ID, id)

    if (!deleted) {
      return apiNotFound('Person not found')
    }

    return apiSuccess({ message: 'Person deleted successfully' })
  })
}

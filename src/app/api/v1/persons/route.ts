import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createPersonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { PersonService } from '@/lib/services/person.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'persons', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const companyId = searchParams.get('companyId') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

    const result = await PersonService.list(TENANT_ID, {
      ...pagination,
      companyId,
      status,
      search,
      tags,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'persons', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(createPersonSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const person = await PersonService.create(
        TENANT_ID,
        validation.data,
        auth.userId || undefined
      )

      return apiSuccess(person, undefined, 201)
    } catch (error) {
      logger.error('Create person error', error, { module: 'PersonsAPI' })
      return apiError('CREATE_FAILED', 'Failed to create person', 500)
    }
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { cockpitSystemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CockpitService } from '@/lib/services/cockpit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(request: NextRequest) {
  return withPermission(request, 'cockpit', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const category = searchParams.get('category') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const result = await CockpitService.list({
      ...pagination,
      category,
      status,
      search,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cockpit', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(cockpitSystemSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const system = await CockpitService.create(validation.data,
        auth.userId || undefined
      )

      return apiSuccess(system, undefined, 201)
    } catch (error) {
      logger.error('Create cockpit system error', error, { module: 'CockpitAPI' })
      return apiError('CREATE_FAILED', 'Failed to create cockpit system', 500)
    }
  })
}

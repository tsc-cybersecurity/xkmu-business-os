import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createActivitySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ActivityService } from '@/lib/services/activity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'activities', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const leadId = searchParams.get('leadId') || undefined
    const companyId = searchParams.get('companyId') || undefined
    const personId = searchParams.get('personId') || undefined
    const type = searchParams.get('type') || undefined

    const result = await ActivityService.list(TENANT_ID, {
      ...pagination,
      leadId,
      companyId,
      personId,
      type,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'activities', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createActivitySchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const activity = await ActivityService.create(TENANT_ID, validation.data, auth.userId)
      return apiSuccess(activity, undefined, 201)
    } catch (error) {
      logger.error('Error creating activity', error, { module: 'ActivitiesAPI' })
      return apiServerError()
    }
  })
}

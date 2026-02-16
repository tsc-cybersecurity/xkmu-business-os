import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createMarketingTaskSchema,
  validateAndParse,
  formatZodErrors,
  uuidSchema,
} from '@/lib/utils/validation'
import { MarketingTaskService } from '@/lib/services/marketing-task.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const campaignId = searchParams.get('campaignId') || undefined
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined

    const result = await MarketingTaskService.list(auth.tenantId, {
      ...pagination,
      campaignId,
      status,
      type,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()

      // Validate campaignId separately since the schema needs it
      const campaignIdResult = uuidSchema.safeParse(body.campaignId)
      if (!campaignIdResult.success) {
        return apiValidationError([{ field: 'campaignId', message: 'Gueltige Kampagnen-ID erforderlich' }])
      }

      const validation = validateAndParse(createMarketingTaskSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const task = await MarketingTaskService.create(auth.tenantId, {
        ...validation.data,
        campaignId: body.campaignId,
      })
      return apiSuccess(task, undefined, 201)
    } catch (error) {
      console.error('Error creating marketing task:', error)
      return apiServerError()
    }
  })
}

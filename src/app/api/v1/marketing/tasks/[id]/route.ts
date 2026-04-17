import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateMarketingTaskSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingTaskService } from '@/lib/services/marketing-task.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { id } = await params
    const task = await MarketingTaskService.getById(TENANT_ID, id)
    if (!task) return apiNotFound('Task nicht gefunden')
    return apiSuccess(task)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateMarketingTaskSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const task = await MarketingTaskService.update(TENANT_ID, id, validation.data)
      if (!task) return apiNotFound('Task nicht gefunden')
      return apiSuccess(task)
    } catch (error) {
      logger.error('Error updating marketing task', error, { module: 'MarketingTasksAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await MarketingTaskService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Task nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

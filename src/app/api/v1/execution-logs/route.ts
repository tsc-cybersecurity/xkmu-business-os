import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { ExecutionLogService } from '@/lib/services/execution-log.service'
import { withPermission } from '@/lib/auth/require-permission'
import { ENTITY_TYPE_ENUM, EXECUTED_BY_ENUM, EXECUTION_STATUS_ENUM } from '@/lib/constants/framework'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type') || undefined
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const logs = await ExecutionLogService.list(
      TENANT_ID,
      { entityType, entityId, status },
      { limit, offset },
    )
    return apiSuccess(logs)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.entityType || !ENTITY_TYPE_ENUM.includes(body.entityType)) {
        return apiError('VALIDATION_ERROR', `entityType muss einer der folgenden Werte sein: ${ENTITY_TYPE_ENUM.join(', ')}`, 400)
      }
      if (!body.entityId) {
        return apiError('VALIDATION_ERROR', 'entityId ist erforderlich', 400)
      }
      if (!body.executedBy || !EXECUTED_BY_ENUM.includes(body.executedBy)) {
        return apiError('VALIDATION_ERROR', `executedBy muss einer der folgenden Werte sein: ${EXECUTED_BY_ENUM.join(', ')}`, 400)
      }
      if (!body.status || !EXECUTION_STATUS_ENUM.includes(body.status)) {
        return apiError('VALIDATION_ERROR', `status muss einer der folgenden Werte sein: ${EXECUTION_STATUS_ENUM.join(', ')}`, 400)
      }

      const log = await ExecutionLogService.create(TENANT_ID, body)
      return apiSuccess(log, undefined, 201)
    } catch { return apiServerError() }
  })
}

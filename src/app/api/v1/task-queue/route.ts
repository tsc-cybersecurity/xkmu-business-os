import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { withPermission } from '@/lib/auth/require-permission'
import { parsePaginationParams } from '@/lib/utils/api-response'

// GET /api/v1/task-queue - List tasks with filters
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined

    const result = await TaskQueueService.list(auth.tenantId, {
      ...pagination,
      status,
      type,
    })
    return apiSuccess(result.items, result.meta)
  })
}

// POST /api/v1/task-queue - Create a task
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()
      const item = await TaskQueueService.create(auth.tenantId, {
        type: body.type,
        priority: body.priority,
        payload: body.payload,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        referenceType: body.referenceType,
        referenceId: body.referenceId,
      })
      return apiSuccess(item, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

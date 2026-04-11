import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { withPermission } from '@/lib/auth/require-permission'

// GET /api/v1/task-queue - List tasks with filters
//
// Note: this endpoint uses its own pagination parsing instead of the global
// parsePaginationParams() helper because the task queue is a log/history
// view and the user may legitimately want to see hundreds of entries on a
// single page. Cap is 500 here vs. 100 in the global helper.
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const rawLimit = parseInt(searchParams.get('limit') || '100', 10) || 100
    const limit = Math.max(1, Math.min(rawLimit, 500))

    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined

    const result = await TaskQueueService.list(auth.tenantId, {
      page,
      limit,
      status,
      type,
    })
    return apiSuccess(result.items, { ...result.meta, stats: result.stats })
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

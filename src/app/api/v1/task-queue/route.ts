import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiError } from '@/lib/utils/api-response'
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

    const result = await TaskQueueService.list({
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
      const item = await TaskQueueService.create({
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

// DELETE /api/v1/task-queue?scope=all|older-than|without-error
//
// Bulk delete. The scope query param controls which tasks are removed:
//   - all           → every task in the tenant
//   - older-than    → tasks created more than 24h ago (override via maxAgeHours)
//   - without-error → every task whose status is not 'failed'
//
// Returns { deleted: number }.
export async function DELETE(request: NextRequest) {
  return withPermission(request, 'settings', 'delete', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const scope = searchParams.get('scope')

      if (scope !== 'all' && scope !== 'older-than' && scope !== 'without-error') {
        return apiError(
          'INVALID_SCOPE',
          'scope must be one of: all, older-than, without-error',
          400
        )
      }

      const maxAgeHours = parseInt(searchParams.get('maxAgeHours') || '24', 10) || 24
      const maxAgeMs = Math.max(1, maxAgeHours) * 60 * 60 * 1000

      const deleted = await TaskQueueService.deleteBulk(scope, { maxAgeMs })
      return apiSuccess({ deleted })
    } catch {
      return apiServerError()
    }
  })
}

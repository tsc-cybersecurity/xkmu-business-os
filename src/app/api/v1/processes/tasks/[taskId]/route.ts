import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors, updateProcessTaskSchema } from '@/lib/utils/validation'

type Params = Promise<{ taskId: string }>

// GET /api/v1/processes/tasks/[taskId] - Get task detail
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { taskId } = await params
    const task = await ProcessService.getTaskById(auth.tenantId, taskId)
    if (!task) return apiNotFound('Aufgabe nicht gefunden')
    return apiSuccess(task)
  })
}

// PUT /api/v1/processes/tasks/[taskId] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { taskId } = await params
      const body = await request.json()
      const validation = validateAndParse(updateProcessTaskSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors!))
      }
      const task = await ProcessService.updateTask(auth.tenantId, taskId, validation.data!)
      if (!task) return apiNotFound('Aufgabe nicht gefunden')
      return apiSuccess(task)
    } catch {
      return apiServerError()
    }
  })
}

// DELETE /api/v1/processes/tasks/[taskId] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { taskId } = await params
    const deleted = await ProcessService.deleteTask(auth.tenantId, taskId)
    if (!deleted) return apiNotFound('Aufgabe nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

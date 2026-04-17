import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors, updateProcessSchema } from '@/lib/utils/validation'
type Params = Promise<{ id: string }>

// GET /api/v1/processes/[id] - Get process with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const process = await ProcessService.getById(id)
    if (!process) return apiNotFound('Prozess nicht gefunden')

    const tasks = await ProcessService.listTasks(id)
    return apiSuccess({ ...process, tasks })
  })
}

// PUT /api/v1/processes/[id] - Update process
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateProcessSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors!))
      }
      const process = await ProcessService.update(id, validation.data!)
      if (!process) return apiNotFound('Prozess nicht gefunden')
      return apiSuccess(process)
    } catch {
      return apiServerError()
    }
  })
}

// DELETE /api/v1/processes/[id] - Delete process
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ProcessService.delete(id)
    if (!deleted) return apiNotFound('Prozess nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

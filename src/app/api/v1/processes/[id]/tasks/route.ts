import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors, createProcessTaskSchema } from '@/lib/utils/validation'
type Params = Promise<{ id: string }>

// GET /api/v1/processes/[id]/tasks - List tasks for a process
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const process = await ProcessService.getById(id)
    if (!process) return apiNotFound('Prozess nicht gefunden')

    const tasks = await ProcessService.listTasks(id)
    return apiSuccess(tasks)
  })
}

// POST /api/v1/processes/[id]/tasks - Create a task
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const { id } = await params
      const process = await ProcessService.getById(id)
      if (!process) return apiNotFound('Prozess nicht gefunden')

      const body = await request.json()
      const validation = validateAndParse(createProcessTaskSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors!))
      }
      const task = await ProcessService.createTask(id, validation.data!)
      return apiSuccess(task, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

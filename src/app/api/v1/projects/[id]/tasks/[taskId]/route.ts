import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { ProjectService } from '@/lib/services/project.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string; taskId: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { taskId } = await params
      const body = await request.json()
      const task = await ProjectService.updateTask(auth.tenantId, taskId, {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : body.startDate,
        dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate,
      })
      if (!task) return apiNotFound('Aufgabe nicht gefunden')
      return apiSuccess(task)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { taskId } = await params
    const deleted = await ProjectService.deleteTask(auth.tenantId, taskId)
    if (!deleted) return apiNotFound('Aufgabe nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

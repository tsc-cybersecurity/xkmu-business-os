import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { ProjectService } from '@/lib/services/project.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const tasks = await ProjectService.listTasks(TENANT_ID, id)
    return apiSuccess(tasks)
  })
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const { id } = await params
      const project = await ProjectService.getById(TENANT_ID, id)
      if (!project) return apiNotFound('Projekt nicht gefunden')
      const body = await request.json()
      const task = await ProjectService.createTask(TENANT_ID, id, {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      })
      return apiSuccess(task, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

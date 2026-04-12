import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { ProjectService } from '@/lib/services/project.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const project = await ProjectService.getById(auth.tenantId, id)
    if (!project) return apiNotFound('Projekt nicht gefunden')
    const tasks = await ProjectService.listTasks(auth.tenantId, id)
    return apiSuccess({ ...project, tasks })
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const parsed = {
        ...body,
        startDate: body.startDate === null ? null : body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate === null ? null : body.endDate ? new Date(body.endDate) : undefined,
      }
      const project = await ProjectService.update(auth.tenantId, id, parsed)
      if (!project) return apiNotFound('Projekt nicht gefunden')
      return apiSuccess(project)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ProjectService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Projekt nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

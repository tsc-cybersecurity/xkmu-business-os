import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

// GET /api/v1/task-queue/[id]
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const { id } = await params
    const item = await TaskQueueService.getById(TENANT_ID, id)
    if (!item) return apiNotFound('Task nicht gefunden')
    return apiSuccess(item)
  })
}

// DELETE /api/v1/task-queue/[id]
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await TaskQueueService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Task nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

// PUT /api/v1/task-queue/[id] - Cancel task
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    if (body.action === 'cancel') {
      const cancelled = await TaskQueueService.cancel(TENANT_ID, id)
      if (!cancelled) return apiNotFound('Task nicht gefunden oder nicht stornierbar')
      return apiSuccess({ cancelled: true })
    }
    return apiServerError()
  })
}

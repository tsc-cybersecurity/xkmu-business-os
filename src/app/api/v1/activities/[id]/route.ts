import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
} from '@/lib/utils/api-response'
import { ActivityService } from '@/lib/services/activity.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'activities', 'read', async (auth) => {
    const { id } = await params
    const activity = await ActivityService.getById(auth.tenantId, id)
    if (!activity) return apiNotFound('Aktivitaet nicht gefunden')

    return apiSuccess(activity)
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'activities', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ActivityService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Aktivitaet nicht gefunden')

    return apiSuccess({ deleted: true })
  })
}

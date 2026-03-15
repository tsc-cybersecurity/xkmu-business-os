import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { ActivityService } from '@/lib/services/activity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'activities', 'read', async (auth) => {
    const { id } = await params
    const activity = await ActivityService.getById(auth.tenantId, id)
    if (!activity) return apiNotFound('Aktivitaet nicht gefunden')

    return apiSuccess(activity)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'activities', 'update', async (auth) => {
    const { id } = await params
    try {
      const body = await request.json()
      const updated = await ActivityService.update(auth.tenantId, id, {
        subject: body.subject !== undefined ? body.subject : undefined,
        content: body.content !== undefined ? body.content : undefined,
        metadata: body.metadata !== undefined ? body.metadata : undefined,
      })
      if (!updated) return apiNotFound('Aktivitaet nicht gefunden')

      return apiSuccess(updated)
    } catch (error) {
      logger.error('Update activity error', error, { module: 'ActivitiesAPI' })
      return apiError('UPDATE_FAILED', 'Fehler beim Aktualisieren', 500)
    }
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

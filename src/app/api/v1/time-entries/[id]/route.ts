import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { TimeEntryService } from '@/lib/services/time-entry.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'time_entries', 'read', async (auth) => {
    const { id } = await params
    const entry = await TimeEntryService.getById(id)
    if (!entry) return apiNotFound('Zeiteintrag nicht gefunden')
    return apiSuccess(entry)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'time_entries', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const entry = await TimeEntryService.update(id, {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
      })
      if (!entry) return apiNotFound('Zeiteintrag nicht gefunden')
      return apiSuccess(entry)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'time_entries', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await TimeEntryService.delete(id)
    if (!deleted) return apiNotFound('Zeiteintrag nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

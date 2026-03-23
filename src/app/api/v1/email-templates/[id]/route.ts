import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { EmailTemplateService } from '@/lib/services/email-template.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const { id } = await params
    const template = await EmailTemplateService.getById(auth.tenantId, id)
    if (!template) return apiNotFound('Template nicht gefunden')
    return apiSuccess(template)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const template = await EmailTemplateService.update(auth.tenantId, id, body)
      if (!template) return apiNotFound('Template nicht gefunden')
      return apiSuccess(template)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await EmailTemplateService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Template nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

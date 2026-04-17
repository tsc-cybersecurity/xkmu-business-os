import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { ContractTemplateService } from '@/lib/services/contract-template.service'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const template = await ContractTemplateService.getById(TENANT_ID, id)
    if (!template) return apiNotFound('Template nicht gefunden')
    return apiSuccess(template)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    try {
      const template = await ContractTemplateService.update(TENANT_ID, id, body)
      if (!template) return apiNotFound('Template nicht gefunden')
      return apiSuccess(template)
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    try {
      const deleted = await ContractTemplateService.delete(TENANT_ID, id)
      if (!deleted) return apiNotFound('Template nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}

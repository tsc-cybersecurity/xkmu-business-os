import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { ReceiptService } from '@/lib/services/receipt.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const receipt = await ReceiptService.getById(auth.tenantId, id)
    if (!receipt) return apiNotFound('Beleg nicht gefunden')
    return apiSuccess(receipt)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const receipt = await ReceiptService.update(auth.tenantId, id, {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
      })
      if (!receipt) return apiNotFound('Beleg nicht gefunden')
      return apiSuccess(receipt)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ReceiptService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Beleg nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

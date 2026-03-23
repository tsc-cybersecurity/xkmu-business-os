import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ReceiptService } from '@/lib/services/receipt.service'
import { withPermission } from '@/lib/auth/require-permission'
import { parsePaginationParams } from '@/lib/utils/api-response'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const result = await ReceiptService.list(auth.tenantId, { ...pagination, status })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const body = await request.json()
      const receipt = await ReceiptService.create(auth.tenantId, {
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        amount: body.amount,
        date: body.date ? new Date(body.date) : undefined,
        vendor: body.vendor,
        category: body.category,
        notes: body.notes,
        ocrData: body.ocrData,
      })
      return apiSuccess(receipt, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

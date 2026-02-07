import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
} from '@/lib/utils/api-response'
import { ApiKeyService } from '@/lib/services/api-key.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'api_keys', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ApiKeyService.delete(auth.tenantId, id)

    if (!deleted) {
      return apiNotFound('API key not found')
    }

    return apiSuccess({ message: 'API key deleted successfully' })
  })
}

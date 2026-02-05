import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from '@/lib/utils/api-response'
import { ApiKeyService } from '@/lib/services/api-key.service'
import { getSession } from '@/lib/auth/session'

type Params = Promise<{ id: string }>

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  // Only admin and owner can delete API keys
  if (!['owner', 'admin'].includes(session.user.role)) {
    return apiForbidden('Insufficient permissions')
  }

  const { id } = await params
  const deleted = await ApiKeyService.delete(session.user.tenantId, id)

  if (!deleted) {
    return apiNotFound('API key not found')
  }

  return apiSuccess({ message: 'API key deleted successfully' })
}

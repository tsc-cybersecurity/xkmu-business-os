import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ApiDocAnnotationService } from '@/lib/services/api-docs-annotation.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const rows = await ApiDocAnnotationService.getAll()
      return apiSuccess(rows)
    } catch {
      return apiServerError()
    }
  })
}

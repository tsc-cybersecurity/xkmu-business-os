import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'update', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') ?? undefined
      // Only allow known status values (or no filter)
      const filter = status && ['pending', 'approved', 'rejected'].includes(status)
        ? { status, limit: 200 }
        : { limit: 200 }
      const rows = await CompanyChangeRequestService.list(filter)
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list all change requests', error, { module: 'AdminChangeRequestAPI' })
      return apiError('LIST_FAILED', 'Anträge konnten nicht geladen werden', 500)
    }
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'companies', 'read', async () => {
    const { id: companyId } = await params
    try {
      const rows = await CompanyChangeRequestService.list({ companyId, limit: 100 })
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list change requests for company', error, { module: 'AdminChangeRequestAPI', companyId })
      return apiError('LIST_FAILED', 'Anträge konnten nicht geladen werden', 500)
    }
  })
}

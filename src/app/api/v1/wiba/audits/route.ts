import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { WibaAuditService } from '@/lib/services/wiba-audit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const createAuditSchema = z.object({
  clientCompanyId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'wiba_audits', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const result = await WibaAuditService.list(TENANT_ID, { ...pagination, status })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'wiba_audits', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createAuditSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const session = await WibaAuditService.create(
        TENANT_ID,
        auth.userId!,
        validation.data
      )
      return apiSuccess(session, undefined, 201)
    } catch (error) {
      logger.error('Error creating WiBA audit', error, { module: 'WibaAuditsAPI' })
      return apiServerError()
    }
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createLeadSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(request: NextRequest) {
  return withPermission(request, 'leads', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const source = searchParams.get('source') || undefined
    const assignedTo = searchParams.get('assignedTo') || undefined
    const search = searchParams.get('search') || undefined

    // Handle multiple status values (comma-separated)
    const statusFilter = status?.includes(',') ? status.split(',') : status

    const result = await LeadService.list({
      ...pagination,
      status: statusFilter,
      source,
      assignedTo,
      search,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'leads', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(createLeadSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const lead = await LeadService.create(validation.data)

      return apiSuccess(lead, undefined, 201)
    } catch (error) {
      logger.error('Create lead error', error, { module: 'LeadsAPI' })
      return apiError('CREATE_FAILED', 'Failed to create lead', 500)
    }
  })
}

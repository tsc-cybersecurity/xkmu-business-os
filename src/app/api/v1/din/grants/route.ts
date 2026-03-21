import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, parsePaginationParams } from '@/lib/utils/api-response'
import { DinGrantService } from '@/lib/services/din-grant.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

const createGrantSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  provider: z.string().min(1, 'Anbieter ist erforderlich'),
  purpose: z.string().optional().nullable(),
  url: z.string().url('Ungültige URL').optional().nullable().or(z.literal('')),
  region: z.string().min(1, 'Region ist erforderlich'),
  minEmployees: z.number().int().min(0).optional().nullable(),
  maxEmployees: z.number().int().min(0).optional().nullable(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'din_grants', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)
    const region = searchParams.get('region') || undefined
    const employeeCount = searchParams.get('employeeCount')
      ? parseInt(searchParams.get('employeeCount')!)
      : undefined

    const result = await DinGrantService.list({ region, employeeCount, page, limit })
    const regions = await DinGrantService.getRegions()

    return apiSuccess({ grants: result.items, regions }, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'din_grants', 'create', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createGrantSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const grant = await DinGrantService.create({
        ...validation.data,
        url: validation.data.url || null,
      })
      return apiSuccess(grant, undefined, 201)
    } catch (error) {
      logger.error('Error creating grant', error, { module: 'DinGrantsAPI' })
      return apiServerError()
    }
  })
}

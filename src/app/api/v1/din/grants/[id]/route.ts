import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { DinGrantService } from '@/lib/services/din-grant.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

const updateGrantSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  purpose: z.string().optional().nullable(),
  url: z.string().url('Ungültige URL').optional().nullable().or(z.literal()),
  region: z.string().min(1).optional(),
  minEmployees: z.number().int().min(0).optional().nullable(),
  maxEmployees: z.number().int().min(0).optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_grants', 'read', async () => {
    const { id } = await params
    const grant = await DinGrantService.getById(id)
    if (!grant) return apiNotFound('Fördermittel nicht gefunden')
    return apiSuccess(grant)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_grants', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateGrantSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const grant = await DinGrantService.update(id, {
        ...validation.data,
        url: validation.data.url !== undefined ? (validation.data.url || null) : undefined,
      })
      if (!grant) return apiNotFound('Fördermittel nicht gefunden')
      return apiSuccess(grant)
    } catch (error) {
      logger.error('Error updating grant', error, { module: 'DinGrantsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_grants', 'delete', async () => {
    try {
      const { id } = await params
      const deleted = await DinGrantService.delete(id)
      if (!deleted) return apiNotFound('Fördermittel nicht gefunden')
      return apiSuccess({ message: 'Fördermittel gelöscht' })
    } catch (error) {
      logger.error('Error deleting grant', error, { module: 'DinGrantsAPI' })
      return apiServerError()
    }
  })
}

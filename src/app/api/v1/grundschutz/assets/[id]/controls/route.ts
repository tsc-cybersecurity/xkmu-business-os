import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { logger } from '@/lib/utils/logger'

const upsertControlMappingSchema = z.object({
  controlId: z.string().min(1),
  applicability: z.enum(['applicable', 'not_applicable']).optional(),
  justification: z.string().optional(),
  implementationStatus: z.enum(['offen', 'geplant', 'umgesetzt', 'teilweise', 'nicht_umgesetzt']).optional(),
  implementationNotes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const parsed = validateAndParse(upsertControlMappingSchema, body)

      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.errors.issues.map(i => i.message).join(', '), 400)
      }

      const mapping = await GrundschutzAssetService.upsertControlMapping(auth.tenantId, id, parsed.data)
      return apiSuccess(mapping)
    } catch (error) {
      logger.error('Error upserting Grundschutz control mapping', error, { module: 'GrundschutzControlsAPI' })
      return apiServerError()
    }
  })
}

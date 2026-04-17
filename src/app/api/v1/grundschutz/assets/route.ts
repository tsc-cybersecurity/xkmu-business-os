import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const createAssetSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryType: z.string().min(1),
  categoryName: z.string().min(1),
  categoryUuid: z.string().optional(),
  vertraulichkeit: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  integritaet: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  verfuegbarkeit: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  schutzbedarfBegruendung: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  status: z.enum(['active', 'planned', 'decommissioned']).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const companyId = searchParams.get('companyId')

      if (!companyId) {
        return apiError('VALIDATION_ERROR', 'companyId ist erforderlich', 400)
      }

      const filters = {
        categoryType: searchParams.get('categoryType') || undefined,
        status: searchParams.get('status') || undefined,
        search: searchParams.get('search') || undefined,
      }

      const assets = await GrundschutzAssetService.list(TENANT_ID, companyId, filters)
      return apiSuccess(assets)
    } catch (error) {
      logger.error('Error listing Grundschutz assets', error, { module: 'GrundschutzAssetsAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async (auth) => {
    try {
      const body = await request.json()
      const parsed = validateAndParse(createAssetSchema, body)

      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.errors.issues.map(i => i.message).join(', '), 400)
      }

      const asset = await GrundschutzAssetService.create(TENANT_ID, parsed.data)
      return apiSuccess(asset, undefined, 201)
    } catch (error) {
      logger.error('Error creating Grundschutz asset', error, { module: 'GrundschutzAssetsAPI' })
      return apiServerError()
    }
  })
}

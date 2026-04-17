import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { id } = await params
      const asset = await GrundschutzAssetService.getById(TENANT_ID, id)

      if (!asset) {
        return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      }

      return apiSuccess(asset)
    } catch (error) {
      logger.error('Error getting Grundschutz asset', error, { module: 'GrundschutzAssetAPI' })
      return apiServerError()
    }
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()

      const asset = await GrundschutzAssetService.update(TENANT_ID, id, body)

      if (!asset) {
        return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      }

      return apiSuccess(asset)
    } catch (error) {
      logger.error('Error updating Grundschutz asset', error, { module: 'GrundschutzAssetAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'delete', async (auth) => {
    try {
      const { id } = await params
      const deleted = await GrundschutzAssetService.delete(TENANT_ID, id)

      if (!deleted) {
        return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      }

      return apiSuccess(null)
    } catch (error) {
      logger.error('Error deleting Grundschutz asset', error, { module: 'GrundschutzAssetAPI' })
      return apiServerError()
    }
  })
}

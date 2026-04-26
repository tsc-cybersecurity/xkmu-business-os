import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { CourseAssetService, CourseAssetError } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; assetId: string }> }

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { assetId } = await ctx.params
      await CourseAssetService.delete(assetId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseAssetError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Asset delete failed', err, { module: 'CourseAssetsAPI' })
      return apiServerError()
    }
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { CourseAssetService, CourseAssetError } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id: courseId } = await ctx.params
      const form = await request.formData()
      const file = form.get('file')
      const kind = String(form.get('kind') ?? '')
      const lessonId = String(form.get('lessonId') ?? '')
      const labelRaw = form.get('label')
      const label = labelRaw ? String(labelRaw) : undefined

      if (!(file instanceof File)) {
        return apiValidationError([{ field: 'file', message: 'Datei fehlt' }])
      }
      if (kind !== 'video' && kind !== 'document') {
        return apiValidationError([{ field: 'kind', message: 'kind muss video oder document sein' }])
      }
      if (!lessonId) {
        return apiValidationError([{ field: 'lessonId', message: 'lessonId fehlt' }])
      }

      const asset = await CourseAssetService.uploadForLesson(
        lessonId,
        courseId,
        file,
        kind,
        label,
        { userId: auth.userId, userRole: auth.role ?? null },
      )
      return apiSuccess(asset, undefined, 201)
    } catch (err) {
      if (err instanceof CourseAssetError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return NextResponse.json(
            { success: false, error: { code: 'FILE_TOO_LARGE', message: err.message } },
            { status: 413 },
          )
        }
        if (err.code === 'INVALID_MIME') {
          return apiValidationError([{ field: 'file', message: err.message }])
        }
      }
      logger.error('Asset upload failed', err, { module: 'CourseAssetsAPI' })
      return apiServerError()
    }
  })
}

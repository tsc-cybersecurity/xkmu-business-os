import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { ScormImportService, ScormImportError } from '@/lib/services/scorm/scorm-import.service'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

const MAX_BYTES = Number(process.env.SCORM_PACKAGE_MAX_MB ?? 500) * 1024 * 1024

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id: courseId } = await ctx.params
      const form = await request.formData()
      const file = form.get('file')

      if (!(file instanceof File)) {
        return apiValidationError([{ field: 'file', message: 'SCORM-Paket (ZIP) fehlt' }])
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { success: false, error: { code: 'FILE_TOO_LARGE', message: `Datei ${file.size} > Max ${MAX_BYTES} bytes` } },
          { status: 413 },
        )
      }
      if (!file.name.toLowerCase().endsWith('.zip')) {
        return apiValidationError([{ field: 'file', message: 'Nur .zip-Dateien werden akzeptiert' }])
      }

      const result = await ScormImportService.importToCourse(courseId, file, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(result, undefined, 201)
    } catch (err) {
      if (err instanceof ScormImportError) {
        if (err.code === 'COURSE_NOT_FOUND') return apiNotFound(err.message)
        return apiValidationError([{ field: 'file', message: err.message }])
      }
      logger.error('SCORM import failed', err, { module: 'ScormImportAPI' })
      return apiServerError('SCORM-Import fehlgeschlagen')
    }
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { ScormExportService, ScormExportError } from '@/lib/services/scorm/scorm-export.service'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async (auth) => {
    try {
      const { id: courseId } = await ctx.params
      const result = await ScormExportService.exportCourse(courseId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return new NextResponse(result.buffer as unknown as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Content-Length': String(result.buffer.length),
        },
      })
    } catch (err) {
      if (err instanceof ScormExportError) {
        if (err.code === 'COURSE_NOT_FOUND') return apiNotFound(err.message)
        return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: 400 })
      }
      logger.error('SCORM export failed', err, { module: 'ScormExportAPI' })
      return apiServerError('SCORM-Export fehlgeschlagen')
    }
  })
}

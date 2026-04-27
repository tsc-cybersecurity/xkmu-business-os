import { NextRequest, NextResponse } from 'next/server'
import { apiUnauthorized, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CertificatePdfService, CertificatePdfError } from '@/lib/services/certificate-pdf.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: courseId } = await ctx.params
      const buffer = await CertificatePdfService.renderForUserCourse(auth.userId, courseId)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="zertifikat-${courseId}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (err) {
      if (err instanceof CertificatePdfError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Certificate PDF render failed', err, { module: 'CertificatePdfAPI' })
      return apiServerError()
    }
  })
}

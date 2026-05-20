import { NextRequest, NextResponse } from 'next/server'
import { apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { BusinessPlanExportService, BusinessPlanExportError } from '@/lib/services/business-plan/pdf-export.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'read', async () => {
    try {
      const { id } = await params
      const { buffer, filename } = await BusinessPlanExportService.generatePdf(id)
      // Node-Buffer ist nicht direkt BodyInit-kompatibel — als Uint8Array casten
      // damit NextResponse den ArrayBufferView akzeptiert.
      const bytes = new Uint8Array(buffer)
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'no-store',
        },
      })
    } catch (err) {
      if (err instanceof BusinessPlanExportError) {
        if (err.code === 'not_found') return apiNotFound(err.message)
        if (err.code === 'no_iteration') {
          return NextResponse.json(
            { success: false, error: { code: 'NO_CONTENT', message: err.message } },
            { status: 409 },
          )
        }
      }
      logger.error('Error exporting business plan PDF', err, { module: 'BusinessPlansAPI' })
      return apiServerError(err instanceof Error ? err.message : undefined)
    }
  })
}

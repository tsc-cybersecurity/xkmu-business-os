import { NextRequest, NextResponse } from 'next/server'
import { SopService } from '@/lib/services/sop.service'
import { generateSopPdf } from '@/lib/services/sop-pdf.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const sop = await SopService.getById(auth.tenantId, id)
    if (!sop) {
      return NextResponse.json({ error: 'SOP nicht gefunden' }, { status: 404 })
    }

    const doc = generateSopPdf(sop)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const slug = sop.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOP_${slug}_v${sop.version || '1.0.0'}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  })
}

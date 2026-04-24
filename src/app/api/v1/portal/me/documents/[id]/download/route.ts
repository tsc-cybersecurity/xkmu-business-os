import { NextRequest } from 'next/server'
import { apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { readFile } from 'fs/promises'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, '_')
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    const doc = await PortalDocumentService.getById(id)
    if (!doc || doc.companyId !== auth.companyId || doc.deletedAt) {
      return apiNotFound('Dokument nicht gefunden')
    }
    try {
      const diskPath = PortalDocumentService.resolveDiskPath(doc.storagePath)
      const buf = await readFile(diskPath)
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': doc.mimeType,
          'Content-Length': String(doc.sizeBytes),
          'Content-Disposition': `attachment; filename="${sanitizeFilename(doc.fileName)}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (err) {
      logger.error('portal doc download failed', err, { module: 'PortalDocumentsAPI' })
      return apiNotFound('Datei nicht lesbar')
    }
  })
}

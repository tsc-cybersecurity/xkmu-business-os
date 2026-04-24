import { NextRequest } from 'next/server'
import { apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { readFile } from 'fs/promises'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string; docId: string }>

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, '_')
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'read', async () => {
    const { id: companyId, docId } = await params
    const doc = await PortalDocumentService.getById(docId)
    if (!doc || doc.companyId !== companyId) {
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
      logger.error('admin doc download failed', err, { module: 'AdminPortalDocsAPI' })
      return apiNotFound('Datei nicht lesbar')
    }
  })
}

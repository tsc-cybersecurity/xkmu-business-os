import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { apiSuccess,
  apiError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { BusinessDocumentService } from '@/lib/services/business-document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
const UPLOAD_DIR = process.env.BI_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads', 'bi')

export async function GET(request: NextRequest) {
  return withPermission(request, 'business_intelligence', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined

    const result = await BusinessDocumentService.list({
      ...pagination,
      status,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'business_intelligence', 'create', async (auth) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return apiError('VALIDATION_ERROR', 'Keine Datei hochgeladen', 400)
      }

      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/plain',
      ]

      if (!allowedTypes.includes(file.type)) {
        return apiError('VALIDATION_ERROR', 'Dateityp nicht unterstuetzt. Erlaubt: PDF, DOCX, XLSX, TXT', 400)
      }

      if (file.size > 10 * 1024 * 1024) {
        return apiError('VALIDATION_ERROR', 'Datei zu gross (max. 10 MB)', 400)
      }

      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      // Save file to disk
      await mkdir(UPLOAD_DIR, { recursive: true })
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(UPLOAD_DIR, filename), buffer)

      const doc = await BusinessDocumentService.create({
          filename,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        auth.userId ?? undefined
      )

      return apiSuccess(doc, undefined, 201)
    } catch (error) {
      logger.error('Error uploading business document', error, { module: 'BusinessIntelligenceDocumentsAPI' })
      return apiServerError()
    }
  })
}

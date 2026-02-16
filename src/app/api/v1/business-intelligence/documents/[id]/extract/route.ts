import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  apiSuccess,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { BusinessDocumentService } from '@/lib/services/business-document.service'
import { withPermission } from '@/lib/auth/require-permission'

export const maxDuration = 120

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'bi')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'business_intelligence', 'update', async (auth) => {
    try {
      const { id } = await params
      const doc = await BusinessDocumentService.getById(auth.tenantId, id)
      if (!doc) return apiNotFound('Dokument nicht gefunden')

      // Mark as processing
      await BusinessDocumentService.updateExtraction(auth.tenantId, id, null, 'processing')

      let extractedText = ''

      try {
        // Read file from disk
        const filePath = path.join(UPLOAD_DIR, doc.filename)
        const buffer = await readFile(filePath)

        if (doc.mimeType === 'application/pdf') {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: new Uint8Array(buffer) })
          const textResult = await parser.getText()
          extractedText = textResult.text || ''
        } else if (doc.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const mammoth = await import('mammoth')
          const result = await mammoth.extractRawText({ buffer })
          extractedText = result.value
        } else if (
          doc.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          doc.mimeType === 'application/vnd.ms-excel'
        ) {
          const XLSX = await import('xlsx')
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          const texts: string[] = []
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            texts.push(`=== ${sheetName} ===\n${XLSX.utils.sheet_to_csv(sheet)}`)
          }
          extractedText = texts.join('\n\n')
        } else if (doc.mimeType === 'text/plain') {
          extractedText = buffer.toString('utf-8')
        } else {
          await BusinessDocumentService.updateExtraction(auth.tenantId, id, null, 'failed')
          return apiError('VALIDATION_ERROR', 'Dateityp wird fuer Textextraktion nicht unterstuetzt', 400)
        }

        const updated = await BusinessDocumentService.updateExtraction(auth.tenantId, id, extractedText, 'completed')
        return apiSuccess(updated)
      } catch (extractError) {
        console.error('Text extraction failed:', extractError)
        await BusinessDocumentService.updateExtraction(auth.tenantId, id, null, 'failed')
        return apiError('EXTRACTION_FAILED', 'Textextraktion fehlgeschlagen', 500)
      }
    } catch (error) {
      console.error('Error in document extraction:', error)
      return apiServerError()
    }
  })
}

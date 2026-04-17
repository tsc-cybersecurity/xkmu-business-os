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
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const UPLOAD_DIR = process.env.BI_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads', 'bi')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'business_intelligence', 'update', async (auth) => {
    try {
      const { id } = await params
      const doc = await BusinessDocumentService.getById(TENANT_ID, id)
      if (!doc) return apiNotFound('Dokument nicht gefunden')

      // Mark as processing
      await BusinessDocumentService.updateExtraction(TENANT_ID, id, null, 'processing')

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
          const ExcelJS = await import('exceljs')
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(buffer.buffer as ArrayBuffer)
          const texts: string[] = []
          workbook.eachSheet((sheet) => {
            const rows: string[] = []
            sheet.eachRow((row) => {
              const values = (row.values as unknown[]).slice(1) // exceljs is 1-indexed
              rows.push(values.map((v) => (v != null ? String(v) : '')).join(','))
            })
            texts.push(`=== ${sheet.name} ===\n${rows.join('\n')}`)
          })
          extractedText = texts.join('\n\n')
        } else if (doc.mimeType === 'text/plain') {
          extractedText = buffer.toString('utf-8')
        } else {
          await BusinessDocumentService.updateExtraction(TENANT_ID, id, null, 'failed')
          return apiError('VALIDATION_ERROR', 'Dateityp wird fuer Textextraktion nicht unterstuetzt', 400)
        }

        const updated = await BusinessDocumentService.updateExtraction(TENANT_ID, id, extractedText, 'completed')
        return apiSuccess(updated)
      } catch (extractError) {
        logger.error('Text extraction failed', extractError, { module: 'BusinessIntelligenceDocumentsExtractAPI' })
        await BusinessDocumentService.updateExtraction(TENANT_ID, id, null, 'failed')
        return apiError('EXTRACTION_FAILED', 'Textextraktion fehlgeschlagen', 500)
      }
    } catch (error) {
      logger.error('Error in document extraction', error, { module: 'BusinessIntelligenceDocumentsExtractAPI' })
      return apiServerError()
    }
  })
}

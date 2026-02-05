// Allow longer execution time for PDF + AI
export const maxDuration = 120

import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { DocumentAnalysisService } from '@/lib/services/ai/document-analysis.service'
import { ActivityService } from '@/lib/services/activity.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const { id } = await params
    const company = await CompanyService.getById(auth.tenantId, id)
    if (!company) return apiNotFound('Firma nicht gefunden')

    // FormData lesen
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return apiError('NO_FILE', 'Bitte laden Sie eine PDF-Datei hoch', 400)
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return apiError('INVALID_FILE_TYPE', 'Nur PDF-Dateien werden unterstuetzt', 400)
    }

    // File in Buffer umwandeln
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Analyse durchfuehren
    const result = await DocumentAnalysisService.analyzeDocument(
      buffer,
      company.name,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'document_analysis',
        entityType: 'company',
        entityId: id,
      }
    )

    // KPIs in Company custom fields speichern
    const currentCustomFields = (company.customFields || {}) as Record<string, unknown>
    await CompanyService.update(auth.tenantId, id, {
      customFields: {
        ...currentCustomFields,
        documentAnalysis: {
          ...result,
          fileName: file.name,
        },
      },
    })

    // Activity-Log erstellen
    await ActivityService.create(auth.tenantId, {
      companyId: id,
      type: 'note',
      subject: `Dokumentanalyse: ${file.name}`,
      content: result.summary,
      metadata: {
        documentType: result.documentType,
        fileName: file.name,
        kpiCount: Object.keys(result.financialKPIs).length,
      },
    }, auth.userId)

    return apiSuccess(result)
  } catch (error) {
    console.error('Error analyzing document:', error)
    return apiServerError()
  }
}

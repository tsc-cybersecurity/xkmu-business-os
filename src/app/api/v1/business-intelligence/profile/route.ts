import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { BusinessProfileService } from '@/lib/services/business-profile.service'
import { BusinessDocumentService } from '@/lib/services/business-document.service'
import { BusinessIntelligenceAIService } from '@/lib/services/ai/business-intelligence-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'business_intelligence', 'read', async (auth) => {
    const profile = await BusinessProfileService.getByTenant(auth.tenantId)
    return apiSuccess(profile)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'business_intelligence', 'create', async (auth) => {
    try {
      const docs = await BusinessDocumentService.getExtractedDocuments(auth.tenantId)

      if (docs.length === 0) {
        return apiError('NO_DOCUMENTS', 'Keine extrahierten Dokumente vorhanden. Bitte laden Sie zuerst Dokumente hoch und extrahieren Sie den Text.', 400)
      }

      const extractedTexts = docs
        .map(d => d.extractedText)
        .filter((t): t is string => !!t)

      if (extractedTexts.length === 0) {
        return apiError('NO_TEXT', 'Keine Texte zur Analyse vorhanden.', 400)
      }

      const analysisResult = await BusinessIntelligenceAIService.analyzeDocuments(
        extractedTexts,
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
          feature: 'business_intelligence',
          entityType: 'business_profile',
        }
      )

      const documentIds = docs.map(d => d.id)
      const profile = await BusinessProfileService.upsert(auth.tenantId, analysisResult, documentIds)

      return apiSuccess(profile)
    } catch (error) {
      logger.error('Error analyzing business documents', error, { module: 'BusinessIntelligenceProfileAPI' })
      if (error instanceof Error) {
        return apiError('ANALYSIS_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}

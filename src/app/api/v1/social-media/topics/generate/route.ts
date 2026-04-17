import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { generateTopicsSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaAIService } from '@/lib/services/ai/social-media-ai.service'
import { BusinessProfileService } from '@/lib/services/business-profile.service'
import { db } from '@/lib/db'
import { socialMediaTopics } from '@/lib/db/schema'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateTopicsSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Business-Profil laden
      const profile = await BusinessProfileService.getLatest()

      // SWOT-Staerken extrahieren
      let strengths: string | undefined
      if (profile?.swotAnalysis) {
        const swot = profile.swotAnalysis as { strengths?: string[] }
        if (swot.strengths?.length) {
          strengths = swot.strengths.join(', ')
        }
      }

      const generated = await SocialMediaAIService.generateTopics(
        {
          count: validation.data.count,
          companyName: profile?.companyName || undefined,
          industry: profile?.industry || undefined,
          businessModel: profile?.businessModel || undefined,
          targetGroup: profile?.marketAnalysis || undefined,
          strengths,
        },
        {
          userId: auth.userId,
          feature: 'social_media',
          entityType: 'social_media_topic',
        }
      )

      // Generierte Themen direkt als Topics speichern (batch INSERT)
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
      const topicsToInsert = generated.map((t, i) => ({
        name: t.name,
        description: t.description || null,
        color: colors[i % colors.length],
      }))
      const saved = await db.insert(socialMediaTopics).values(topicsToInsert).returning()

      return apiSuccess(saved, undefined, 201)
    } catch (error) {
      logger.error('Error generating topics', error, { module: 'SocialMediaTopicsGenerateAPI' })
      if (error instanceof Error) {
        return apiError('GENERATION_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}

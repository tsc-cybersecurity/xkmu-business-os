import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { generateSocialPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaAIService } from '@/lib/services/ai/social-media-ai.service'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// Plattform-spezifisches Bild-Seitenverhaeltnis: IG Feed = quadratisch,
// FB/X/LinkedIn = Landscape. Default: 1:1 (passt fuer alle, IG am besten).
function aspectRatioForPlatform(platform: string): '1:1' | '16:9' | '9:16' {
  switch (platform) {
    case 'facebook':
    case 'linkedin':
    case 'x':
    case 'twitter':
    case 'xing':
      return '16:9'
    case 'instagram':
    default:
      return '1:1'
  }
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateSocialPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const generated = await SocialMediaAIService.generatePost(
        validation.data,
        {
          userId: auth.userId,
          feature: 'social_media',
          entityType: 'social_media_post',
        }
      )

      // Bild non-blocking generieren (analog Blog-Flow). Bei Fehler bleibt der
      // Beitrag ohne Bild — Operator kann manuell nachgenerieren via ImageField.
      let imageUrl: string | null = null
      if (validation.data.includeImage !== false && generated.imagePrompt) {
        try {
          const imgResult = await Promise.race([
            ImageGenerationService.generate(auth.userId ?? null, {
              prompt: generated.imagePrompt,
              provider: 'gemini',
              aspectRatio: aspectRatioForPlatform(validation.data.platform),
              category: 'social_media',
              tags: generated.hashtags?.slice(0, 5).map((h) => h.replace(/^#/, '')) ?? [],
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 60_000)),
          ])
          if (imgResult && imgResult.imageUrl) {
            imageUrl = imgResult.imageUrl
          } else {
            logger.warn('Social image generation timed out or returned empty', { module: 'SocialMediaPostsGenerateAPI' })
          }
        } catch (error) {
          logger.warn(
            `Social image generation failed: ${error instanceof Error ? error.message : String(error)}`,
            { module: 'SocialMediaPostsGenerateAPI' },
          )
        }
      }

      return apiSuccess({
        title: generated.title,
        content: generated.content,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        imageAlt: generated.imageAlt,
        imageUrl,
      })
    } catch (error) {
      logger.error('Error generating social media post', error, { module: 'SocialMediaPostsGenerateAPI' })
      if (error instanceof Error) {
        return apiError('GENERATION_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}

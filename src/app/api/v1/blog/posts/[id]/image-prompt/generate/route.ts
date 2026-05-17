import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// Schlaegt aus dem existierenden Beitragsinhalt einen englischen
// AI-Bildprompt + Alt-Text vor. Operator entscheidet im Editor, ob
// er das Vorschlagsergebnis uebernimmt — kein Auto-Save hier.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      const result = await BlogAIService.generateImagePrompt(
        post.title,
        post.excerpt ?? '',
        post.content ?? '',
        { userId: auth.userId, feature: 'blog_image_prompt_suggest' },
      )
      return apiSuccess(result)
    } catch (error) {
      logger.error('Error generating blog image prompt', error, { module: 'BlogPostsImagePromptAPI' })
      return apiServerError('KI-Bildprompt-Vorschlag fehlgeschlagen')
    }
  })
}

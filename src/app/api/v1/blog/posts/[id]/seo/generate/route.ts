import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      const seo = await BlogAIService.generateSEO(post.title, post.content || '', {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'blog_seo_generate',
      })

      return apiSuccess(seo)
    } catch (error) {
      logger.error('Error generating blog SEO', error, { module: 'BlogPostsSeoGenerateAPI' })
      return apiServerError('KI-SEO-Generierung fehlgeschlagen')
    }
  })
}

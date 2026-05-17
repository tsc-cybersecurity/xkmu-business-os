import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { BlogCategoryService } from '@/lib/services/blog-category.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// Schlaegt aus den aktiven blog_categories die passendste fuer den Beitrag
// vor. Gibt entweder den exakten Kategorienamen aus der Liste zurueck oder
// null — der Editor zeigt ihn im Select an, kein Auto-Save.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      const categories = await BlogCategoryService.list({ activeOnly: true })
      const candidateNames = categories.map((c) => c.name)
      if (candidateNames.length === 0) {
        return apiSuccess({ category: null, reason: 'Keine aktiven Kategorien vorhanden — unter CMS → Blog-Kategorien anlegen.' })
      }

      const result = await BlogAIService.suggestCategory(
        post.title,
        post.excerpt ?? '',
        post.content ?? '',
        candidateNames,
        { userId: auth.userId, feature: 'blog_category_suggest' },
      )
      return apiSuccess({ category: result.category })
    } catch (error) {
      logger.error('Error suggesting blog category', error, { module: 'BlogPostsCategorizeAPI' })
      return apiServerError('KI-Kategorie-Vorschlag fehlgeschlagen')
    }
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { CmsAIService } from '@/lib/services/ai/cms-ai.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const { id } = await params
      const page = await CmsPageService.getById(auth.tenantId, id)
      if (!page) return apiNotFound('Seite nicht gefunden')

      const blockContents = page.blocks.map((b) => {
        const c = b.content as Record<string, unknown>
        return `${b.blockType}: ${c.headline || c.sectionTitle || c.text || c.title || c.content || ''}`
      }).join('\n')

      const seo = await CmsAIService.generateSEO(blockContents, page.slug, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'cms_seo_generate',
      })

      return apiSuccess(seo)
    } catch (error) {
      console.error('Error generating SEO:', error)
      return apiServerError('KI-SEO-Generierung fehlgeschlagen')
    }
  })
}

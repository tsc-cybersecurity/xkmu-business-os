import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError, apiServerError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { WordPressService } from '@/lib/services/wordpress.service'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// POST /api/v1/blog/posts/[id]/publish-wp
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      // Get WordPress credentials from AI providers
      const providers = await AiProviderService.getActiveProviders(auth.tenantId)
      const wpProvider = providers.find(p => p.providerType === 'wordpress')
      if (!wpProvider?.apiKey) {
        return apiError('NO_WP_CONFIG', 'WordPress nicht konfiguriert. Bitte unter Einstellungen > KI-Provider einen WordPress-Provider mit URL|User|AppPassword anlegen.', 400)
      }

      // Parse credentials: stored as "url|user|appPassword" in apiKey field
      const parts = wpProvider.apiKey.split('|')
      if (parts.length < 3) {
        return apiError('INVALID_WP_CONFIG', 'WordPress-Konfiguration ungueltig. Format: URL|Benutzer|App-Passwort', 400)
      }

      const result = await WordPressService.publish(
        { url: parts[0], user: parts[1], appPassword: parts[2] },
        {
          title: post.title,
          content: post.content || '',
          excerpt: post.excerpt || '',
          status: 'draft',
        }
      )

      if (!result.success) {
        return apiError('WP_PUBLISH_FAILED', result.error || 'WordPress-Publishing fehlgeschlagen', 500)
      }

      return apiSuccess({
        wpPostId: result.wpPostId,
        wpUrl: result.wpUrl,
        status: 'draft',
      })
    } catch {
      return apiServerError()
    }
  })
}

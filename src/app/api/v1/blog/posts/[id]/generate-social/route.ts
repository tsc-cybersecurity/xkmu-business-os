import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { socialMediaPosts } from '@/lib/db/schema'
import { logger } from '@/lib/utils/logger'

const VALID_PLATFORMS = ['instagram', 'x', 'linkedin'] as const
type Platform = typeof VALID_PLATFORMS[number]

/**
 * Generiert pro Plattform einen Social-Media-Post-Entwurf aus einem Blogbeitrag
 * via die in der DB editierbaren Prompt-Templates (blog_to_instagram/x/linkedin).
 * Persistiert die Drafts in social_media_posts mit imageUrl = blog.featuredImage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Blogbeitrag nicht gefunden')

      // Optional: Plattform-Filter aus Body, default: alle 3
      let platforms: Platform[] = [...VALID_PLATFORMS]
      try {
        const body = await request.json()
        if (Array.isArray(body?.platforms) && body.platforms.length > 0) {
          const filtered = body.platforms.filter((p: unknown): p is Platform =>
            typeof p === 'string' && (VALID_PLATFORMS as readonly string[]).includes(p)
          )
          if (filtered.length === 0) {
            return apiValidationError('Mindestens eine gueltige Plattform erforderlich (instagram/x/linkedin)')
          }
          platforms = filtered
        }
      } catch {
        // Kein Body / kein JSON → defaults nutzen
      }

      // Public-URL fuer den "Mehr im Blog"-Link in den Posts
      const siteUrl =
        (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
          ? process.env.NEXT_PUBLIC_SITE_URL
          : process.env.NEXT_PUBLIC_APP_URL) ?? 'https://www.xkmu.de'

      const generated = await BlogAIService.generateSocialPosts(
        { title: post.title, content: post.content, excerpt: post.excerpt, slug: post.slug },
        { siteUrl, platforms },
        { userId: auth.userId, feature: 'social_media' }
      )

      // Erfolgreiche Generierungen filtern (leerer content → KI-Fail; nicht persistieren)
      const ok = generated.filter((g) => g.content.trim().length > 0)
      if (ok.length === 0) {
        return apiServerError('KI-Generierung lieferte keine verwertbaren Inhalte')
      }

      // In social_media_posts inserten — Bild des Blogs uebernehmen
      const inserted = await db
        .insert(socialMediaPosts)
        .values(
          ok.map((g) => ({
            platform: g.platform,
            content: g.content,
            hashtags: g.hashtags,
            imageUrl: post.featuredImage ?? null,
            status: 'draft' as const,
            aiGenerated: true,
            createdBy: auth.userId,
          }))
        )
        .returning({ id: socialMediaPosts.id, platform: socialMediaPosts.platform })

      return apiSuccess({
        created: inserted.length,
        skipped: generated.length - ok.length,
        posts: inserted,
      })
    } catch (error) {
      logger.error('Error generating social posts from blog', error, {
        module: 'BlogGenerateSocialAPI',
      })
      return apiServerError('Social-Media-Generierung fehlgeschlagen')
    }
  })
}

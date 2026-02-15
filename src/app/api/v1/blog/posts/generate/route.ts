import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { generateBlogPostSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { UnsplashService } from '@/lib/services/unsplash.service'
import { withPermission } from '@/lib/auth/require-permission'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'create', async (auth) => {
    const startTime = Date.now()
    try {
      const body = await request.json()
      const validation = validateAndParse(generateBlogPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const { topic, language, tone, length } = validation.data
      console.log('[BlogGenerate] Step 1: Validated input, calling AI...', { topic: topic.substring(0, 50) })

      const generated = await BlogAIService.generatePost(topic, { language, tone, length }, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'blog_generate',
      })
      console.log('[BlogGenerate] Step 2: AI responded after', Date.now() - startTime, 'ms. Title:', generated.title?.substring(0, 50))

      // Fetch featured image from Unsplash (non-blocking, with timeout)
      let featuredImage = ''
      let featuredImageAlt = generated.featuredImageAlt || ''

      if (generated.featuredImage) {
        try {
          const photo = await Promise.race([
            UnsplashService.searchPhoto(generated.featuredImage),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ])
          if (photo) {
            featuredImage = photo.url
            featuredImageAlt = generated.featuredImageAlt || photo.alt
          }
        } catch (error) {
          console.warn('[BlogGenerate] Unsplash failed:', error)
        }
      }
      console.log('[BlogGenerate] Step 3: Unsplash done after', Date.now() - startTime, 'ms')

      // Save as draft — handle duplicate slugs
      let slug = generated.slug
      try {
        const post = await BlogPostService.create(auth.tenantId, {
          title: generated.title,
          slug,
          excerpt: generated.excerpt,
          content: generated.content,
          featuredImage,
          featuredImageAlt,
          seoTitle: generated.seoTitle,
          seoDescription: generated.seoDescription,
          seoKeywords: generated.seoKeywords,
          tags: generated.tags,
          source: 'ai',
          aiMetadata: { topic, language, tone, length },
        }, auth.userId ?? undefined)
        console.log('[BlogGenerate] Step 4: Post saved after', Date.now() - startTime, 'ms. ID:', post.id)

        return apiSuccess(post, undefined, 201)
      } catch (dbError) {
        // If slug already exists, retry with generated unique slug
        const dbMessage = dbError instanceof Error ? dbError.message : String(dbError)
        if (dbMessage.includes('unique') || dbMessage.includes('duplicate') || dbMessage.includes('23505')) {
          console.warn('[BlogGenerate] Slug conflict for:', slug, '— generating unique slug')
          const uniqueSlug = await BlogPostService.generateSlug(generated.title, auth.tenantId)
          const post = await BlogPostService.create(auth.tenantId, {
            title: generated.title,
            slug: uniqueSlug,
            excerpt: generated.excerpt,
            content: generated.content,
            featuredImage,
            featuredImageAlt,
            seoTitle: generated.seoTitle,
            seoDescription: generated.seoDescription,
            seoKeywords: generated.seoKeywords,
            tags: generated.tags,
            source: 'ai',
            aiMetadata: { topic, language, tone, length },
          }, auth.userId ?? undefined)
          console.log('[BlogGenerate] Step 4b: Post saved with unique slug after', Date.now() - startTime, 'ms. ID:', post.id)
          return apiSuccess(post, undefined, 201)
        }
        throw dbError
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'KI-Generierung fehlgeschlagen'
      console.error('[BlogGenerate] FAILED after', Date.now() - startTime, 'ms:', message)
      return apiServerError(message)
    }
  })
}

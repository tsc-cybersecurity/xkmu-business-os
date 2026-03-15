import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { generateBlogPostSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { UnsplashService } from '@/lib/services/unsplash.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

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
      logger.info('Step 1: Validated input, calling AI...', { module: 'BlogPostsGenerateAPI' })

      const generated = await BlogAIService.generatePost(topic, { language, tone, length }, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'blog_generate',
      })
      logger.info('Step 2: AI responded after', { module: 'BlogPostsGenerateAPI' })

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
          logger.warn('Unsplash failed', { module: 'BlogPostsGenerateAPI' })
        }
      }
      logger.info('Step 3: Unsplash done after', { module: 'BlogPostsGenerateAPI' })

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
        logger.info('Step 4: Post saved after', { module: 'BlogPostsGenerateAPI' })

        return apiSuccess(post, undefined, 201)
      } catch (dbError) {
        // If slug already exists, retry with generated unique slug
        const dbMessage = dbError instanceof Error ? dbError.message : String(dbError)
        if (dbMessage.includes('unique') || dbMessage.includes('duplicate') || dbMessage.includes('23505')) {
          logger.warn('Slug conflict for', { module: 'BlogPostsGenerateAPI' })
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
          logger.info('Step 4b: Post saved with unique slug after', { module: 'BlogPostsGenerateAPI' })
          return apiSuccess(post, undefined, 201)
        }
        throw dbError
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'KI-Generierung fehlgeschlagen'
      logger.error('FAILED after', Date.now() - startTime, 'ms:', message, { module: 'BlogPostsGenerateAPI' })
      return apiServerError(message)
    }
  })
}

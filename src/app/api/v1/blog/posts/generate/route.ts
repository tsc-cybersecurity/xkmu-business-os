import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { generateBlogPostSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
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
        userId: auth.userId,
        feature: 'blog_generate',
      })
      logger.info('Step 2: AI responded after', { module: 'BlogPostsGenerateAPI' })

      // Generate featured image via AI (Gemini default, 16:9). Non-blocking on failure.
      let featuredImage = ''
      const featuredImageAlt = generated.featuredImageAlt || ''
      const imagePrompt = generated.featuredImage

      if (imagePrompt) {
        try {
          const result = await Promise.race([
            ImageGenerationService.generate(auth.userId ?? null, {
              prompt: imagePrompt,
              provider: 'gemini',
              aspectRatio: '16:9',
              category: 'blog',
              tags: generated.tags?.slice(0, 5) ?? [],
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 60_000)),
          ])
          if (result && result.imageUrl) {
            featuredImage = result.imageUrl
          } else {
            logger.warn('Image generation timed out or returned empty', { module: 'BlogPostsGenerateAPI' })
          }
        } catch (error) {
          // Non-fatal: post wird ohne Bild gespeichert, Operator kann nachtraeglich generieren
          logger.warn(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`, { module: 'BlogPostsGenerateAPI' })
        }
      }
      logger.info('Step 3: Image generation done', { module: 'BlogPostsGenerateAPI' })

      // Save as draft — handle duplicate slugs
      let slug = generated.slug
      try {
        const post = await BlogPostService.create({
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
          const uniqueSlug = await BlogPostService.generateSlug(generated.title)
          const post = await BlogPostService.create({
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
      logger.error(`Blog generation failed after ${Date.now() - startTime}ms: ${message}`, error, { module: 'BlogPostsGenerateAPI' })
      return apiServerError(message)
    }
  })
}

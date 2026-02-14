import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { generateBlogPostSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BlogAIService } from '@/lib/services/ai/blog-ai.service'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateBlogPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const { topic, language, tone, length } = validation.data

      const generated = await BlogAIService.generatePost(topic, { language, tone, length }, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'blog_generate',
      })

      // Save as draft
      const post = await BlogPostService.create(auth.tenantId, {
        title: generated.title,
        slug: generated.slug,
        excerpt: generated.excerpt,
        content: generated.content,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        seoKeywords: generated.seoKeywords,
        tags: generated.tags,
        source: 'ai',
        aiMetadata: { topic, language, tone, length },
      }, auth.userId ?? undefined)

      return apiSuccess(post, undefined, 201)
    } catch (error) {
      console.error('Error generating blog post:', error)
      return apiServerError('KI-Generierung fehlgeschlagen')
    }
  })
}

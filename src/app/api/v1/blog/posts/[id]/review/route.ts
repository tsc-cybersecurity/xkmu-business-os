import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

// POST /api/v1/blog/posts/[id]/review - KI-Review eines Blog-Posts
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await BlogPostService.getById(id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      if (!post.content || post.content.length < 50) {
        return apiSuccess({ error: 'Text zu kurz fuer Review (min. 50 Zeichen)' })
      }

      const keywords = [post.seoKeywords, post.seoTitle].filter(Boolean).join(', ')

      const template = await AiPromptTemplateService.getOrDefault('blog_review')
      const userPrompt = AiPromptTemplateService.applyPlaceholders(
        template.userPrompt,
        { content: post.content.substring(0, 8000), keywords: keywords || 'keine angegeben' }
      )

      const response = await AIService.completeWithContext(userPrompt, {
        feature: 'blog_review',
      }, {
        maxTokens: 2000,
        temperature: 0.3,
        systemPrompt: template.systemPrompt,
      })

      // Parse JSON response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      let review = null
      if (jsonMatch) {
        try { review = JSON.parse(jsonMatch[0]) } catch { /* raw text fallback */ }
      }

      return apiSuccess({
        review: review || { gesamtbewertung: response.text },
        postId: id,
        postTitle: post.title,
      })
    } catch {
      return apiServerError()
    }
  })
}

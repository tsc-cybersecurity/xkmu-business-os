import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateBlogPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'read', async (auth) => {
    const { id } = await params
    const post = await BlogPostService.getById(id)
    if (!post) return apiNotFound('Beitrag nicht gefunden')
    return apiSuccess(post)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateBlogPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const post = await BlogPostService.update(id, validation.data)
      if (!post) return apiNotFound('Beitrag nicht gefunden')
      return apiSuccess(post)
    } catch (error) {
      logger.error('Error updating blog post', error, { module: 'BlogPostsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await BlogPostService.delete(id)
    if (!deleted) return apiNotFound('Beitrag nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

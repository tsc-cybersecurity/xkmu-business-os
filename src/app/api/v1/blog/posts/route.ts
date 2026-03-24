import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createBlogPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const result = await BlogPostService.list({
      ...pagination,
      status,
      category,
      search,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createBlogPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const post = await BlogPostService.create(auth.tenantId, validation.data, auth.userId ?? undefined)
      return apiSuccess(post, undefined, 201)
    } catch (error) {
      logger.error('Error creating blog post', error, { module: 'BlogPostsAPI' })
      return apiServerError()
    }
  })
}

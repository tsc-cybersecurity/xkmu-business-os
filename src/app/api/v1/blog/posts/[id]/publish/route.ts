import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'update', async (auth) => {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const unpublish = searchParams.get('unpublish') === 'true'

    const post = unpublish
      ? await BlogPostService.unpublish(auth.tenantId, id)
      : await BlogPostService.publish(auth.tenantId, id)

    if (!post) return apiNotFound('Beitrag nicht gefunden')
    return apiSuccess(post)
  })
}

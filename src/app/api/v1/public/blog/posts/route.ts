import { NextRequest, NextResponse } from 'next/server'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50)
    const category = searchParams.get('category') || undefined
    const categoriesParam = searchParams.get('categories')
    const categories = categoriesParam
      ? categoriesParam.split(',').map(s => s.trim()).filter(Boolean)
      : undefined

    const result = await BlogPostService.listPublished({ page, limit, category, categories })
    return NextResponse.json({ success: true, data: result.items, meta: result.meta })
  } catch (error) {
    logger.error('Error fetching public blog posts', error, { module: 'PublicBlogPostsAPI' })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

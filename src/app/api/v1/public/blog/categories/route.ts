import { NextRequest, NextResponse } from 'next/server'
import { BlogCategoryService } from '@/lib/services/blog-category.service'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/public/blog/categories — only active categories for public site
export async function GET(_request: NextRequest) {
  try {
    const categories = await BlogCategoryService.list({ activeOnly: true })
    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    logger.error('Error fetching public blog categories', error, { module: 'PublicBlogCategoriesAPI' })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

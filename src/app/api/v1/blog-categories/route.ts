import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { BlogCategoryService } from '@/lib/services/blog-category.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/blog-categories
export async function GET(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async () => {
    try {
      const url = new URL(request.url)
      const activeOnly = url.searchParams.get('active') === 'true'
      const categories = await BlogCategoryService.list({ activeOnly })
      return apiSuccess(categories)
    } catch (error) {
      logger.error('Failed to list blog categories', error, { module: 'BlogCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Blog-Kategorien', 500)
    }
  })
}

// POST /api/v1/blog-categories
export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'create', async () => {
    try {
      const body = await request.json()
      if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
        return apiError('VALIDATION_ERROR', 'name ist erforderlich', 400)
      }
      const category = await BlogCategoryService.create({
        name: body.name,
        slug: body.slug,
        description: body.description,
        color: body.color,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      })
      return apiSuccess(category, undefined, 201)
    } catch (error) {
      logger.error('Failed to create blog category', error, { module: 'BlogCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der Kategorie', 500)
    }
  })
}

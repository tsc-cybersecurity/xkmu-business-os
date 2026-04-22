import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { BlogCategoryService } from '@/lib/services/blog-category.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'blog', 'read', async () => {
    const { id } = await params
    try {
      const category = await BlogCategoryService.getById(id)
      if (!category) return apiNotFound('Kategorie nicht gefunden')
      return apiSuccess(category)
    } catch (error) {
      logger.error('Failed to get blog category', error, { module: 'BlogCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Kategorie', 500)
    }
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'blog', 'update', async () => {
    const { id } = await params
    try {
      const body = await request.json()
      const category = await BlogCategoryService.update(id, {
        name: body.name,
        slug: body.slug,
        description: body.description,
        color: body.color,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      })
      if (!category) return apiNotFound('Kategorie nicht gefunden')
      return apiSuccess(category)
    } catch (error) {
      logger.error('Failed to update blog category', error, { module: 'BlogCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren', 500)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'blog', 'delete', async () => {
    const { id } = await params
    try {
      const deleted = await BlogCategoryService.delete(id)
      if (!deleted) return apiNotFound('Kategorie nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Failed to delete blog category', error, { module: 'BlogCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Löschen', 500)
    }
  })
}

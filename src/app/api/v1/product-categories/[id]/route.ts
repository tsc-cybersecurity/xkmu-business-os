import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateProductCategorySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductCategoryService } from '@/lib/services/product-category.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

// GET /api/v1/product-categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'product_categories', 'read', async (auth) => {
    const { id } = await params
    const category = await ProductCategoryService.getById(auth.tenantId, id)

    if (!category) {
      return apiNotFound('Kategorie nicht gefunden')
    }

    return apiSuccess(category)
  })
}

// PUT /api/v1/product-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'product_categories', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(updateProductCategorySchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const category = await ProductCategoryService.update(auth.tenantId, id, validation.data)

      if (!category) {
        return apiNotFound('Kategorie nicht gefunden')
      }

      return apiSuccess(category)
    } catch (error) {
      logger.error('Failed to update category', error, { module: 'ProductCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren der Kategorie', 500)
    }
  })
}

// DELETE /api/v1/product-categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'product_categories', 'delete', async (auth) => {
    const { id } = await params

    try {
      // Check for child categories
      const hasChildren = await ProductCategoryService.hasChildren(auth.tenantId, id)
      if (hasChildren) {
        return apiError(
          'HAS_CHILDREN',
          'Kategorie hat Unterkategorien. Bitte zuerst die Unterkategorien löschen oder verschieben.',
          409
        )
      }

      // Check for linked products
      const hasProducts = await ProductCategoryService.hasProducts(auth.tenantId, id)
      if (hasProducts) {
        return apiError(
          'HAS_PRODUCTS',
          'Kategorie enthält Produkte. Bitte zuerst die Produkte einer anderen Kategorie zuordnen.',
          409
        )
      }

      const deleted = await ProductCategoryService.delete(auth.tenantId, id)

      if (!deleted) {
        return apiNotFound('Kategorie nicht gefunden')
      }

      return apiSuccess({ message: 'Kategorie erfolgreich gelöscht' })
    } catch (error) {
      logger.error('Failed to delete category', error, { module: 'ProductCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Löschen der Kategorie', 500)
    }
  })
}

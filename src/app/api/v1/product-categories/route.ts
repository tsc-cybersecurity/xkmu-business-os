import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { createProductCategorySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductCategoryService } from '@/lib/services/product-category.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
// GET /api/v1/product-categories - List all categories
export async function GET(request: NextRequest) {
  return withPermission(request, 'product_categories', 'read', async (auth) => {
    try {
      const tree = request.nextUrl.searchParams.get('tree') === 'true'
      const items = tree
        ? await ProductCategoryService.getTree()
        : await ProductCategoryService.list()

      return apiSuccess(items)
    } catch (error) {
      logger.error('Failed to list categories', error, { module: 'ProductCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Kategorien', 500)
    }
  })
}

// POST /api/v1/product-categories - Create category
export async function POST(request: NextRequest) {
  return withPermission(request, 'product_categories', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createProductCategorySchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const category = await ProductCategoryService.create(validation.data)
      return apiSuccess(category, undefined, 201)
    } catch (error) {
      logger.error('Failed to create category', error, { module: 'ProductCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der Kategorie', 500)
    }
  })
}

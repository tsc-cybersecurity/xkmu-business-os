import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createProductSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductService } from '@/lib/services/product.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

// GET /api/v1/products - List products with filters
export async function GET(request: NextRequest) {
  return withPermission(request, 'products', 'read', async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const pagination = parsePaginationParams(searchParams)
      const filters = {
        ...pagination,
        type: searchParams.get('type') || undefined,
        status: searchParams.get('status') || undefined,
        categoryId: searchParams.get('categoryId') || undefined,
        tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
        search: searchParams.get('search') || undefined,
      }

      const result = await ProductService.list(TENANT_ID, filters)
      return apiSuccess(result.items, result.meta)
    } catch (error) {
      logger.error('Failed to list products', error, { module: 'ProductsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Produkte', 500)
    }
  })
}

// POST /api/v1/products - Create product/service
export async function POST(request: NextRequest) {
  return withPermission(request, 'products', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createProductSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const product = await ProductService.create(
        TENANT_ID,
        validation.data,
        auth.userId || undefined
      )
      return apiSuccess(product, undefined, 201)
    } catch (error) {
      logger.error('Failed to create product', error, { module: 'ProductsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des Produkts', 500)
    }
  })
}

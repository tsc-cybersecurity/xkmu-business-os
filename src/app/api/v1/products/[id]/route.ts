import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateProductSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductService } from '@/lib/services/product.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

// GET /api/v1/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'products', 'read', async (auth) => {
    const { id } = await params
    const product = await ProductService.getById(TENANT_ID, id)

    if (!product) {
      return apiNotFound('Produkt nicht gefunden')
    }

    return apiSuccess(product)
  })
}

// PUT /api/v1/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'products', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(updateProductSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const product = await ProductService.update(TENANT_ID, id, validation.data)

      if (!product) {
        return apiNotFound('Produkt nicht gefunden')
      }

      return apiSuccess(product)
    } catch (error) {
      logger.error('Failed to update product', error, { module: 'ProductsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren des Produkts', 500)
    }
  })
}

// DELETE /api/v1/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'products', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ProductService.delete(TENANT_ID, id)

    if (!deleted) {
      return apiNotFound('Produkt nicht gefunden')
    }

    return apiSuccess({ message: 'Produkt erfolgreich gelöscht' })
  })
}

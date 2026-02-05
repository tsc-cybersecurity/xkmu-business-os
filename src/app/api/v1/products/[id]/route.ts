import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateProductSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductService } from '@/lib/services/product.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) return { tenantId: payload.tenantId, userId: null }
  }
  return null
}

// GET /api/v1/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const product = await ProductService.getById(auth.tenantId, id)

  if (!product) {
    return apiNotFound('Produkt nicht gefunden')
  }

  return apiSuccess(product)
}

// PUT /api/v1/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params

  try {
    const body = await request.json()
    const validation = validateAndParse(updateProductSchema, body)

    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const product = await ProductService.update(auth.tenantId, id, validation.data)

    if (!product) {
      return apiNotFound('Produkt nicht gefunden')
    }

    return apiSuccess(product)
  } catch (error) {
    console.error('Failed to update product:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren des Produkts', 500)
  }
}

// DELETE /api/v1/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const deleted = await ProductService.delete(auth.tenantId, id)

  if (!deleted) {
    return apiNotFound('Produkt nicht gefunden')
  }

  return apiSuccess({ message: 'Produkt erfolgreich gelöscht' })
}

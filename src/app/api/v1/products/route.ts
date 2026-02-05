import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import {
  createProductSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ProductService } from '@/lib/services/product.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

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

// GET /api/v1/products - List products with filters
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const searchParams = request.nextUrl.searchParams
    const filters = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    const result = await ProductService.list(auth.tenantId, filters)
    return apiSuccess(result.items, result.meta)
  } catch (error) {
    console.error('Failed to list products:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Produkte', 500)
  }
}

// POST /api/v1/products - Create product/service
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const body = await request.json()
    const validation = validateAndParse(createProductSchema, body)

    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const product = await ProductService.create(
      auth.tenantId,
      validation.data,
      auth.userId || undefined
    )
    return apiSuccess(product, undefined, 201)
  } catch (error) {
    console.error('Failed to create product:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des Produkts', 500)
  }
}

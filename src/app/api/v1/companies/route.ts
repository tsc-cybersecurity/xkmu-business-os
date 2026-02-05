import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createCompanySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CompanyService } from '@/lib/services/company.service'
import { WebhookService } from '@/lib/services/webhook.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  // Try session first
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }

  // Try API key
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return {
        tenantId: payload.tenantId,
        userId: null,
        role: 'api' as const,
      }
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { searchParams } = new URL(request.url)
  const pagination = parsePaginationParams(searchParams)
  const status = searchParams.get('status') || undefined
  const search = searchParams.get('search') || undefined
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

  const result = await CompanyService.list(auth.tenantId, {
    ...pagination,
    status,
    search,
    tags,
  })

  return apiSuccess(result.items, result.meta)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  try {
    const body = await request.json()

    const validation = validateAndParse(createCompanySchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    // Dublettenprüfung
    const duplicate = await CompanyService.checkDuplicate(
      auth.tenantId,
      validation.data.name,
      validation.data.website
    )
    if (duplicate) {
      return apiError(
        'DUPLICATE_COMPANY',
        `Firma "${duplicate.name}" existiert bereits`,
        409
      )
    }

    const company = await CompanyService.create(
      auth.tenantId,
      validation.data,
      auth.userId || undefined
    )

    // Webhook feuern
    WebhookService.fire(auth.tenantId, 'company.created', {
      companyId: company.id,
      companyName: company.name,
    }).catch(() => {})

    return apiSuccess(company, undefined, 201)
  } catch (error) {
    console.error('Create company error:', error)
    return apiError('CREATE_FAILED', 'Failed to create company', 500)
  }
}

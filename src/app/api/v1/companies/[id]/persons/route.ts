import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiNotFound } from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId }
    }
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params

  // Verify company exists
  const company = await CompanyService.getById(auth.tenantId, id)
  if (!company) {
    return apiNotFound('Company not found')
  }

  const persons = await CompanyService.getPersons(auth.tenantId, id)

  return apiSuccess(persons)
}

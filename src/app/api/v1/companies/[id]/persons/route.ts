import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'read', async (auth) => {
  const { id } = await params

  // Verify company exists
  const company = await CompanyService.getById(auth.tenantId, id)
  if (!company) {
    return apiNotFound('Company not found')
  }

  const persons = await CompanyService.getPersons(auth.tenantId, id)

  return apiSuccess(persons)
  })
}

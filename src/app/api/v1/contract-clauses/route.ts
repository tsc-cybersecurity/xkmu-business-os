import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { ContractClauseService } from '@/lib/services/contract-clause.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const clauses = await ContractClauseService.list(auth.tenantId, category)
    return apiSuccess(clauses)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const body = await request.json()
    if (!body.name || !body.category) {
      return apiError('VALIDATION_ERROR', 'Name und Kategorie sind erforderlich', 400)
    }
    const clause = await ContractClauseService.create(auth.tenantId, body)
    return apiSuccess(clause, undefined, 201)
  })
}

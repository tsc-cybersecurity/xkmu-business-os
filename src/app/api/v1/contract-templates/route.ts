import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { ContractTemplateService } from '@/lib/services/contract-template.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const templates = await ContractTemplateService.list(auth.tenantId, category)
    return apiSuccess(templates)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const body = await request.json()
    if (!body.name || !body.category) {
      return apiError('VALIDATION_ERROR', 'Name und Kategorie sind erforderlich', 400)
    }
    const template = await ContractTemplateService.create(auth.tenantId, body)
    return apiSuccess(template, undefined, 201)
  })
}

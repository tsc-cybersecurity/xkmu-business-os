import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const templates = await DocumentTemplateService.list(TENANT_ID, category)
    return apiSuccess(templates)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const body = await request.json()
      const tpl = await DocumentTemplateService.create(TENANT_ID, body)
      return apiSuccess(tpl, undefined, 201)
    } catch { return apiServerError() }
  })
}

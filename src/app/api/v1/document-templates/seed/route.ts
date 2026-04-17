import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const created = await DocumentTemplateService.seed(TENANT_ID)
      return apiSuccess({ created }, undefined, 201)
    } catch { return apiServerError() }
  })
}

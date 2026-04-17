import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EmailTemplateService } from '@/lib/services/email-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const created = await EmailTemplateService.seed(TENANT_ID)
      return apiSuccess({ created }, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

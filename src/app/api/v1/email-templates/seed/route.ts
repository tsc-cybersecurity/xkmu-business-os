import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EmailTemplateService } from '@/lib/services/email-template.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const created = await EmailTemplateService.seed(auth.tenantId)
      return apiSuccess({ created }, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

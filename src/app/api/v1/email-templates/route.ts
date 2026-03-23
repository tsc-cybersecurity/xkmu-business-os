import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EmailTemplateService } from '@/lib/services/email-template.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const templates = await EmailTemplateService.list(auth.tenantId)
    return apiSuccess(templates)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()
      const template = await EmailTemplateService.create(auth.tenantId, {
        slug: body.slug,
        name: body.name,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        placeholders: body.placeholders,
      })
      return apiSuccess(template, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

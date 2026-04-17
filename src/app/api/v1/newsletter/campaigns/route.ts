import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { NewsletterService } from '@/lib/services/newsletter.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const campaigns = await NewsletterService.listCampaigns(TENANT_ID)
    return apiSuccess(campaigns)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      const campaign = await NewsletterService.createCampaign(TENANT_ID, body)
      return apiSuccess(campaign, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}

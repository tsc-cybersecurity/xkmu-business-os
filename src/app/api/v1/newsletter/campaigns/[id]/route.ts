import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { NewsletterService } from '@/lib/services/newsletter.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { id } = await params
    const campaign = await NewsletterService.getCampaign(TENANT_ID, id)
    if (!campaign) return apiNotFound('Kampagne nicht gefunden')
    return apiSuccess(campaign)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'marketing', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const campaign = await NewsletterService.updateCampaign(TENANT_ID, id, body)
      if (!campaign) return apiNotFound('Kampagne nicht gefunden')
      return apiSuccess(campaign)
    } catch {
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'marketing', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await NewsletterService.deleteCampaign(TENANT_ID, id)
    if (!deleted) return apiNotFound('Kampagne nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

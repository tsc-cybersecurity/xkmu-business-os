import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateMarketingCampaignSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingCampaignService } from '@/lib/services/marketing-campaign.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { id } = await params
    const campaign = await MarketingCampaignService.getById(auth.tenantId, id)
    if (!campaign) return apiNotFound('Kampagne nicht gefunden')
    return apiSuccess(campaign)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateMarketingCampaignSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const campaign = await MarketingCampaignService.update(auth.tenantId, id, validation.data)
      if (!campaign) return apiNotFound('Kampagne nicht gefunden')
      return apiSuccess(campaign)
    } catch (error) {
      logger.error('Error updating marketing campaign', error, { module: 'MarketingCampaignsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await MarketingCampaignService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Kampagne nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}

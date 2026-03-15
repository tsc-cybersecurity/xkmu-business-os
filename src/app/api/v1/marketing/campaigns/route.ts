import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createMarketingCampaignSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingCampaignService } from '@/lib/services/marketing-campaign.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const search = searchParams.get('search') || undefined

    const result = await MarketingCampaignService.list(auth.tenantId, {
      ...pagination,
      status,
      type,
      search,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createMarketingCampaignSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const campaign = await MarketingCampaignService.create(auth.tenantId, validation.data, auth.userId ?? undefined)
      return apiSuccess(campaign, undefined, 201)
    } catch (error) {
      logger.error('Error creating marketing campaign', error, { module: 'MarketingCampaignsAPI' })
      return apiServerError()
    }
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { NewsletterService } from '@/lib/services/newsletter.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

// POST /api/v1/newsletter/campaigns/[id]/send
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'marketing', 'update', async (auth) => {
    try {
      const { id } = await params
      const result = await NewsletterService.sendCampaign(id)
      return apiSuccess(result)
    } catch (error) {
      if (error instanceof Error) {
        return apiError('SEND_FAILED', error.message, 400)
      }
      return apiServerError()
    }
  })
}

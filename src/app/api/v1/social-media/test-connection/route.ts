import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { SocialPublishingService } from '@/lib/services/social-publishing.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

// POST /api/v1/social-media/test-connection - Verbindung zu einer Plattform testen
export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    try {
      const body = await request.json()
      const { platform } = body as { platform: string }

      if (!platform) {
        return apiError('MISSING_PLATFORM', 'Plattform angeben (linkedin, twitter, facebook, instagram)')
      }

      const result = await SocialPublishingService.testConnection(TENANT_ID, platform)
      return apiSuccess(result)
    } catch {
      return apiServerError()
    }
  })
}

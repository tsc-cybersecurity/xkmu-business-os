import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { SocialMediaPostService } from '@/lib/services/social-media-post.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const fromStr = searchParams.get('from')
      const toStr = searchParams.get('to')
      if (!fromStr || !toStr) {
        return apiValidationError([{ field: 'range', message: 'from and to are required' }])
      }
      const from = new Date(fromStr)
      const to = new Date(toStr)
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return apiValidationError([{ field: 'range', message: 'invalid date' }])
      }
      const result = await SocialMediaPostService.listForCalendar({ from, to })
      return apiSuccess(result)
    } catch (error) {
      logger.error('Calendar list failed', error, { module: 'SocialMediaCalendarAPI' })
      return apiServerError()
    }
  })
}

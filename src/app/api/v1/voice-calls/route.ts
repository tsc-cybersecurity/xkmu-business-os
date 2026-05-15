import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceCallService } from '@/lib/services/voice-call.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const result = await VoiceCallService.list({
        agentKey: searchParams.get('agentKey') ?? undefined,
        direction: searchParams.get('direction') ?? undefined,
        phone: searchParams.get('phone') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
        limit: Number(searchParams.get('limit')) || 50,
        offset: Number(searchParams.get('offset')) || 0,
      })
      return apiSuccess(result.rows, { total: result.total })
    } catch (error) {
      logger.error('Voice calls list failed', error, { module: 'VoiceCallsAPI' })
      return apiServerError()
    }
  })
}

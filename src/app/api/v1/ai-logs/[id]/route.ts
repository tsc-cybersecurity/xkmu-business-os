import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// GET /api/v1/ai-logs/[id] - Einzelnes Log mit vollem Prompt/Response
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_logs', 'read', async (auth) => {
    const { id } = await params
    const log = await AiProviderService.getLogById(auth.tenantId, id)

    if (!log) {
      return apiNotFound('Log-Eintrag nicht gefunden')
    }

    return apiSuccess(log)
  })
}

import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { ChatService } from '@/lib/services/chat.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'chat', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    const conversations = await ChatService.listConversations(
      TENANT_ID,
      auth.userId!,
      limit
    )

    return apiSuccess(conversations)
  })
}

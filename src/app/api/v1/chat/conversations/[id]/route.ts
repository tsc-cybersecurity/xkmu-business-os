import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { ChatService } from '@/lib/services/chat.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'chat', 'read', async (auth) => {
    const { id } = await params
    const conversation = await ChatService.getConversation(auth.tenantId, id)
    if (!conversation) return apiNotFound('Conversation nicht gefunden')

    return apiSuccess(conversation)
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'chat', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await ChatService.deleteConversation(auth.tenantId, id)
    if (!deleted) return apiNotFound('Conversation nicht gefunden')

    return apiSuccess({ deleted: true })
  })
}

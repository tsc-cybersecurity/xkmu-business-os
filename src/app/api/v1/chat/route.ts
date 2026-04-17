import { NextRequest } from 'next/server'
import { apiServerError } from '@/lib/utils/api-response'
import { ChatService } from '@/lib/services/chat.service'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'chat', 'read', async (auth) => {
    try {
      const body = await request.json()
      const { message, providerId, conversationId, context } = body

      if (!message || typeof message !== 'string') {
        return new Response(
          JSON.stringify({ error: 'message ist erforderlich' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 1. Get or create conversation
      let convId = conversationId
      if (!convId) {
        const conv = await ChatService.createConversation(TENANT_ID, auth.userId!, {
          providerId: providerId || null,
          context: context || null,
          title: message.substring(0, 100),
        })
        convId = conv.id
      }

      // 2. Save user message
      await ChatService.addMessage(convId, 'user', message)

      // 3. Build messages array from conversation history
      const conversation = await ChatService.getConversation(TENANT_ID, convId)
      const messages = (conversation?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // 4. Build system prompt with context
      let systemPrompt =
        'Du bist ein hilfreicher KI-Assistent fuer ein Business Operating System. Antworte auf Deutsch, professionell und praegnant.'
      if (context) {
        systemPrompt += `\n\nDer Benutzer arbeitet gerade mit folgenden Daten:\n${JSON.stringify(context.data, null, 2)}`
      }

      // 5. Get provider config
      let providerConfig = null
      if (providerId) {
        const providers = await AiProviderService.list(TENANT_ID)
        providerConfig = providers.find((p) => p.id === providerId) || null
      }

      // 6. Get AI response
      const response = await AIService.completeWithContext(
        messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        { tenantId: TENANT_ID, userId: auth.userId, feature: 'chat' },
        {
          systemPrompt,
          maxTokens: 4000,
          temperature: 0.7,
          model: providerConfig?.model || undefined,
        }
      )

      // 7. Save assistant message
      await ChatService.addMessage(convId, 'assistant', response.text)

      // 8. Return as stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`
            )
          )

          // Stream the response text in chunks
          const text = response.text
          const chunkSize = 10
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`
              )
            )
            await new Promise((r) => setTimeout(r, 20))
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          )
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch (error) {
      logger.error('Error in chat endpoint', error, { module: 'ChatAPI' })
      return apiServerError()
    }
  })
}

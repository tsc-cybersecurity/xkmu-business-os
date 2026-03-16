import { db } from '@/lib/db'
import { chatConversations, chatMessages } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface CreateConversationData {
  providerId?: string | null
  model?: string | null
  context?: Record<string, unknown> | null
  title?: string
}

export const ChatService = {
  async createConversation(tenantId: string, userId: string, data?: CreateConversationData) {
    const [conversation] = await db
      .insert(chatConversations)
      .values({
        tenantId,
        userId,
        title: data?.title || 'Neuer Chat',
        providerId: data?.providerId || null,
        model: data?.model || null,
        context: data?.context || null,
      })
      .returning()

    return conversation
  },

  async getConversation(tenantId: string, conversationId: string) {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.tenantId, tenantId),
          eq(chatConversations.id, conversationId)
        )
      )
      .limit(1)

    if (!conversation) return null

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt)

    return { ...conversation, messages }
  },

  async listConversations(tenantId: string, userId: string, limit = 50) {
    return db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.tenantId, tenantId),
          eq(chatConversations.userId, userId)
        )
      )
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
  },

  async addMessage(conversationId: string, role: string, content: string) {
    const [message] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        role,
        content,
      })
      .returning()

    // Update conversation updatedAt
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId))

    return message
  },

  async deleteConversation(tenantId: string, conversationId: string) {
    const [deleted] = await db
      .delete(chatConversations)
      .where(
        and(
          eq(chatConversations.tenantId, tenantId),
          eq(chatConversations.id, conversationId)
        )
      )
      .returning({ id: chatConversations.id })

    return !!deleted
  },

  async updateTitle(tenantId: string, conversationId: string, title: string) {
    const [updated] = await db
      .update(chatConversations)
      .set({ title, updatedAt: new Date() })
      .where(
        and(
          eq(chatConversations.tenantId, tenantId),
          eq(chatConversations.id, conversationId)
        )
      )
      .returning()

    return updated || null
  },
}

import { db } from '@/lib/db'
import { portalMessages, companies } from '@/lib/db/schema'
import type { PortalMessage } from '@/lib/db/schema'
import { eq, and, gt, desc, asc, sql, ne, isNull, count } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export interface CreateMessageInput {
  companyId: string
  senderId: string | null
  senderRole: string
  bodyText: string
}

export interface CompanyChatSummary {
  companyId: string
  companyName: string | null
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  unreadCount: number
}

export const PortalChatService = {
  async createMessage(input: CreateMessageInput): Promise<PortalMessage> {
    const [created] = await db.insert(portalMessages).values({
      companyId: input.companyId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      bodyText: input.bodyText,
    }).returning()

    import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
      WorkflowEngine.fire('portal.message_sent', {
        messageId: created.id,
        companyId: created.companyId,
        senderId: created.senderId,
        senderRole: created.senderRole,
        bodyPreview: (created.bodyText ?? '').slice(0, 120),
      })
    ).catch(err => logger.error('Workflow fire (portal.message_sent) failed', err, { module: 'PortalChatService' }))

    return created
  },

  /**
   * List messages for a company, ordered by createdAt ASC (for chat display).
   * If `since` is provided, only messages with createdAt > since are returned.
   */
  async listForCompany(
    companyId: string,
    since?: Date,
    limit = 100,
  ): Promise<PortalMessage[]> {
    const conditions = [eq(portalMessages.companyId, companyId)]
    if (since) conditions.push(gt(portalMessages.createdAt, since))

    return db
      .select()
      .from(portalMessages)
      .where(and(...conditions))
      .orderBy(asc(portalMessages.createdAt))
      .limit(limit)
  },

  /**
   * Mark all unread admin-to-portal messages for a company as read by portal.
   * Returns number of rows updated.
   */
  async markReadByPortal(companyId: string): Promise<number> {
    const now = new Date()
    const result = await db
      .update(portalMessages)
      .set({ readByPortalAt: now })
      .where(and(
        eq(portalMessages.companyId, companyId),
        ne(portalMessages.senderRole, 'portal_user'),
        isNull(portalMessages.readByPortalAt),
      ))
      .returning({ id: portalMessages.id })
    return result.length
  },

  /**
   * Mark all unread portal-to-admin messages for a company as read by admin.
   */
  async markReadByAdmin(companyId: string): Promise<number> {
    const now = new Date()
    const result = await db
      .update(portalMessages)
      .set({ readByAdminAt: now })
      .where(and(
        eq(portalMessages.companyId, companyId),
        eq(portalMessages.senderRole, 'portal_user'),
        isNull(portalMessages.readByAdminAt),
      ))
      .returning({ id: portalMessages.id })
    return result.length
  },

  /**
   * Count unread admin-to-portal messages for a portal user's company.
   */
  async unreadCountForPortal(companyId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(portalMessages)
      .where(and(
        eq(portalMessages.companyId, companyId),
        ne(portalMessages.senderRole, 'portal_user'),
        isNull(portalMessages.readByPortalAt),
      ))
    return Number(row?.c ?? 0)
  },

  /**
   * Count unread portal-to-admin messages.
   * If companyId given: only that company. Otherwise global (all companies).
   */
  async unreadCountForAdmin(companyId?: string): Promise<number> {
    const conditions = [
      eq(portalMessages.senderRole, 'portal_user'),
      isNull(portalMessages.readByAdminAt),
    ]
    if (companyId) conditions.push(eq(portalMessages.companyId, companyId))

    const [row] = await db
      .select({ c: count() })
      .from(portalMessages)
      .where(and(...conditions))
    return Number(row?.c ?? 0)
  },

  /**
   * List companies that have at least one message, with metadata for admin-chat overview.
   * If `hasUnreadOnly`, only companies with at least one unread portal-message are returned.
   * Sorted by lastMessageAt DESC.
   */
  async listCompaniesWithChat(hasUnreadOnly = false): Promise<CompanyChatSummary[]> {
    // Get per-company stats using subquery expressions.
    const rows = await db
      .select({
        companyId: portalMessages.companyId,
        companyName: companies.name,
        lastMessageAt: sql<Date>`MAX(${portalMessages.createdAt})`,
        unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${portalMessages.senderRole} = 'portal_user' AND ${portalMessages.readByAdminAt} IS NULL)`,
      })
      .from(portalMessages)
      .leftJoin(companies, eq(portalMessages.companyId, companies.id))
      .groupBy(portalMessages.companyId, companies.name)
      .orderBy(sql`MAX(${portalMessages.createdAt}) DESC`)

    // Fetch last-message-preview in a follow-up query (simpler than window-functions).
    const results: CompanyChatSummary[] = []
    for (const r of rows) {
      const [last] = await db
        .select({ bodyText: portalMessages.bodyText })
        .from(portalMessages)
        .where(eq(portalMessages.companyId, r.companyId))
        .orderBy(desc(portalMessages.createdAt))
        .limit(1)

      const unreadCount = Number(r.unreadCount ?? 0)
      if (hasUnreadOnly && unreadCount === 0) continue

      results.push({
        companyId: r.companyId,
        companyName: r.companyName,
        lastMessageAt: r.lastMessageAt ?? null,
        lastMessagePreview: last?.bodyText ? last.bodyText.slice(0, 100) : null,
        unreadCount,
      })
    }
    return results
  },
}

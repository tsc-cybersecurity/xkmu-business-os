import { db } from '@/lib/db'
import { webhooks } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import type { Webhook, NewWebhook } from '@/lib/db/schema'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'

export interface WebhookFilters {
  isActive?: boolean
  page?: number
  limit?: number
}

export interface CreateWebhookInput {
  name: string
  url: string
  events: string[]
  secret?: string
  isActive?: boolean
}

export type UpdateWebhookInput = Partial<CreateWebhookInput>

export const WebhookService = {
  async create(tenantId: string, data: CreateWebhookInput): Promise<Webhook> {
    const [webhook] = await db
      .insert(webhooks)
      .values({
        tenantId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret || undefined,
        isActive: data.isActive ?? true,
      })
      .returning()
    return webhook
  },

  async getById(tenantId: string, webhookId: string): Promise<Webhook | null> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.id, webhookId)))
      .limit(1)
    return webhook ?? null
  },

  async update(tenantId: string, webhookId: string, data: UpdateWebhookInput): Promise<Webhook | null> {
    const updateData: Partial<NewWebhook> = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.url !== undefined) updateData.url = data.url
    if (data.events !== undefined) updateData.events = data.events
    if (data.secret !== undefined) updateData.secret = data.secret
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const [webhook] = await db
      .update(webhooks)
      .set(updateData)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.id, webhookId)))
      .returning()
    return webhook ?? null
  },

  async delete(tenantId: string, webhookId: string): Promise<boolean> {
    const result = await db
      .delete(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.id, webhookId)))
      .returning({ id: webhooks.id })
    return result.length > 0
  },

  async list(tenantId: string, filters: WebhookFilters = {}) {
    const { page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(webhooks.tenantId, tenantId)]
    if (filters.isActive !== undefined) {
      conditions.push(eq(webhooks.isActive, filters.isActive))
    }

    const whereClause = and(...conditions)

    const [items, [{ total }]] = await Promise.all([
      db.select().from(webhooks).where(whereClause).orderBy(desc(webhooks.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(webhooks).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getByEvent(tenantId: string, event: string): Promise<Webhook[]> {
    // Get all active webhooks for this tenant, then filter by event
    const allActive = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true)))

    return allActive.filter((wh) => wh.events.includes(event))
  },

  /**
   * Fires webhooks for a specific event.
   * Runs asynchronously – does not block the caller.
   */
  async fire(tenantId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const matchingWebhooks = await this.getByEvent(tenantId, event)
    if (matchingWebhooks.length === 0) return

    // Fire all webhooks in parallel, don't await
    for (const wh of matchingWebhooks) {
      this.sendWebhook(wh, event, payload).catch((error) => {
        logger.error(`Fehler beim Senden an ${wh.url}`, error, { module: 'WebhookService' })
      })
    }
  },

  async sendWebhook(
    webhook: Webhook,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
    }

    // HMAC signature if secret is set
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${signature}`
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      // Update last triggered info
      await db
        .update(webhooks)
        .set({
          lastTriggeredAt: new Date(),
          lastStatus: response.status,
          failCount: response.ok ? 0 : (webhook.failCount || 0) + 1,
        })
        .where(eq(webhooks.id, webhook.id))

    } catch (error) {
      // Update fail count
      await db
        .update(webhooks)
        .set({
          lastTriggeredAt: new Date(),
          lastStatus: 0,
          failCount: (webhook.failCount || 0) + 1,
        })
        .where(eq(webhooks.id, webhook.id))
      throw error
    }
  },
}

// ============================================
// Newsletter Service
// Subscribers, Campaigns, Sending
// ============================================

import { db } from '@/lib/db'
import { newsletterSubscribers, newsletterCampaigns } from '@/lib/db/schema'
import type { NewsletterSubscriber, NewsletterCampaign } from '@/lib/db/schema'
import { eq, and, count, desc, ilike, inArray } from 'drizzle-orm'
import { EmailService } from '@/lib/services/email.service'
import { logger } from '@/lib/utils/logger'

export const NewsletterService = {
  // --- Subscribers ---
  async listSubscribers(tenantId: string, filters: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    const { status, search, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit
    const conditions = [eq(newsletterSubscribers.tenantId, tenantId)]
    if (status) conditions.push(eq(newsletterSubscribers.status, status))
    if (search) conditions.push(ilike(newsletterSubscribers.email, `%${search}%`))

    const [items, [{ total }]] = await Promise.all([
      db.select().from(newsletterSubscribers).where(and(...conditions)).orderBy(desc(newsletterSubscribers.subscribedAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(newsletterSubscribers).where(and(...conditions)),
    ])
    return { items, meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } }
  },

  async createSubscriber(tenantId: string, data: { email: string; name?: string; tags?: string[] }): Promise<NewsletterSubscriber> {
    const [sub] = await db.insert(newsletterSubscribers).values({
      tenantId, email: data.email, name: data.name || null, tags: data.tags || [],
    }).returning()
    return sub
  },

  async deleteSubscriber(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(newsletterSubscribers).where(and(eq(newsletterSubscribers.tenantId, tenantId), eq(newsletterSubscribers.id, id))).returning({ id: newsletterSubscribers.id })
    return result.length > 0
  },

  async importSubscribers(tenantId: string, entries: Array<{ email: string; name?: string; tags?: string[] }>): Promise<number> {
    let created = 0
    for (const entry of entries) {
      const [existing] = await db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers)
        .where(and(eq(newsletterSubscribers.tenantId, tenantId), eq(newsletterSubscribers.email, entry.email))).limit(1)
      if (existing) continue
      await this.createSubscriber(tenantId, entry)
      created++
    }
    return created
  },

  // --- Campaigns ---
  async listCampaigns(tenantId: string) {
    return db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.tenantId, tenantId)).orderBy(desc(newsletterCampaigns.createdAt))
  },

  async getCampaign(tenantId: string, id: string): Promise<NewsletterCampaign | null> {
    const [campaign] = await db.select().from(newsletterCampaigns).where(and(eq(newsletterCampaigns.tenantId, tenantId), eq(newsletterCampaigns.id, id))).limit(1)
    return campaign ?? null
  },

  async createCampaign(tenantId: string, data: { name: string; subject?: string; bodyHtml?: string; segmentTags?: string[] }): Promise<NewsletterCampaign> {
    const [campaign] = await db.insert(newsletterCampaigns).values({
      tenantId, name: data.name, subject: data.subject || '', bodyHtml: data.bodyHtml || '', segmentTags: data.segmentTags || [],
    }).returning()
    return campaign
  },

  async updateCampaign(tenantId: string, id: string, data: Partial<{ name: string; subject: string; bodyHtml: string; segmentTags: string[] }>): Promise<NewsletterCampaign | null> {
    const [campaign] = await db.update(newsletterCampaigns).set({ ...data, updatedAt: new Date() })
      .where(and(eq(newsletterCampaigns.tenantId, tenantId), eq(newsletterCampaigns.id, id))).returning()
    return campaign ?? null
  },

  async deleteCampaign(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(newsletterCampaigns).where(and(eq(newsletterCampaigns.tenantId, tenantId), eq(newsletterCampaigns.id, id))).returning({ id: newsletterCampaigns.id })
    return result.length > 0
  },

  // --- Send Campaign ---
  async sendCampaign(tenantId: string, campaignId: string): Promise<{ sent: number; failed: number }> {
    const campaign = await this.getCampaign(tenantId, campaignId)
    if (!campaign) throw new Error('Kampagne nicht gefunden')
    if (!campaign.subject || !campaign.bodyHtml) throw new Error('Betreff oder Inhalt fehlt')

    // Get active subscribers (optionally filtered by segment tags)
    const conditions = [eq(newsletterSubscribers.tenantId, tenantId), eq(newsletterSubscribers.status, 'active')]
    const subscribers = await db.select().from(newsletterSubscribers).where(and(...conditions))

    // Filter by segment tags if set
    const filtered = campaign.segmentTags && campaign.segmentTags.length > 0
      ? subscribers.filter(s => (s.tags || []).some(t => campaign.segmentTags!.includes(t)))
      : subscribers

    // Update status to sending
    await db.update(newsletterCampaigns).set({ status: 'sending', updatedAt: new Date() }).where(eq(newsletterCampaigns.id, campaignId))

    let sent = 0
    let failed = 0

    for (const subscriber of filtered) {
      try {
        const html = campaign.bodyHtml!.replace(/\{\{name\}\}/g, subscriber.name || subscriber.email)
        const subject = campaign.subject!.replace(/\{\{name\}\}/g, subscriber.name || subscriber.email)

        const result = await EmailService.send(tenantId, {
          to: subscriber.email,
          subject,
          body: html.replace(/<[^>]+>/g, ' ').trim(),
          html,
        })

        if (result.success) sent++
        else failed++
      } catch {
        failed++
      }
    }

    // Update campaign
    await db.update(newsletterCampaigns).set({
      status: 'sent',
      sentAt: new Date(),
      stats: { sent, failed, total: filtered.length },
      updatedAt: new Date(),
    }).where(eq(newsletterCampaigns.id, campaignId))

    logger.info(`Newsletter campaign ${campaignId} sent: ${sent}/${filtered.length}`, { module: 'NewsletterService' })
    return { sent, failed }
  },
}

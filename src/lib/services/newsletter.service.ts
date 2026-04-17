// ============================================
// Newsletter Service
// Subscribers, Campaigns, Sending
// ============================================

import { db } from '@/lib/db'
import { newsletterSubscribers, newsletterCampaigns } from '@/lib/db/schema'
import type { NewsletterSubscriber, NewsletterCampaign } from '@/lib/db/schema'
import { eq, and, count, desc, ilike } from 'drizzle-orm'
import { EmailService } from '@/lib/services/email.service'
import { logger } from '@/lib/utils/logger'

export const NewsletterService = {
  // --- Subscribers ---
  async listSubscribers(filters: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    const { status, search, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit
    const conditions = []
    if (status) conditions.push(eq(newsletterSubscribers.status, status))
    if (search) conditions.push(ilike(newsletterSubscribers.email, `%${search}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select().from(newsletterSubscribers).where(whereClause).orderBy(desc(newsletterSubscribers.subscribedAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(newsletterSubscribers).where(whereClause),
    ])
    return { items, meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } }
  },

  async createSubscriber(data: { email: string; name?: string; tags?: string[] }): Promise<NewsletterSubscriber> {
    const [sub] = await db.insert(newsletterSubscribers).values({
      email: data.email, name: data.name || null, tags: data.tags || [],
    }).returning()
    return sub
  },

  async deleteSubscriber(id: string): Promise<boolean> {
    const result = await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id)).returning({ id: newsletterSubscribers.id })
    return result.length > 0
  },

  async importSubscribers(entries: Array<{ email: string; name?: string; tags?: string[] }>): Promise<number> {
    let created = 0
    for (const entry of entries) {
      const [existing] = await db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, entry.email)).limit(1)
      if (existing) continue
      await this.createSubscriber(entry)
      created++
    }
    return created
  },

  // --- Campaigns ---
  async listCampaigns() {
    return db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt))
  },

  async getCampaign(id: string): Promise<NewsletterCampaign | null> {
    const [campaign] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1)
    return campaign ?? null
  },

  async createCampaign(data: { name: string; subject?: string; bodyHtml?: string; segmentTags?: string[] }): Promise<NewsletterCampaign> {
    const [campaign] = await db.insert(newsletterCampaigns).values({
      name: data.name, subject: data.subject || '', bodyHtml: data.bodyHtml || '', segmentTags: data.segmentTags || [],
    }).returning()
    return campaign
  },

  async updateCampaign(id: string, data: Partial<{ name: string; subject: string; bodyHtml: string; segmentTags: string[] }>): Promise<NewsletterCampaign | null> {
    const [campaign] = await db.update(newsletterCampaigns).set({ ...data, updatedAt: new Date() })
      .where(eq(newsletterCampaigns.id, id)).returning()
    return campaign ?? null
  },

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).returning({ id: newsletterCampaigns.id })
    return result.length > 0
  },

  // --- Send Campaign ---
  async sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) throw new Error('Kampagne nicht gefunden')
    if (!campaign.subject || !campaign.bodyHtml) throw new Error('Betreff oder Inhalt fehlt')

    // Get active subscribers (optionally filtered by segment tags)
    const conditions = [eq(newsletterSubscribers.status, 'active')]
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

        const result = await EmailService.send({
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

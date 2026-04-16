// ============================================
// Feedback Service
// ============================================

import { db } from '@/lib/db'
import { feedbackForms, feedbackResponses } from '@/lib/db/schema'
import type { FeedbackForm, FeedbackResponse } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'
import { randomBytes } from 'crypto'

export const FeedbackService = {
  async list(_tenantId: string): Promise<(FeedbackForm & { responseCount: number })[]> {
    const forms = await db.select().from(feedbackForms)
      .orderBy(desc(feedbackForms.createdAt))

    const counts = await db.select({ formId: feedbackResponses.formId, count: count() })
      .from(feedbackResponses)
      .innerJoin(feedbackForms, eq(feedbackResponses.formId, feedbackForms.id))
      .groupBy(feedbackResponses.formId)

    const countMap = new Map(counts.map(c => [c.formId, Number(c.count)]))
    return forms.map(f => ({ ...f, responseCount: countMap.get(f.id) || 0 }))
  },

  async getById(_tenantId: string, id: string): Promise<FeedbackForm | null> {
    const [form] = await db.select().from(feedbackForms)
      .where(eq(feedbackForms.id, id)).limit(1)
    return form ?? null
  },

  async getByToken(token: string): Promise<FeedbackForm | null> {
    const [form] = await db.select().from(feedbackForms)
      .where(eq(feedbackForms.token, token)).limit(1)
    return form ?? null
  },

  async create(_tenantId: string, data: {
    name: string; questions?: unknown; companyId?: string
  }): Promise<FeedbackForm> {
    const token = randomBytes(16).toString('hex')
    const [form] = await db.insert(feedbackForms).values({
      tenantId: TENANT_ID, name: data.name, questions: data.questions || [],
      companyId: data.companyId || null, token,
    }).returning()
    return form
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(feedbackForms)
      .where(eq(feedbackForms.id, id))
      .returning({ id: feedbackForms.id })
    return result.length > 0
  },

  async submitResponse(token: string, data: { answers: unknown; npsScore?: number }): Promise<FeedbackResponse> {
    const form = await this.getByToken(token)
    if (!form) throw new Error('Formular nicht gefunden')
    const [response] = await db.insert(feedbackResponses).values({
      formId: form.id, answers: data.answers || [], npsScore: data.npsScore ?? null,
    }).returning()
    return response
  },

  async getResponses(formId: string): Promise<FeedbackResponse[]> {
    return db.select().from(feedbackResponses).where(eq(feedbackResponses.formId, formId)).orderBy(desc(feedbackResponses.submittedAt))
  },

  async getStats(formId: string) {
    const responses = await this.getResponses(formId)
    const npsScores = responses.filter(r => r.npsScore !== null).map(r => r.npsScore!)
    const promoters = npsScores.filter(s => s >= 9).length
    const detractors = npsScores.filter(s => s <= 6).length
    const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : null

    return { totalResponses: responses.length, nps, averageNps: npsScores.length > 0 ? Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length * 10) / 10 : null }
  },
}

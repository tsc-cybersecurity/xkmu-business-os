import { db } from '@/lib/db'
import { businessProfiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { BusinessProfile } from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface BusinessAnalysisResult {
  companyName?: string
  industry?: string
  businessModel?: string
  swotAnalysis?: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  marketAnalysis?: string
  financialSummary?: string
  keyMetrics?: Record<string, unknown>
  recommendations?: string
  rawAnalysis?: string
}

export const BusinessProfileService = {
  async getByTenant(_tenantId: string): Promise<BusinessProfile | null> {
    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where()
      .limit(1)
    return profile ?? null
  },

  async upsert(_tenantId: string, data: BusinessAnalysisResult, documentIds: string[]): Promise<BusinessProfile> {
    const existing = await this.getByTenant(_tenantId)

    if (existing) {
      const [updated] = await db
        .update(businessProfiles)
        .set({
          companyName: data.companyName || existing.companyName,
          industry: data.industry || existing.industry,
          businessModel: data.businessModel || existing.businessModel,
          swotAnalysis: data.swotAnalysis || existing.swotAnalysis,
          marketAnalysis: data.marketAnalysis || existing.marketAnalysis,
          financialSummary: data.financialSummary || existing.financialSummary,
          keyMetrics: data.keyMetrics || existing.keyMetrics,
          recommendations: data.recommendations || existing.recommendations,
          rawAnalysis: data.rawAnalysis || existing.rawAnalysis,
          analyzedDocumentIds: documentIds,
          lastAnalyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(businessProfiles.id, existing.id))
        .returning()
      return updated
    }

    const [created] = await db
      .insert(businessProfiles)
      .values({
        companyName: data.companyName || null,
        industry: data.industry || null,
        businessModel: data.businessModel || null,
        swotAnalysis: data.swotAnalysis || null,
        marketAnalysis: data.marketAnalysis || null,
        financialSummary: data.financialSummary || null,
        keyMetrics: data.keyMetrics || null,
        recommendations: data.recommendations || null,
        rawAnalysis: data.rawAnalysis || null,
        analyzedDocumentIds: documentIds,
        lastAnalyzedAt: new Date(),
      })
      .returning()
    return created
  },
}

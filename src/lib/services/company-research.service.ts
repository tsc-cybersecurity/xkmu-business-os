import { db } from '@/lib/db'
import { companyResearches } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { CompanyResearch } from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface CreateCompanyResearchInput {
  companyId: string
  researchData: Record<string, unknown>
  scrapedPages: Array<{ url: string; title: string; content: string; scrapedAt: string }>
  proposedChanges: Record<string, unknown>
}

export const CompanyResearchService = {
  async create(
    _tenantId: string,
    companyId: string,
    data: CreateCompanyResearchInput
  ): Promise<CompanyResearch> {
    const [research] = await db
      .insert(companyResearches)
      .values({
        companyId,
        status: 'completed',
        researchData: data.researchData,
        scrapedPages: data.scrapedPages,
        proposedChanges: data.proposedChanges,
      })
      .returning()

    return research
  },

  async getById(_tenantId: string, id: string): Promise<CompanyResearch | null> {
    const [research] = await db
      .select()
      .from(companyResearches)
      .where(eq(companyResearches.id, id))
      .limit(1)

    return research ?? null
  },

  async listByCompany(_tenantId: string, companyId: string): Promise<CompanyResearch[]> {
    return db
      .select()
      .from(companyResearches)
      .where(eq(companyResearches.companyId, companyId))
      .orderBy(desc(companyResearches.createdAt))
  },

  async updateStatus(
    _tenantId: string,
    id: string,
    status: 'applied' | 'rejected',
    appliedAt?: Date
  ): Promise<CompanyResearch | null> {
    const [updated] = await db
      .update(companyResearches)
      .set({
        status,
        ...(appliedAt ? { appliedAt } : {}),
      })
      .where(eq(companyResearches.id, id))
      .returning()

    return updated ?? null
  },
}

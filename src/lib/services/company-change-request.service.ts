import { db } from '@/lib/db'
import { companyChangeRequests } from '@/lib/db/schema'
import type { CompanyChangeRequest } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CompanyService } from '@/lib/services/company.service'
import type { UpdateCompanyInput } from '@/lib/services/company.service'

export interface CreateChangeRequestInput {
  companyId: string
  requestedBy: string
  proposedChanges: Record<string, unknown>
}

export const CompanyChangeRequestService = {
  async create(input: CreateChangeRequestInput): Promise<CompanyChangeRequest> {
    // Duplicate check: one pending per company
    const [existing] = await db
      .select({ id: companyChangeRequests.id })
      .from(companyChangeRequests)
      .where(and(
        eq(companyChangeRequests.companyId, input.companyId),
        eq(companyChangeRequests.status, 'pending'),
      ))
      .limit(1)

    if (existing) {
      throw new Error('PENDING_REQUEST_EXISTS')
    }

    const [created] = await db
      .insert(companyChangeRequests)
      .values({
        companyId: input.companyId,
        requestedBy: input.requestedBy,
        proposedChanges: input.proposedChanges,
      })
      .returning()

    return created
  },

  async list(filter: {
    companyId?: string
    status?: string
    requestedBy?: string
    limit?: number
    offset?: number
  } = {}): Promise<CompanyChangeRequest[]> {
    const conditions = []
    if (filter.companyId) conditions.push(eq(companyChangeRequests.companyId, filter.companyId))
    if (filter.status) conditions.push(eq(companyChangeRequests.status, filter.status))
    if (filter.requestedBy) conditions.push(eq(companyChangeRequests.requestedBy, filter.requestedBy))

    return db
      .select()
      .from(companyChangeRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(companyChangeRequests.requestedAt))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0)
  },

  async getById(id: string): Promise<CompanyChangeRequest | null> {
    const [row] = await db
      .select()
      .from(companyChangeRequests)
      .where(eq(companyChangeRequests.id, id))
      .limit(1)

    return row ?? null
  },

  async cancel(id: string, requestedBy: string): Promise<boolean> {
    const result = await db
      .delete(companyChangeRequests)
      .where(and(
        eq(companyChangeRequests.id, id),
        eq(companyChangeRequests.requestedBy, requestedBy),
        eq(companyChangeRequests.status, 'pending'),
      ))
      .returning({ id: companyChangeRequests.id })

    return result.length > 0
  },

  async approve(id: string, reviewedBy: string): Promise<CompanyChangeRequest> {
    const request = await this.getById(id)
    if (!request) throw new Error('NOT_FOUND')
    if (request.status !== 'pending') throw new Error('NOT_PENDING')

    await CompanyService.update(
      request.companyId,
      request.proposedChanges as UpdateCompanyInput,
    )

    const now = new Date()
    const [updated] = await db
      .update(companyChangeRequests)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(companyChangeRequests.id, id))
      .returning()

    return updated
  },

  async reject(id: string, reviewedBy: string, reviewComment: string): Promise<CompanyChangeRequest> {
    const request = await this.getById(id)
    if (!request) throw new Error('NOT_FOUND')
    if (request.status !== 'pending') throw new Error('NOT_PENDING')

    const now = new Date()
    const [updated] = await db
      .update(companyChangeRequests)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: now,
        reviewComment,
        updatedAt: now,
      })
      .where(eq(companyChangeRequests.id, id))
      .returning()

    return updated
  },
}

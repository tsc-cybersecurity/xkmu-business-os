import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { leads, documents, feedbackResponses, feedbackForms } from '@/lib/db/schema'
import { eq, and, gte, lte, count, sum, sql } from 'drizzle-orm'

// GET /api/v1/kpi?from=2026-01-01&to=2026-03-31
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)
      const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

      // New leads in period
      const [{ newLeads }] = await db.select({ newLeads: count() }).from(leads)
        .where(and(gte(leads.createdAt, from), lte(leads.createdAt, to)))

      // Won leads
      const [{ wonLeads }] = await db.select({ wonLeads: count() }).from(leads)
        .where(and(eq(leads.status, 'won'), gte(leads.updatedAt, from), lte(leads.updatedAt, to)))

      // Revenue (paid invoices)
      const [{ revenue }] = await db.select({ revenue: sum(documents.total) }).from(documents)
        .where(and(eq(documents.type, 'invoice'), eq(documents.paymentStatus, 'paid'), gte(documents.paidAt, from), lte(documents.paidAt, to)))

      // Open invoices
      const [{ openInvoices }] = await db.select({ openInvoices: count() }).from(documents)
        .where(and(eq(documents.type, 'invoice'), eq(documents.paymentStatus, 'unpaid')))

      // Overdue invoices
      const [{ overdueInvoices }] = await db.select({ overdueInvoices: count() }).from(documents)
        .where(and(eq(documents.type, 'invoice'), eq(documents.paymentStatus, 'overdue')))

      // Conversion rate
      const [{ totalLeads }] = await db.select({ totalLeads: count() }).from(leads)
        .where(and(gte(leads.createdAt, from), lte(leads.createdAt, to)))

      const conversionRate = Number(totalLeads) > 0 ? Math.round((Number(wonLeads) / Number(totalLeads)) * 100) : 0

      return apiSuccess({
        period: { from: from.toISOString(), to: to.toISOString() },
        newLeads: Number(newLeads),
        wonLeads: Number(wonLeads),
        conversionRate,
        revenue: Number(revenue || 0),
        openInvoices: Number(openInvoices),
        overdueInvoices: Number(overdueInvoices),
      })
    } catch {
      return apiServerError()
    }
  })
}

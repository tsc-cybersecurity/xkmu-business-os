import { db } from '@/lib/db'
import { companies, persons, leads, auditLog } from '@/lib/db/schema'
import { eq, desc, sql, and, gte } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return apiUnauthorized('Nicht autorisiert')
    }

    const tenantId = session.user.tenantId

    // Get counts
    const [companiesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(eq(companies.tenantId, tenantId))

    const [personsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(persons)
      .where(eq(persons.tenantId, tenantId))

    const [leadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          sql`${leads.status} NOT IN ('won', 'lost')`
        )
      )

    // Get activity count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [activityCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.tenantId, tenantId),
          gte(auditLog.createdAt, sevenDaysAgo)
        )
      )

    // Get recent companies
    const recentCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        status: companies.status,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .where(eq(companies.tenantId, tenantId))
      .orderBy(desc(companies.createdAt))
      .limit(5)

    // Get recent persons
    const recentPersons = await db
      .select({
        id: persons.id,
        firstName: persons.firstName,
        lastName: persons.lastName,
        email: persons.email,
        createdAt: persons.createdAt,
      })
      .from(persons)
      .where(eq(persons.tenantId, tenantId))
      .orderBy(desc(persons.createdAt))
      .limit(5)

    // Get open leads
    const openLeads = await db
      .select({
        id: leads.id,
        source: leads.source,
        status: leads.status,
        score: leads.score,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          sql`${leads.status} NOT IN ('won', 'lost')`
        )
      )
      .orderBy(desc(leads.createdAt))
      .limit(5)

    // Get company status distribution
    const companyStatuses = await db
      .select({
        status: companies.status,
        count: sql<number>`count(*)`,
      })
      .from(companies)
      .where(eq(companies.tenantId, tenantId))
      .groupBy(companies.status)

    // Konversionsrate: Won / Total Leads
    const [totalLeadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.tenantId, tenantId))

    const [wonLeadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.status, 'won')))

    const totalLeads = Number(totalLeadsCount?.count || 0)
    const wonLeads = Number(wonLeadsCount?.count || 0)
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

    // 30-Tage-Trends: Leads pro Tag
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const leadTrends = await db
      .select({
        date: sql<string>`date(${leads.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          gte(leads.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`date(${leads.createdAt})`)
      .orderBy(sql`date(${leads.createdAt})`)

    const companyTrends = await db
      .select({
        date: sql<string>`date(${companies.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(companies)
      .where(
        and(
          eq(companies.tenantId, tenantId),
          gte(companies.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`date(${companies.createdAt})`)
      .orderBy(sql`date(${companies.createdAt})`)

    return apiSuccess({
      stats: {
        companies: Number(companiesCount?.count || 0),
        persons: Number(personsCount?.count || 0),
        leads: Number(leadsCount?.count || 0),
        activityLast7Days: Number(activityCount?.count || 0),
      },
      conversionRate,
      trends: {
        leads: leadTrends.map((t) => ({ date: t.date, count: Number(t.count) })),
        companies: companyTrends.map((t) => ({ date: t.date, count: Number(t.count) })),
      },
      recentCompanies,
      recentPersons,
      openLeads,
      companyStatuses,
    })
  } catch (error) {
    logger.error('Dashboard error', error, { module: 'DashboardAPI' })
    return apiServerError('Interner Serverfehler')
  }
}

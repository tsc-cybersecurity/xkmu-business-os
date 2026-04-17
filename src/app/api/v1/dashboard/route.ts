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

    // Get counts
    const [companiesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where()

    const [personsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(persons)
      .where()

    const [leadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(sql`${leads.status} NOT IN ('won', 'lost')`
        )
      )

    // Get activity count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [activityCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(
        and(gte(auditLog.createdAt, sevenDaysAgo)
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
      .where()
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
      .where()
      .orderBy(desc(persons.createdAt))
      .limit(5)

    // Get open leads with company name
    const openLeadsRaw = await db
      .select({
        id: leads.id,
        source: leads.source,
        status: leads.status,
        score: leads.score,
        createdAt: leads.createdAt,
        contactCompany: leads.contactCompany,
        companyName: companies.name,
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(
        and(sql`${leads.status} NOT IN ('won', 'lost')`
        )
      )
      .orderBy(desc(leads.createdAt))
      .limit(5)

    const openLeads = openLeadsRaw.map((l) => ({
      ...l,
      companyName: l.companyName || l.contactCompany || null,
    }))

    // Get company status distribution
    const companyStatuses = await db
      .select({
        status: companies.status,
        count: sql<number>`count(*)`,
      })
      .from(companies)
      .where()
      .groupBy(companies.status)

    // Konversionsrate: Won / Total Leads
    const [totalLeadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where()

    const [wonLeadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.status, 'won')))

    const totalLeads = Number(totalLeadsCount?.count || 0)
    const wonLeads = Number(wonLeadsCount?.count || 0)
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

    // 60-Tage-Trends: Leads pro Tag
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60)

    const leadTrends = await db
      .select({
        date: sql<string>`to_char(${leads.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(
        and(gte(leads.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`)

    const companyTrends = await db
      .select({
        date: sql<string>`to_char(${companies.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(companies)
      .where(
        and(gte(companies.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`to_char(${companies.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${companies.createdAt}, 'YYYY-MM-DD')`)

    // Alle 60 Tage fuellen (auch 0er)
    const fillDays = (data: Array<{ date: string; count: number }>, days: number) => {
      // DB liefert date() als verschiedene Formate — normalisieren
      const map = new Map<string, number>()
      for (const d of data) {
        // Kann Date-Objekt, ISO-String oder YYYY-MM-DD sein
        const dateStr = typeof d.date === 'object' && d.date !== null
          ? new Date(d.date as unknown as string).toISOString().split('T')[0]
          : String(d.date).split('T')[0]
        map.set(dateStr, Number(d.count))
      }

      const result: Array<{ date: string; count: number }> = []
      const now = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        result.push({ date: key, count: map.get(key) || 0 })
      }
      return result
    }

    // Debug: Raw-Daten loggen
    logger.info('Dashboard lead trends raw', { leadTrends: JSON.stringify(leadTrends), companyTrends: JSON.stringify(companyTrends) })

    return apiSuccess({
      stats: {
        companies: Number(companiesCount?.count || 0),
        persons: Number(personsCount?.count || 0),
        leads: Number(leadsCount?.count || 0),
        activityLast7Days: Number(activityCount?.count || 0),
      },
      conversionRate,
      trends: {
        leads: fillDays(leadTrends.map((t) => ({ date: t.date, count: Number(t.count) })), 60),
        companies: fillDays(companyTrends.map((t) => ({ date: t.date, count: Number(t.count) })), 60),
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

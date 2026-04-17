import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { leads, companies, persons } from '@/lib/db/schema'
import { and, eq, or, ilike, sql } from 'drizzle-orm'

/**
 * GET /api/v1/emails/link-search?q=...
 *
 * Searches leads, companies and persons within the organization for
 * candidates to link an email to. Used by the email inbox link dropdown.
 *
 * Returns: [{ id, label, type: 'lead' | 'company' | 'person' }]
 */
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const q = (searchParams.get('q') || '').trim()

      if (q.length < 2) {
        return apiSuccess([])
      }

      const needle = `%${q}%`
      const PER_TYPE_LIMIT = 5

      // Run the three searches in parallel — no dependencies between them.
      const [leadRows, companyRows, personRows] = await Promise.all([
        db
          .select({
            id: leads.id,
            title: leads.title,
            firstName: leads.contactFirstName,
            lastName: leads.contactLastName,
            contactCompany: leads.contactCompany,
            email: leads.contactEmail,
          })
          .from(leads)
          .where(
            and(or(
                ilike(leads.title, needle),
                ilike(leads.contactFirstName, needle),
                ilike(leads.contactLastName, needle),
                ilike(leads.contactCompany, needle),
                ilike(leads.contactEmail, needle),
                // Allow matching "Vorname Nachname" as a single string
                sql`(${leads.contactFirstName} || ' ' || ${leads.contactLastName}) ILIKE ${needle}`)))
          .limit(PER_TYPE_LIMIT),

        db
          .select({
            id: companies.id,
            name: companies.name,
            email: companies.email,
            city: companies.city,
          })
          .from(companies)
          .where(
            and(or(
                ilike(companies.name, needle),
                ilike(companies.email, needle),
                ilike(companies.city, needle))))
          .limit(PER_TYPE_LIMIT),

        db
          .select({
            id: persons.id,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: persons.email,
            jobTitle: persons.jobTitle,
          })
          .from(persons)
          .where(
            and(or(
                ilike(persons.firstName, needle),
                ilike(persons.lastName, needle),
                ilike(persons.email, needle),
                sql`(${persons.firstName} || ' ' || ${persons.lastName}) ILIKE ${needle}`)))
          .limit(PER_TYPE_LIMIT),
      ])

      // Shape the results into the flat LinkSearchResult[] the UI expects.
      const results: Array<{ id: string; label: string; type: 'lead' | 'company' | 'person' }> = []

      for (const l of leadRows) {
        const name = [l.firstName, l.lastName].filter(Boolean).join(' ').trim()
        const parts = [l.title, name || null, l.contactCompany, l.email].filter(Boolean)
        const label = parts.length > 0 ? parts.join(' — ') : `Lead ${l.id.slice(0, 8)}`
        results.push({ id: l.id, label, type: 'lead' })
      }

      for (const c of companyRows) {
        const parts = [c.name, c.city, c.email].filter(Boolean)
        results.push({ id: c.id, label: parts.join(' — '), type: 'company' })
      }

      for (const p of personRows) {
        const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
        const parts = [name, p.jobTitle, p.email].filter(Boolean)
        results.push({ id: p.id, label: parts.join(' — '), type: 'person' })
      }

      return apiSuccess(results)
    } catch (error) {
      logger.error('Email link search failed', error, { module: 'EmailsLinkSearch' })
      return apiError('INTERNAL_ERROR', 'Suche fehlgeschlagen', 500)
    }
  })
}

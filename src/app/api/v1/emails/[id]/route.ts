import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { emails, leads, companies, persons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/emails/[id] - Get single email with full body + linked entities
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params

    try {
      const [row] = await db
        .select({
          email: emails,
          lead: {
            id: leads.id,
            title: leads.title,
            contactFirstName: leads.contactFirstName,
            contactLastName: leads.contactLastName,
            contactCompany: leads.contactCompany,
            contactEmail: leads.contactEmail,
            status: leads.status,
          },
          company: {
            id: companies.id,
            name: companies.name,
            city: companies.city,
            email: companies.email,
          },
          person: {
            id: persons.id,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: persons.email,
            jobTitle: persons.jobTitle,
          },
        })
        .from(emails)
        .leftJoin(leads, eq(emails.leadId, leads.id))
        .leftJoin(companies, eq(emails.companyId, companies.id))
        .leftJoin(persons, eq(emails.personId, persons.id))
        .where(eq(emails.id, id))

      if (!row) {
        return apiNotFound('Email not found')
      }

      // Flatten: merge email fields + nullable linkedLead/linkedCompany/linkedPerson
      const result = {
        ...row.email,
        linkedLead: row.lead?.id ? row.lead : null,
        linkedCompany: row.company?.id ? row.company : null,
        linkedPerson: row.person?.id ? row.person : null,
      }

      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to get email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to get email', 500)
    }
  })
}

// PUT /api/v1/emails/[id] - Update email (isRead, isStarred, leadId, companyId, personId)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    const { id } = await params

    try {
      const body = await request.json()

      const updates: Record<string, unknown> = {}
      const allowedFields = ['isRead', 'isStarred', 'leadId', 'companyId', 'personId']

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return apiError('VALIDATION_ERROR', 'No valid fields to update', 400)
      }

      const [updated] = await db
        .update(emails)
        .set(updates)
        .where(eq(emails.id, id))
        .returning()

      if (!updated) {
        return apiNotFound('Email not found')
      }

      // Re-fetch with joins so the client gets fresh linkedLead/linkedCompany/linkedPerson
      const [row] = await db
        .select({
          email: emails,
          lead: {
            id: leads.id,
            title: leads.title,
            contactFirstName: leads.contactFirstName,
            contactLastName: leads.contactLastName,
            contactCompany: leads.contactCompany,
            contactEmail: leads.contactEmail,
            status: leads.status,
          },
          company: {
            id: companies.id,
            name: companies.name,
            city: companies.city,
            email: companies.email,
          },
          person: {
            id: persons.id,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: persons.email,
            jobTitle: persons.jobTitle,
          },
        })
        .from(emails)
        .leftJoin(leads, eq(emails.leadId, leads.id))
        .leftJoin(companies, eq(emails.companyId, companies.id))
        .leftJoin(persons, eq(emails.personId, persons.id))
        .where(eq(emails.id, id))

      const result = row
        ? {
            ...row.email,
            linkedLead: row.lead?.id ? row.lead : null,
            linkedCompany: row.company?.id ? row.company : null,
            linkedPerson: row.person?.id ? row.person : null,
          }
        : updated

      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to update email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to update email', 500)
    }
  })
}

// DELETE /api/v1/emails/[id] - Delete email
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params

    try {
      const [deleted] = await db
        .delete(emails)
        .where(eq(emails.id, id))
        .returning()

      if (!deleted) {
        return apiNotFound('Email not found')
      }

      return apiSuccess({ message: 'Email deleted successfully' })
    } catch (error) {
      logger.error('Failed to delete email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to delete email', 500)
    }
  })
}

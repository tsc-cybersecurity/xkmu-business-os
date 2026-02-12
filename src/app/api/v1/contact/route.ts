import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError } from '@/lib/utils/api-response'
import { contactFormSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.status, 'active'))
      .limit(1)

    if (!tenant) {
      return apiError('CONFIGURATION_ERROR', 'Kein aktiver Mandant gefunden', 500)
    }

    const tenantId = tenant.id

    const body = await request.json()
    const validation = validateAndParse(contactFormSchema, body)

    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { firstName, lastName, company, phone, email, interests, message } = validation.data

    const lead = await LeadService.create(tenantId, {
      source: 'website',
      sourceDetail: 'Kontaktformular',
      title: `${firstName} ${lastName} - ${company || 'Privat'}`,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactCompany: company || undefined,
      contactPhone: phone || undefined,
      contactEmail: email,
      tags: interests,
      notes: message,
      status: 'new',
    })

    return apiSuccess({ id: lead.id }, undefined)
  } catch (error) {
    console.error('Contact form error:', error)
    return apiError('INTERNAL_ERROR', 'Ein Fehler ist aufgetreten', 500)
  }
}

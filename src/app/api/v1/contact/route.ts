import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError } from '@/lib/utils/api-response'
import { contactFormSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  // Step 1: Find tenant
  let tenantId: string
  try {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.status, 'active'))
      .limit(1)

    if (!tenant) {
      return apiError('CONFIGURATION_ERROR', 'Kein aktiver Mandant gefunden', 500)
    }
    tenantId = tenant.id
  } catch (error) {
    console.error('Contact form - tenant lookup failed:', error)
    const msg = error instanceof Error ? error.message : 'Unknown'
    return apiError('DATABASE_ERROR', `Datenbankfehler beim Mandanten-Lookup: ${msg}`, 500)
  }

  // Step 2: Validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('INVALID_JSON', 'Ungültiges JSON im Request-Body', 400)
  }

  const validation = validateAndParse(contactFormSchema, body)
  if (!validation.success) {
    return apiValidationError(formatZodErrors(validation.errors))
  }

  // Step 3: Create lead
  try {
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
    console.error('Contact form - lead creation failed:', error)
    const msg = error instanceof Error ? error.message : 'Unknown'
    return apiError('LEAD_CREATE_ERROR', `Lead konnte nicht erstellt werden: ${msg}`, 500)
  }
}

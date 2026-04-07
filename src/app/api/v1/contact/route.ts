import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError } from '@/lib/utils/api-response'
import { contactFormSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { WorkflowEngine } from '@/lib/services/workflow'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  // Step 1: Find the real tenant (not "Default Organisation")
  let tenantId: string
  try {
    const allTenants = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.status, 'active'))

    const real = allTenants.find((t) => t.name !== 'Default Organisation') || allTenants[0]
    if (!real) {
      return apiError('CONFIGURATION_ERROR', 'Kein aktiver Mandant gefunden', 500)
    }
    tenantId = real.id
  } catch (error) {
    logger.error('Contact form - tenant lookup failed', error, { module: 'ContactAPI' })
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
      title: `${firstName} ${lastName} – ${company || 'Privat'}`,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactCompany: company || undefined,
      contactPhone: phone || undefined,
      contactEmail: email,
      tags: interests,
      notes: message,
      status: 'new',
    })

    // Step 4: Fire workflow trigger (async, non-blocking)
    WorkflowEngine.fire('contact.submitted', tenantId, {
      leadId: lead.id,
      firstName,
      lastName,
      email,
      company: company || null,
      phone: phone || null,
      interests,
      message,
    }).catch((err) => {
      logger.error('Workflow trigger error', err, { module: 'ContactAPI', leadId: lead.id })
    })

    return apiSuccess({ id: lead.id }, undefined)
  } catch (error) {
    logger.error('Contact form - lead creation failed', error, { module: 'ContactAPI' })
    const msg = error instanceof Error ? error.message : 'Unknown'
    return apiError('LEAD_CREATE_ERROR', `Lead konnte nicht erstellt werden: ${msg}`, 500)
  }
}

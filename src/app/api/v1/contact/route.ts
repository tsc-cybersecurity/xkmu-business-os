import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError } from '@/lib/utils/api-response'
import { contactFormSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'
import { WorkflowEngine } from '@/lib/services/workflow'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  // Validate input
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

  // ── Anti-Spam: Honeypot ──────────────────────────────────────────────
  // "website" is a hidden field that only bots fill. Silent-drop if set.
  if (validation.data.website && validation.data.website.trim()) {
    logger.warn('Honeypot triggered — dropping contact submission silently', { module: 'ContactAPI' })
    return apiSuccess({ id: 'ok' }, undefined)
  }

  // ── Anti-Spam: Min-Submit-Zeit ───────────────────────────────────────
  // Humans need >= 2s to fill the form. Bots submit instantly.
  if (validation.data._t) {
    const elapsedMs = Date.now() - validation.data._t
    if (elapsedMs < 2000) {
      logger.warn(`Form submitted too fast (${elapsedMs}ms) — dropping silently`, { module: 'ContactAPI' })
      return apiSuccess({ id: 'ok' }, undefined)
    }
    // 24h safety cap: stale form tokens (cached pages scraped by bots)
    if (elapsedMs > 24 * 60 * 60 * 1000) {
      return apiError('FORM_EXPIRED', 'Formular ist abgelaufen. Bitte Seite neu laden.', 400)
    }
  }

  // Step 3: Create lead
  try {
    const { firstName, lastName, company, phone, email, interests, message } = validation.data

    const lead = await LeadService.create({
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
    WorkflowEngine.fire('contact.submitted', {
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

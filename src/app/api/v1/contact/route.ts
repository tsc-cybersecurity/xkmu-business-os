import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError } from '@/lib/utils/api-response'
import { contactFormSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { LeadService } from '@/lib/services/lead.service'

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID

export async function POST(request: NextRequest) {
  try {
    if (!DEFAULT_TENANT_ID) {
      return apiError('CONFIGURATION_ERROR', 'Server-Konfiguration fehlt', 500)
    }

    const body = await request.json()
    const validation = validateAndParse(contactFormSchema, body)

    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { firstName, lastName, company, phone, email, interests, message } = validation.data

    const lead = await LeadService.create(DEFAULT_TENANT_ID, {
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

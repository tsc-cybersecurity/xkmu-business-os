import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { LeadService } from '@/lib/services/lead.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

// POST /api/v1/leads/inbound - Inbound lead from form/email/webhook
export async function POST(request: NextRequest) {
  return withPermission(request, 'leads', 'create', async (auth) => {
    try {
      const body = await request.json()
      const { email, firstName, lastName, company, phone, message, source } = body as {
        email?: string
        firstName?: string
        lastName?: string
        company?: string
        phone?: string
        message?: string
        source?: string
      }

      if (!email && !firstName && !company) {
        return apiError('MISSING_DATA', 'Mindestens Email, Name oder Firma noetig', 400)
      }

      const lead = await LeadService.create(TENANT_ID, {
        source: source || 'inbound',
        sourceDetail: 'Inbound API',
        contactEmail: email || undefined,
        contactFirstName: firstName || undefined,
        contactLastName: lastName || undefined,
        contactCompany: company || undefined,
        contactPhone: phone || undefined,
        notes: message || undefined,
        status: 'new',
        score: 0,
        tags: ['inbound'],
      })

      logger.info(`Inbound lead created: ${lead.id} from ${email || company}`, { module: 'InboundLeadAPI' })

      return apiSuccess(lead, undefined, 201)
    } catch (error) {
      logger.error('Inbound lead error', error, { module: 'InboundLeadAPI' })
      return apiServerError()
    }
  })
}

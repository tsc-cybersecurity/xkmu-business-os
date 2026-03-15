import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { LeadService } from '@/lib/services/lead.service'
import { OutreachService } from '@/lib/services/ai/outreach.service'
import { ActivityService } from '@/lib/services/activity.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { logger } from '@/lib/utils/logger'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const { id } = await params
    const lead = await LeadService.getById(auth.tenantId, id)
    if (!lead) return apiNotFound('Lead nicht gefunden')

    if (!lead.aiResearchResult) {
      return apiError('NO_RESEARCH', 'Bitte fuehren Sie zuerst eine KI-Recherche fuer diesen Lead durch', 400)
    }

    const outreach = await OutreachService.generateOutreach(auth.tenantId, id, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'outreach',
      entityType: 'lead',
      entityId: id,
    })

    // Activity erstellen
    await ActivityService.create(auth.tenantId, {
      leadId: id,
      companyId: lead.companyId || undefined,
      personId: lead.personId || undefined,
      type: 'ai_outreach',
      subject: outreach.subject,
      content: outreach.body,
      metadata: { tone: outreach.tone, generatedAt: new Date().toISOString() },
    }, auth.userId)

    return apiSuccess(outreach)
  } catch (error) {
    logger.error('Error generating outreach', error, { module: 'LeadsOutreachAPI' })
    return apiServerError()
  }
}

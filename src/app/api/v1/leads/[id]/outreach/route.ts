import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { LeadService } from '@/lib/services/lead.service'
import { OutreachService } from '@/lib/services/ai/outreach.service'
import { ActivityService } from '@/lib/services/activity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'leads', 'update', async (auth) => {

  try {
    const { id } = await params
    const lead = await LeadService.getById(TENANT_ID, id)
    if (!lead) return apiNotFound('Lead nicht gefunden')

    if (!lead.aiResearchResult) {
      return apiError('NO_RESEARCH', 'Bitte fuehren Sie zuerst eine KI-Recherche für diesen Lead durch', 400)
    }

    const outreach = await OutreachService.generateOutreach(TENANT_ID, id, {
      tenantId: TENANT_ID,
      userId: auth.userId,
      feature: 'outreach',
      entityType: 'lead',
      entityId: id,
    })

    // Activity erstellen
    await ActivityService.create(TENANT_ID, {
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
  })
}

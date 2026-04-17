import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CompanyService } from '@/lib/services/company.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { activities, leads, opportunities } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
type Params = Promise<{ id: string }>

// GET /api/v1/companies/[id]/prep - KI-Gespraechsvorbereitung
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'companies', 'read', async (auth) => {
    try {
      const { id } = await params
      const company = await CompanyService.getById(id)
      if (!company) return apiNotFound('Firma nicht gefunden')

      // Letzte Aktivitaeten
      const recentActivities = await db
        .select()
        .from(activities)
        .where(and(eq(activities.companyId, id)))
        .orderBy(desc(activities.createdAt))
        .limit(5)

      // Offene Leads
      const openLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.companyId, id)))
        .orderBy(desc(leads.createdAt))
        .limit(5)

      // Offene Chancen (opportunities hat kein companyId — nur tenantId-Filter)
      const openOpps = await db
        .select()
        .from(opportunities)
        .orderBy(desc(opportunities.createdAt))
        .limit(5)

      const context = [
        `Firma: ${company.name}`,
        company.industry ? `Branche: ${company.industry}` : '',
        company.website ? `Website: ${company.website}` : '',
        company.notes ? `Notizen: ${company.notes}` : '',
        '',
        recentActivities.length > 0
          ? `Letzte Aktivitaeten:\n${recentActivities.map(a => `- ${a.type}: ${a.subject || ''} (${new Date(a.createdAt!).toLocaleDateString('de-DE')})`).join('\n')}`
          : 'Keine bisherigen Aktivitaeten',
        '',
        openLeads.length > 0
          ? `Offene Leads:\n${openLeads.map(l => `- ${l.title || 'Lead'}: Status ${l.status}, Score ${l.score}`).join('\n')}`
          : 'Keine offenen Leads',
        '',
        openOpps.length > 0
          ? `Offene Chancen:\n${openOpps.map(o => `- ${o.name}: Status ${o.status}${o.rating ? ', Bewertung ' + o.rating : ''}`).join('\n')}`
          : 'Keine offenen Chancen',
      ].filter(Boolean).join('\n')

      const template = await AiPromptTemplateService.getOrDefault('meeting_prep')
      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, { context })

      const response = await AIService.completeWithContext(userPrompt,
        { feature: 'meeting_prep' },
        { maxTokens: 1500, temperature: 0.3, systemPrompt: template.systemPrompt })

      return apiSuccess({
        company: { id: company.id, name: company.name, industry: company.industry },
        preparation: response.text,
        recentActivities: recentActivities.length,
        openLeads: openLeads.length,
        openOpportunities: openOpps.length,
      })
    } catch {
      return apiServerError()
    }
  })
}

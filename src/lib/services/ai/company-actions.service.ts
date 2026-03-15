import { CompanyService } from '@/lib/services/company.service'
import { PersonService } from '@/lib/services/person.service'
import { ActivityService } from '@/lib/services/activity.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { applyPlaceholders } from '@/lib/services/ai-prompt-template.renderer'
import { AIService } from '@/lib/services/ai'
import { logger } from '@/lib/utils/logger'

// Define the 20 action definitions with categories, icons, colors, activityType
export const COMPANY_ACTIONS = [
  // Kommunikation (blue)
  { slug: 'company_first_contact', name: 'Erstansprache', category: 'communication', color: 'blue', activityType: 'email', icon: 'Mail' },
  { slug: 'company_follow_up', name: 'Follow-Up', category: 'communication', color: 'blue', activityType: 'email', icon: 'MailReply' },
  { slug: 'company_appointment', name: 'Terminvereinbarung', category: 'communication', color: 'blue', activityType: 'email', icon: 'CalendarPlus' },
  { slug: 'company_thank_you', name: 'Dankesschreiben', category: 'communication', color: 'blue', activityType: 'email', icon: 'Heart' },
  // Vertrieb (green)
  { slug: 'company_offer_letter', name: 'Angebots-Brief', category: 'sales', color: 'green', activityType: 'email', icon: 'FileText' },
  { slug: 'company_cross_selling', name: 'Cross-Selling', category: 'sales', color: 'green', activityType: 'note', icon: 'ArrowRightLeft' },
  { slug: 'company_upselling', name: 'Upselling', category: 'sales', color: 'green', activityType: 'note', icon: 'TrendingUp' },
  { slug: 'company_reactivation', name: 'Reaktivierung', category: 'sales', color: 'green', activityType: 'email', icon: 'RotateCcw' },
  // Analyse (purple)
  { slug: 'company_swot', name: 'SWOT-Analyse', category: 'analysis', color: 'purple', activityType: 'note', icon: 'BarChart3' },
  { slug: 'company_competitor_analysis', name: 'Wettbewerb', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Users' },
  { slug: 'company_needs_analysis', name: 'Bedarfsanalyse', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Target' },
  { slug: 'company_development_plan', name: 'Entwicklungsplan', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Map' },
  // Marketing (amber)
  { slug: 'company_social_post', name: 'Social Post', category: 'marketing', color: 'amber', activityType: 'note', icon: 'Share2' },
  { slug: 'company_reference_request', name: 'Referenz-Anfrage', category: 'marketing', color: 'amber', activityType: 'email', icon: 'Award' },
  { slug: 'company_newsletter', name: 'Newsletter', category: 'marketing', color: 'amber', activityType: 'note', icon: 'Newspaper' },
  { slug: 'company_event_invite', name: 'Event-Einladung', category: 'marketing', color: 'amber', activityType: 'email', icon: 'Ticket' },
  // Intern (gray)
  { slug: 'company_meeting_summary', name: 'Meeting-Protokoll', category: 'internal', color: 'gray', activityType: 'meeting', icon: 'ClipboardList' },
  { slug: 'company_call_guide', name: 'Gespraechsleitfaden', category: 'internal', color: 'gray', activityType: 'call', icon: 'PhoneOutgoing' },
  { slug: 'company_next_steps', name: 'Naechste Schritte', category: 'internal', color: 'gray', activityType: 'note', icon: 'ListChecks' },
  { slug: 'company_risk_assessment', name: 'Risikobewertung', category: 'internal', color: 'gray', activityType: 'note', icon: 'ShieldAlert' },
] as const

export type CompanyActionSlug = (typeof COMPANY_ACTIONS)[number]['slug']

export type CompanyActionDef = (typeof COMPANY_ACTIONS)[number]

export const CompanyActionsService = {
  async generate(tenantId: string, companyId: string, actionSlug: string, userId?: string | null) {
    // 1. Load company data
    const company = await CompanyService.getById(tenantId, companyId)
    if (!company) throw new Error('Firma nicht gefunden')

    // 2. Load persons via CompanyService.getPersons (returns Person[])
    const persons = await CompanyService.getPersons(tenantId, companyId)
    const primaryContact = persons.find(p => p.isPrimaryContact) || persons[0] || null

    // 3. Load recent activities (last 5)
    const recentActivitiesResult = await ActivityService.listByCompany(tenantId, companyId, { limit: 5 })
    const recentActivities = (recentActivitiesResult.items || [])
      .map(a => `${a.createdAt}: [${a.type}] ${a.subject || ''} - ${(a.content || '').substring(0, 100)}`)
      .join('\n') || 'Keine bisherigen Aktivitaeten'

    // 4. Load and apply prompt template
    const template = await AiPromptTemplateService.getOrDefault(tenantId, actionSlug)

    const placeholderData: Record<string, string> = {
      companyName: company.name || '',
      companyIndustry: company.industry || 'Nicht angegeben',
      companyCity: company.city || 'Nicht angegeben',
      companyStatus: company.status || 'prospect',
      contactPersonName: primaryContact ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim() : 'Nicht bekannt',
      contactPersonTitle: primaryContact?.jobTitle || 'Nicht angegeben',
      contactPersonEmail: primaryContact?.email || 'Nicht angegeben',
      recentActivities,
      companyNotes: company.notes || 'Keine Notizen',
    }

    const systemPrompt = applyPlaceholders(template.systemPrompt, placeholderData)
    const userPrompt = applyPlaceholders(template.userPrompt, placeholderData)

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    // 5. Call AI
    const response = await AIService.completeWithContext(fullPrompt, {
      tenantId,
      userId,
      feature: 'company_action',
      entityType: 'company',
      entityId: companyId,
    }, {
      systemPrompt,
      temperature: 0.6,
      maxTokens: 2000,
    })

    // 6. Parse JSON response (robust: handle markdown code blocks)
    try {
      let content = response.text.trim()

      // Remove markdown code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        content = codeBlockMatch[1].trim()
      }

      // Remove everything before first {
      const firstBrace = content.indexOf('{')
      if (firstBrace > 0) {
        content = content.slice(firstBrace)
      }

      // Remove everything after last }
      const lastBrace = content.lastIndexOf('}')
      if (lastBrace > 0) {
        content = content.slice(0, lastBrace + 1)
      }

      const parsed = JSON.parse(content)
      return {
        subject: parsed.subject || parsed.betreff || parsed.title || '',
        content: parsed.content || parsed.body || parsed.inhalt || '',
        actionSlug,
      }
    } catch (e) {
      logger.error('Failed to parse company action response', e, { module: 'CompanyActionsService' })
    }

    // Fallback: use raw text
    return {
      subject: '',
      content: response.text,
      actionSlug,
    }
  },
}

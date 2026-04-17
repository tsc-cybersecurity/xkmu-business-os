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
  { slug: 'company_call_guide', name: 'Gesprächsleitfaden', category: 'internal', color: 'gray', activityType: 'call', icon: 'PhoneOutgoing' },
  { slug: 'company_next_steps', name: 'Nächste Schritte', category: 'internal', color: 'gray', activityType: 'note', icon: 'ListChecks' },
  { slug: 'company_risk_assessment', name: 'Risikobewertung', category: 'internal', color: 'gray', activityType: 'note', icon: 'ShieldAlert' },
] as const

export type CompanyActionSlug = (typeof COMPANY_ACTIONS)[number]['slug']

export type CompanyActionDef = (typeof COMPANY_ACTIONS)[number]

/** Convert any AI response value into readable German text */
function stringifyAiContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''

  if (Array.isArray(value)) {
    return value.map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`
      if (typeof item === 'object' && item !== null) {
        return stringifyObject(item as Record<string, unknown>, i + 1)
      }
      return String(item)
    }).join('\n\n')
  }

  if (typeof value === 'object') {
    return Object.entries(value).map(([key, val]) => {
      if (Array.isArray(val)) return `${formatKey(key)}:\n${stringifyAiContent(val)}`
      if (typeof val === 'object' && val !== null) return `${formatKey(key)}:\n${stringifyAiContent(val)}`
      return `${formatKey(key)}: ${val}`
    }).join('\n\n')
  }

  return String(value)
}

const KEY_LABELS: Record<string, string> = {
  priority: 'Prioritaet',
  description: 'Beschreibung',
  solution: 'Loesung',
  need: 'Bedarf',
  recommendation: 'Empfehlung',
  risk: 'Risiko',
  impact: 'Auswirkung',
  action: 'Massnahme',
  strength: 'Staerke',
  weakness: 'Schwaeche',
  opportunity: 'Chance',
  threat: 'Bedrohung',
  title: 'Titel',
  content: 'Inhalt',
  summary: 'Zusammenfassung',
  name: 'Name',
  status: 'Status',
  category: 'Kategorie',
  type: 'Typ',
  score: 'Bewertung',
}

function formatKey(key: string): string {
  return KEY_LABELS[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
}

function stringifyObject(obj: Record<string, unknown>, index?: number): string {
  const lines: string[] = []
  const prefix = index !== undefined ? `${index}. ` : ''

  // If object has a title/name/description, use it as header
  const header = obj.title || obj.name || obj.need || obj.action
  if (header && typeof header === 'string') {
    lines.push(`${prefix}${header}`)
  } else if (prefix) {
    lines.push(`${prefix}Punkt`)
  }

  for (const [key, val] of Object.entries(obj)) {
    if (['title', 'name'].includes(key) && key === 'title' && val === header) continue
    if (['name'].includes(key) && val === header) continue
    if (val === null || val === undefined || val === '') continue

    if (typeof val === 'string') {
      lines.push(`   ${formatKey(key)}: ${val}`)
    } else if (Array.isArray(val)) {
      lines.push(`   ${formatKey(key)}:`)
      val.forEach((v) => lines.push(`   - ${typeof v === 'string' ? v : JSON.stringify(v)}`))
    } else {
      lines.push(`   ${formatKey(key)}: ${String(val)}`)
    }
  }

  return lines.join('\n')
}

/** Generate a 4-5 line German summary of activity content */
async function generateSummary(tenantId: string, content: string, userId?: string | null): Promise<string> {
  try {
    const response = await AIService.completeWithContext(
      `Fasse den folgenden Text in exakt 4-5 Saetzen zusammen. Schreibe praegnant und sachlich im Business-Stil. Antworte NUR mit der Zusammenfassung, ohne Einleitung oder Formatierung.\n\nText:\n${content}`,
      { userId, feature: 'activity_summary' },
      { temperature: 0.3, maxTokens: 300 }
    )
    return response.text.trim()
  } catch (e) {
    logger.error('Failed to generate activity summary', e, { module: 'CompanyActionsService' })
    return ''
  }
}

export const CompanyActionsService = {
  async generate(tenantId: string, companyId: string, actionSlug: string, userId?: string | null) {
    // 1. Load company data
    const company = await CompanyService.getById(companyId)
    if (!company) throw new Error('Firma nicht gefunden')

    // 2. Load persons via CompanyService.getPersons (returns Person[])
    const persons = await CompanyService.getPersons(companyId)
    const primaryContact = persons.find(p => p.isPrimaryContact) || persons[0] || null

    // 3. Load recent activities (last 5)
    const recentActivitiesResult = await ActivityService.listByCompany(companyId, { limit: 5 })
    const recentActivities = (recentActivitiesResult.items || [])
      .map(a => `${a.createdAt}: [${a.type}] ${a.subject || ''} - ${(a.content || '').substring(0, 100)}`)
      .join('\n') || 'Keine bisherigen Aktivitäten'

    // 4. Load and apply prompt template
    const template = await AiPromptTemplateService.getOrDefault(actionSlug)

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
      const rawSubject = parsed.subject || parsed.betreff || parsed.title || ''
      const rawContent = parsed.content || parsed.body || parsed.inhalt || parsed

      // Ensure content is always a readable string (AI may return nested objects/arrays)
      const textContent = stringifyAiContent(rawContent)

      const subject = typeof rawSubject === 'string' ? rawSubject : String(rawSubject)

      // Generate 4-5 line summary for preview
      const summary = textContent.length > 300
        ? await generateSummary(textContent, userId)
        : ''

      return { subject, content: textContent, summary, actionSlug }
    } catch (e) {
      logger.error('Failed to parse company action response', e, { module: 'CompanyActionsService' })
    }

    // Fallback: use raw text
    const fallbackSummary = response.text.length > 300
      ? await generateSummary(response.text, userId)
      : ''
    return { subject: '', content: response.text, summary: fallbackSummary, actionSlug }
  },

  /**
   * Generate summaries for activities that don't have one yet.
   * Called on company update to progressively enrich data.
   */
  async enrichMissingSummaries(tenantId: string, companyId: string, userId?: string | null): Promise<number> {
    try {
      const result = await ActivityService.listByCompany(companyId, { limit: 20 })
      const activities = result.items || []
      let enriched = 0

      for (const activity of activities) {
        const meta = (activity.metadata || {}) as Record<string, unknown>
        if (meta.summary) continue // already has summary
        if (!activity.content || activity.content.length < 300) continue // too short

        const summary = await generateSummary(activity.content, userId)
        if (!summary) continue

        // Update activity metadata with summary
        await ActivityService.update(activity.id, {
          metadata: { ...meta, summary },
        })
        enriched++
      }

      return enriched
    } catch (e) {
      logger.error('Failed to enrich activity summaries', e, { module: 'CompanyActionsService' })
      return 0
    }
  },
}

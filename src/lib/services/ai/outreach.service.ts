import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { LeadService } from '@/lib/services/lead.service'
import { CompanyService } from '@/lib/services/company.service'
import { PersonService } from '@/lib/services/person.service'

export interface OutreachResult {
  subject: string
  body: string
  tone: string
}

export const OutreachService = {
  /**
   * Generiert eine personalisierte Erstkontakt-E-Mail basierend auf Lead-Research-Daten
   */
  async generateOutreach(
    tenantId: string,
    leadId: string,
    context: AIRequestContext
  ): Promise<OutreachResult> {
    // 1. Lead laden
    const lead = await LeadService.getById(tenantId, leadId)
    if (!lead) throw new Error('Lead nicht gefunden')

    // 2. Verknüpfte Daten laden
    let companyName = ''
    let personName = ''
    let researchSummary = ''
    let strengths = ''
    const score = lead.score?.toString() || '0'

    if (lead.companyId) {
      const company = await CompanyService.getById(tenantId, lead.companyId)
      if (company) companyName = company.name
    }

    if (lead.personId) {
      const person = await PersonService.getById(tenantId, lead.personId)
      if (person) personName = `${person.firstName} ${person.lastName}`
    }

    // 3. Research-Ergebnis extrahieren
    const research = lead.aiResearchResult as Record<string, unknown> | null
    if (research) {
      const company = research.company as Record<string, unknown> | undefined
      if (company) {
        researchSummary = (company.description as string) || ''
        const strs = company.strengths as string[] | undefined
        if (Array.isArray(strs)) strengths = strs.join(', ')
      }
    }

    // 4. Template laden
    const template = await AiPromptTemplateService.getOrDefault(tenantId, 'outreach_email')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      companyName,
      personName,
      score,
      strengths,
      researchSummary,
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    // 5. KI aufrufen
    const response = await AIService.completeWithContext(fullPrompt, {
      ...context,
      feature: 'outreach',
      entityType: 'lead',
      entityId: leadId,
    }, {
      maxTokens: 2000,
      temperature: 0.6,
      systemPrompt: template.systemPrompt,
    })

    // 6. JSON parsen
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          subject: parsed.subject || parsed.betreff || 'Geschäftliche Anfrage',
          body: parsed.body || parsed.text || parsed.inhalt || response.text,
          tone: parsed.tone || parsed.tonalitaet || 'professionell',
        }
      }
    } catch {
      // Falls kein JSON, nutze den gesamten Text als Body
    }

    return {
      subject: `Kontaktaufnahme${companyName ? ` – ${companyName}` : ''}`,
      body: response.text,
      tone: 'professionell',
    }
  },
}

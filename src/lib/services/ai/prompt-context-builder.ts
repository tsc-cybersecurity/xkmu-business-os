// ============================================
// Prompt Context Builder
// ============================================
// For custom AI prompts: fetches entities declared in contextConfig
// and returns both flat placeholders (for {{key}} replacement) and
// multi-line context blocks (for prepending to the prompt).
//
// Scope: company-bound execution (v1). Extensible for other entity types.

import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { ActivityService } from '@/lib/services/activity.service'
import { CompanyResearchService } from '@/lib/services/company-research.service'
import { ProductService } from '@/lib/services/product.service'
import { ProcessService } from '@/lib/services/process.service'

export interface PromptContextConfig {
  includeOrganization?: boolean
  includeCompany?: boolean
  includePersons?: boolean
  includeRecentActivities?: boolean
  includeResearch?: boolean
  includeProducts?: boolean
  includeProcesses?: boolean
}

export interface BuiltPromptContext {
  /** Flat key-value map for {{placeholder}} replacement */
  placeholders: Record<string, string>
  /** Pre-formatted context sections to prepend to the prompt */
  contextBlocks: string
}

export interface BuildContextInput {
  companyId?: string | null
  config: PromptContextConfig
}

export const PromptContextBuilder = {
  async build(input: BuildContextInput): Promise<BuiltPromptContext> {
    const { companyId, config } = input
    const placeholders: Record<string, string> = {}
    const blocks: string[] = []

    if (config.includeOrganization) {
      const org = await OrganizationService.getById()
      if (org) {
        placeholders.organizationName = org.name || ''
        placeholders.organizationCity = org.city || ''
        placeholders.organizationCountry = org.country || ''
        placeholders.organizationLegalForm = org.legalForm || ''
        blocks.push(
          [
            '=== EIGENE ORGANISATION ===',
            `Name: ${org.name || 'Nicht angegeben'}`,
            org.legalForm ? `Rechtsform: ${org.legalForm}` : null,
            org.city ? `Standort: ${org.city}${org.country && org.country !== 'DE' ? ', ' + org.country : ''}` : null,
            org.managingDirector ? `Geschäftsführer: ${org.managingDirector}` : null,
          ].filter(Boolean).join('\n')
        )
      }
    }

    if (companyId && (config.includeCompany || config.includePersons || config.includeRecentActivities || config.includeResearch)) {
      const company = await CompanyService.getById(companyId)
      if (company) {
        if (config.includeCompany) {
          placeholders.companyName = company.name || ''
          placeholders.companyIndustry = company.industry || ''
          placeholders.companyCity = company.city || ''
          placeholders.companyStatus = company.status || ''
          placeholders.companyWebsite = company.website || ''
          placeholders.companyNotes = company.notes || ''
          placeholders.companyEmployeeCount = company.employeeCount != null ? String(company.employeeCount) : ''
          blocks.push(
            [
              '=== FIRMA ===',
              `Name: ${company.name}`,
              company.legalForm ? `Rechtsform: ${company.legalForm}` : null,
              company.industry ? `Branche: ${company.industry}` : null,
              company.employeeCount != null ? `Mitarbeiter: ${company.employeeCount}` : null,
              company.city ? `Standort: ${company.city}` : null,
              company.website ? `Website: ${company.website}` : null,
              company.status ? `Status: ${company.status}` : null,
              company.notes ? `Notizen: ${company.notes}` : null,
            ].filter(Boolean).join('\n')
          )
        }

        if (config.includePersons) {
          const persons = await CompanyService.getPersons(companyId)
          const primary = persons.find(p => p.isPrimaryContact) || persons[0] || null
          placeholders.primaryContactName = primary ? `${primary.firstName || ''} ${primary.lastName || ''}`.trim() : ''
          placeholders.primaryContactTitle = primary?.jobTitle || ''
          placeholders.primaryContactEmail = primary?.email || ''
          if (persons.length > 0) {
            const lines = persons.slice(0, 10).map(p => {
              const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unbekannt'
              const role = p.jobTitle ? ` (${p.jobTitle})` : ''
              const email = p.email ? ` — ${p.email}` : ''
              return `• ${name}${role}${email}`
            })
            blocks.push(['=== ANSPRECHPARTNER ===', ...lines].join('\n'))
          }
        }

        if (config.includeRecentActivities) {
          const result = await ActivityService.listByCompany(companyId, { limit: 5 })
          const items = result.items || []
          if (items.length > 0) {
            const lines = items.map(a => {
              const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString('de-DE') : ''
              const subject = a.subject || ''
              const content = (a.content || '').substring(0, 120).replace(/\n/g, ' ')
              return `• [${date}] ${a.type}${subject ? ': ' + subject : ''} — ${content}`
            })
            blocks.push(['=== LETZTE AKTIVITÄTEN ===', ...lines].join('\n'))
            placeholders.recentActivities = lines.join('\n')
          } else {
            placeholders.recentActivities = 'Keine bisherigen Aktivitäten'
          }
        }

        if (config.includeResearch) {
          const researches = await CompanyResearchService.listByCompany(companyId)
          const latest = researches[0]
          if (latest) {
            const data = (latest.researchData || {}) as Record<string, unknown>
            const profile = typeof data.companyProfile === 'string' ? data.companyProfile : (typeof data.summary === 'string' ? data.summary : '')
            if (profile) {
              blocks.push(['=== KI-RECHERCHE (neueste) ===', profile].join('\n'))
              placeholders.latestResearch = profile
            }
          }
        }
      }
    }

    if (config.includeProducts) {
      try {
        const result = await ProductService.list({ limit: 20 })
        const items = result.items || []
        if (items.length > 0) {
          const lines = items.map(p => {
            const price = p.priceNet ? ` — ${p.priceNet} EUR${p.unit ? ' / ' + p.unit : ''}` : ''
            const desc = p.description ? `: ${p.description.substring(0, 100)}` : ''
            return `• ${p.name}${price}${desc}`
          })
          blocks.push(['=== PRODUKTE / LEISTUNGEN ===', ...lines].join('\n'))
          placeholders.productList = lines.join('\n')
        }
      } catch {
        // ignore; products optional
      }
    }

    if (config.includeProcesses) {
      try {
        const items = await ProcessService.list()
        if (items.length > 0) {
          const lines = items.slice(0, 20).map(p => {
            const desc = p.description ? `: ${p.description.substring(0, 100)}` : ''
            return `• ${p.name}${desc}`
          })
          blocks.push(['=== PROZESSE ===', ...lines].join('\n'))
          placeholders.processList = lines.join('\n')
        }
      } catch {
        // ignore; processes optional
      }
    }

    return {
      placeholders,
      contextBlocks: blocks.join('\n\n'),
    }
  },
}

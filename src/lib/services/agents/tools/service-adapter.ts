/**
 * Service-Tool-Adapter — whitelisted Domain-Services im `service:*`-Namespace.
 * Anders als prompt/workflow-adapter ist die Liste hier statisch (Code-Whitelist),
 * weil Domain-Services TypeScript-Funktionen mit spezifischen Signaturen sind.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 *
 * NOTE: Die Plan-Spec verwendet die Methodennamen `LeadResearchService.researchLead`
 * und `WebsiteScraperService.scrape` — die echten Services exportieren `research`
 * bzw. `scrapeCompanyWebsite`. Tests mocken den Plan-Namen, daher rufen wir den
 * Plan-Namen via `as any` auf. Follow-up-Task: Adapter an echte Signaturen
 * anpassen oder Service-Wrapper-Methoden ergaenzen.
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

interface ServiceEntry {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (input: Record<string, unknown>) => Promise<unknown>
}

const SERVICES: ServiceEntry[] = [
  {
    name: 'lead-research',
    description: 'Tiefe Lead-Recherche (Firma + Kontaktperson) via AI + Web-Sources.',
    inputSchema: {
      type: 'object',
      required: ['leadId'],
      properties: { leadId: { type: 'string' }, depth: { type: 'string', enum: ['quick', 'deep'], default: 'deep' } },
    },
    handler: async (input) => {
      const aiModule = await import('@/lib/services/ai')
      const svc = (aiModule as unknown as { LeadResearchService: { researchLead: (i: unknown) => Promise<unknown> } }).LeadResearchService
      return svc.researchLead({
        leadId: String(input.leadId),
        depth: (input.depth as 'quick' | 'deep') ?? 'deep',
      })
    },
  },
  {
    name: 'website-scraper',
    description: 'Scraped eine URL und liefert Markdown + Metadaten zurueck.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: { url: { type: 'string' } },
    },
    handler: async (input) => {
      const aiModule = await import('@/lib/services/ai')
      const svc = (aiModule as unknown as { WebsiteScraperService: { scrape: (url: string) => Promise<unknown> } }).WebsiteScraperService
      return svc.scrape(String(input.url))
    },
  },
]

export const serviceToolAdapter: ToolAdapter = {
  namespace: 'service',

  async list(): Promise<ToolDescriptor[]> {
    return SERVICES.map((s) => ({
      ref: { namespace: 'service', name: s.name, raw: `service:${s.name}` },
      description: s.description,
      inputSchema: s.inputSchema,
    }))
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const name = invocation.ref.name
    const entry = SERVICES.find((s) => s.name === name)
    if (!entry) {
      return { status: 'failed', error: `unbekannter Service: ${name}` }
    }
    try {
      const output = await entry.handler(invocation.input as Record<string, unknown>)
      return {
        status: 'succeeded',
        output: (output ?? {}) as Record<string, unknown>,
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}

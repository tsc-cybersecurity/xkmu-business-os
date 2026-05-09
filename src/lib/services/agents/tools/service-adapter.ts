/**
 * Service-Tool-Adapter — whitelisted Domain-Services im `service:*`-Namespace.
 * Anders als prompt/workflow-adapter ist die Liste hier statisch (Code-Whitelist),
 * weil Domain-Services TypeScript-Funktionen mit spezifischen Signaturen sind.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
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
    description: 'Tiefe Lead-Recherche (Firma + Kontaktperson) via AI + Web-Sources. Mind. einer von companyName/personName/email muss gesetzt sein.',
    inputSchema: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        personName: { type: 'string' },
        email: { type: 'string' },
        website: { type: 'string' },
        depth: { type: 'string', enum: ['quick', 'deep'], default: 'deep' },
      },
    },
    handler: async (input) => {
      const { LeadResearchService } = await import('@/lib/services/ai')
      // Cast: LeadResearchInput hat optionale Felder, das Tool reicht den Input
      // 1:1 weiter — Validierung passiert in research() selbst.
      const r = await LeadResearchService.research(input as Parameters<typeof LeadResearchService.research>[0])
      return r as unknown as Record<string, unknown>
    },
  },
  {
    name: 'website-scraper',
    description: 'Scraped eine Firmen-Website (Hauptseite + Sub-Pages) und liefert kombinierten Text fuer AI-Analyse.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string' },
        firecrawlApiKey: { type: 'string', description: 'Optional: API-Key fuer Firecrawl-basiertes Scraping' },
      },
    },
    handler: async (input) => {
      const { WebsiteScraperService } = await import('@/lib/services/ai')
      const url = String(input.url ?? '')
      const firecrawlApiKey = typeof input.firecrawlApiKey === 'string' ? input.firecrawlApiKey : undefined
      return WebsiteScraperService.scrapeCompanyWebsite(url, firecrawlApiKey)
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
